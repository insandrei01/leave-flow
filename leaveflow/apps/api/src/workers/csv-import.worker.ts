/**
 * CSV import worker — processes employee CSV uploads asynchronously.
 *
 * Job flow:
 * 1. Receive CsvImportJobData from the csv-import BullMQ queue
 * 2. Download file content from the storage key (Cloudflare R2 / S3)
 * 3. Parse CSV rows (max 5000)
 * 4. Validate each row (email format, role, team existence)
 * 5. Create employees via EmployeeService
 * 6. Report progress via BullMQ job.updateProgress()
 * 7. Write an error report if any rows fail
 *
 * The worker reports progress as a percentage (0–100).
 * The caller can poll job.progress() to show a live progress bar.
 */

import type { Job } from "bullmq";
import type { CsvImportJobData } from "../lib/bullmq.js";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const MAX_ROWS = 5000;
const BATCH_SIZE = 50;

// ----------------------------------------------------------------
// Dependency interfaces
// ----------------------------------------------------------------

export interface CsvImportRow {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  teamId?: string;
  startDate?: string;
}

export interface CsvImportEmployeeService {
  importFromCsv(
    tenantId: string,
    rows: CsvImportRow[]
  ): Promise<{
    created: Array<{ id: string; email: string }>;
    errors: Array<{ row: number; email?: string; reason: string }>;
  }>;
}

export interface FileStorage {
  getFileContent(key: string): Promise<string>;
}

export interface ImportReportRepository {
  saveReport(params: {
    tenantId: string;
    uploadedBy: string;
    fileKey: string;
    totalRows: number;
    createdCount: number;
    errorCount: number;
    errors: Array<{ row: number; email?: string; reason: string }>;
    completedAt: Date;
  }): Promise<{ reportId: string }>;
}

export interface CsvImportWorkerDeps {
  employeeService: CsvImportEmployeeService;
  fileStorage: FileStorage;
  reportRepo: ImportReportRepository;
}

// ----------------------------------------------------------------
// CSV parser (pure — no dependencies)
// ----------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(["company_admin", "hr_admin", "manager", "employee"]);

/**
 * Parses a CSV string into typed rows.
 * Expects a header row: email,firstName,lastName[,role][,teamId][,startDate]
 */
export function parseCsvContent(raw: string): CsvImportRow[] {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return [];
  }

  const headerLine = lines[0] ?? "";
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

  const emailIdx = headers.indexOf("email");
  const firstNameIdx = headers.indexOf("firstname");
  const lastNameIdx = headers.indexOf("lastname");

  if (emailIdx === -1 || firstNameIdx === -1 || lastNameIdx === -1) {
    throw new Error(
      "CSV must contain headers: email, firstName, lastName"
    );
  }

  const roleIdx = headers.indexOf("role");
  const teamIdIdx = headers.indexOf("teamid");
  const startDateIdx = headers.indexOf("startdate");

  const rows: CsvImportRow[] = [];
  const dataLines = lines.slice(1, MAX_ROWS + 1);

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    const email = cols[emailIdx]?.trim() ?? "";
    const firstName = cols[firstNameIdx]?.trim() ?? "";
    const lastName = cols[lastNameIdx]?.trim() ?? "";

    const row: CsvImportRow = { email, firstName, lastName };

    if (roleIdx !== -1 && cols[roleIdx]) {
      row.role = cols[roleIdx]?.trim();
    }
    if (teamIdIdx !== -1 && cols[teamIdIdx]) {
      row.teamId = cols[teamIdIdx]?.trim();
    }
    if (startDateIdx !== -1 && cols[startDateIdx]) {
      row.startDate = cols[startDateIdx]?.trim();
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Parses a single CSV line handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}

// ----------------------------------------------------------------
// Row validation (pure)
// ----------------------------------------------------------------

export interface RowValidationError {
  row: number;
  email?: string;
  reason: string;
}

export function validateRows(
  rows: CsvImportRow[]
): RowValidationError[] {
  const errors: RowValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row === undefined) continue;
    const rowNum = i + 2; // +2 because row 1 is header

    if (!row.email || !EMAIL_REGEX.test(row.email)) {
      errors.push({ row: rowNum, email: row.email, reason: `Row ${rowNum}: invalid or missing email` });
      continue;
    }
    if (!row.firstName || row.firstName.trim().length === 0) {
      errors.push({ row: rowNum, email: row.email, reason: `Row ${rowNum}: firstName is required` });
      continue;
    }
    if (!row.lastName || row.lastName.trim().length === 0) {
      errors.push({ row: rowNum, email: row.email, reason: `Row ${rowNum}: lastName is required` });
      continue;
    }
    if (row.role !== undefined && !VALID_ROLES.has(row.role)) {
      errors.push({ row: rowNum, email: row.email, reason: `Row ${rowNum}: invalid role "${row.role}"` });
    }
    if (row.startDate !== undefined && isNaN(Date.parse(row.startDate))) {
      errors.push({ row: rowNum, email: row.email, reason: `Row ${rowNum}: invalid startDate "${row.startDate}"` });
    }
  }

  return errors;
}

// ----------------------------------------------------------------
// Job processor
// ----------------------------------------------------------------

export interface CsvImportResult {
  reportId: string;
  totalRows: number;
  createdCount: number;
  errorCount: number;
}

/**
 * Main job processor — called by the BullMQ worker.
 */
export async function processCsvImportJob(
  job: Job<CsvImportJobData>,
  deps: CsvImportWorkerDeps
): Promise<CsvImportResult> {
  const { tenantId, uploadedBy, fileKey } = job.data;

  await job.updateProgress(5);

  // Step 1: Download the file
  let rawContent: string;
  try {
    rawContent = await deps.fileStorage.getFileContent(fileKey);
  } catch (err) {
    throw new Error(
      `Failed to download CSV file "${fileKey}": ${err instanceof Error ? err.message : String(err)}`
    );
  }

  await job.updateProgress(10);

  // Step 2: Parse CSV
  let rows: CsvImportRow[];
  try {
    rows = parseCsvContent(rawContent);
  } catch (err) {
    throw new Error(
      `CSV parsing failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (rows.length === 0) {
    await job.updateProgress(100);
    const report = await deps.reportRepo.saveReport({
      tenantId,
      uploadedBy,
      fileKey,
      totalRows: 0,
      createdCount: 0,
      errorCount: 0,
      errors: [],
      completedAt: new Date(),
    });
    return { reportId: report.reportId, totalRows: 0, createdCount: 0, errorCount: 0 };
  }

  if (rows.length > MAX_ROWS) {
    throw new Error(
      `CSV contains ${rows.length} rows. Maximum allowed is ${MAX_ROWS}.`
    );
  }

  await job.updateProgress(20);

  // Step 3: Pre-validation pass
  const validationErrors = validateRows(rows);
  const validRows = rows.filter((_, i) => {
    const rowNum = i + 2;
    return !validationErrors.some((e) => e.row === rowNum);
  });

  await job.updateProgress(30);

  // Step 4: Process in batches
  let createdCount = 0;
  const serviceErrors: Array<{ row: number; email?: string; reason: string }> = [];
  const progressPerBatch = 60 / Math.ceil(validRows.length / BATCH_SIZE);
  let progressBase = 30;

  for (let start = 0; start < validRows.length; start += BATCH_SIZE) {
    const batch = validRows.slice(start, start + BATCH_SIZE);
    const result = await deps.employeeService.importFromCsv(tenantId, batch);

    createdCount += result.created.length;

    for (const err of result.errors) {
      serviceErrors.push(err);
    }

    progressBase += progressPerBatch;
    await job.updateProgress(Math.min(90, Math.round(progressBase)));
  }

  const allErrors = [...validationErrors, ...serviceErrors];

  await job.updateProgress(95);

  // Step 5: Save report
  const report = await deps.reportRepo.saveReport({
    tenantId,
    uploadedBy,
    fileKey,
    totalRows: rows.length,
    createdCount,
    errorCount: allErrors.length,
    errors: allErrors,
    completedAt: new Date(),
  });

  await job.updateProgress(100);

  return {
    reportId: report.reportId,
    totalRows: rows.length,
    createdCount,
    errorCount: allErrors.length,
  };
}
