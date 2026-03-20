/**
 * Unit tests for the CSV import worker.
 *
 * Tests the pure functions (CSV parsing, row validation) and the
 * job processor with mocked dependencies.
 */

import { describe, it, expect, vi } from "vitest";
import {
  parseCsvContent,
  validateRows,
  processCsvImportJob,
} from "./csv-import.worker.js";
import type {
  CsvImportWorkerDeps,
  CsvImportEmployeeService,
  FileStorage,
  ImportReportRepository,
} from "./csv-import.worker.js";
import type { Job } from "bullmq";
import type { CsvImportJobData } from "../lib/bullmq.js";

// ----------------------------------------------------------------
// parseCsvContent
// ----------------------------------------------------------------

describe("parseCsvContent", () => {
  it("parses a minimal CSV with required columns", () => {
    const csv = [
      "email,firstName,lastName",
      "alice@example.com,Alice,Smith",
      "bob@example.com,Bob,Jones",
    ].join("\n");

    const rows = parseCsvContent(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.email).toBe("alice@example.com");
    expect(rows[0]?.firstName).toBe("Alice");
    expect(rows[0]?.lastName).toBe("Smith");
  });

  it("parses optional columns (role, teamId, startDate)", () => {
    const csv = [
      "email,firstName,lastName,role,teamId,startDate",
      "alice@example.com,Alice,Smith,hr_admin,team-1,2026-01-01",
    ].join("\n");

    const rows = parseCsvContent(csv);

    expect(rows[0]?.role).toBe("hr_admin");
    expect(rows[0]?.teamId).toBe("team-1");
    expect(rows[0]?.startDate).toBe("2026-01-01");
  });

  it("returns empty array for empty CSV", () => {
    const rows = parseCsvContent("");
    expect(rows).toHaveLength(0);
  });

  it("returns empty array for header-only CSV", () => {
    const rows = parseCsvContent("email,firstName,lastName");
    expect(rows).toHaveLength(0);
  });

  it("throws when required headers are missing", () => {
    const csv = "name,email\nalice,alice@example.com";
    expect(() => parseCsvContent(csv)).toThrow(/must contain headers/i);
  });

  it("handles quoted fields containing commas", () => {
    const csv = [
      "email,firstName,lastName",
      '"alice@example.com","Alice","Smith, Jr"',
    ].join("\n");

    const rows = parseCsvContent(csv);
    expect(rows[0]?.lastName).toBe("Smith, Jr");
  });

  it("is case-insensitive for header names", () => {
    const csv = [
      "Email,FirstName,LastName",
      "alice@example.com,Alice,Smith",
    ].join("\n");

    const rows = parseCsvContent(csv);
    expect(rows[0]?.email).toBe("alice@example.com");
  });
});

// ----------------------------------------------------------------
// validateRows
// ----------------------------------------------------------------

describe("validateRows", () => {
  it("returns empty errors for all valid rows", () => {
    const rows = [
      { email: "alice@example.com", firstName: "Alice", lastName: "Smith" },
      { email: "bob@example.com", firstName: "Bob", lastName: "Jones" },
    ];

    const errors = validateRows(rows);
    expect(errors).toHaveLength(0);
  });

  it("reports error for invalid email", () => {
    const rows = [
      { email: "not-an-email", firstName: "Alice", lastName: "Smith" },
    ];

    const errors = validateRows(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/invalid.*email/i);
  });

  it("reports error for missing firstName", () => {
    const rows = [{ email: "alice@example.com", firstName: "", lastName: "Smith" }];

    const errors = validateRows(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/firstName/i);
  });

  it("reports error for missing lastName", () => {
    const rows = [{ email: "alice@example.com", firstName: "Alice", lastName: "" }];

    const errors = validateRows(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/lastName/i);
  });

  it("reports error for invalid role", () => {
    const rows = [
      {
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Smith",
        role: "boss",
      },
    ];

    const errors = validateRows(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/invalid role/i);
  });

  it("reports error for invalid startDate", () => {
    const rows = [
      {
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Smith",
        startDate: "not-a-date",
      },
    ];

    const errors = validateRows(rows);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/startDate/i);
  });

  it("row numbers start at 2 (header is row 1)", () => {
    const rows = [
      { email: "bad", firstName: "Alice", lastName: "Smith" },
    ];

    const errors = validateRows(rows);
    expect(errors[0]?.row).toBe(2);
  });

  it("accepts all valid roles", () => {
    const validRoles = ["company_admin", "hr_admin", "manager", "employee"];
    for (const role of validRoles) {
      const rows = [
        { email: "alice@example.com", firstName: "Alice", lastName: "Smith", role },
      ];
      const errors = validateRows(rows);
      expect(errors).toHaveLength(0);
    }
  });
});

// ----------------------------------------------------------------
// processCsvImportJob
// ----------------------------------------------------------------

function buildMockJob(
  data: Partial<CsvImportJobData> = {}
): Job<CsvImportJobData> {
  return {
    data: {
      tenantId: "tenant-001",
      uploadedBy: "emp-001",
      fileKey: "uploads/test.csv",
      totalRows: 2,
      ...data,
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<CsvImportJobData>;
}

function buildMockDeps(
  overrides: Partial<CsvImportWorkerDeps> = {}
): CsvImportWorkerDeps {
  const mockService: CsvImportEmployeeService = {
    importFromCsv: vi.fn().mockResolvedValue({
      created: [{ id: "emp-new", email: "alice@example.com" }],
      errors: [],
    }),
  };

  const mockStorage: FileStorage = {
    getFileContent: vi.fn().mockResolvedValue(
      "email,firstName,lastName\nalice@example.com,Alice,Smith"
    ),
  };

  const mockReportRepo: ImportReportRepository = {
    saveReport: vi.fn().mockResolvedValue({ reportId: "report-001" }),
  };

  return {
    employeeService: mockService,
    fileStorage: mockStorage,
    reportRepo: mockReportRepo,
    ...overrides,
  };
}

describe("processCsvImportJob", () => {
  it("processes a valid CSV and returns a result", async () => {
    const job = buildMockJob();
    const deps = buildMockDeps();

    const result = await processCsvImportJob(job, deps);

    expect(result.reportId).toBe("report-001");
    expect(result.totalRows).toBe(1);
    expect(result.createdCount).toBe(1);
    expect(result.errorCount).toBe(0);
  });

  it("reports progress updates throughout processing", async () => {
    const job = buildMockJob();
    const deps = buildMockDeps();

    await processCsvImportJob(job, deps);

    expect(job.updateProgress).toHaveBeenCalledWith(5);
    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });

  it("throws when file download fails", async () => {
    const job = buildMockJob();
    const deps = buildMockDeps({
      fileStorage: {
        getFileContent: vi.fn().mockRejectedValue(new Error("S3 access denied")),
      },
    });

    await expect(processCsvImportJob(job, deps)).rejects.toThrow(/download/i);
  });

  it("throws when CSV parsing fails", async () => {
    const job = buildMockJob();
    const deps = buildMockDeps({
      fileStorage: {
        getFileContent: vi.fn().mockResolvedValue("name,other\nalice,whatever"),
      },
    });

    await expect(processCsvImportJob(job, deps)).rejects.toThrow(/parsing/i);
  });

  it("returns report with 0 rows for an empty CSV body", async () => {
    const job = buildMockJob();
    const deps = buildMockDeps({
      fileStorage: {
        getFileContent: vi
          .fn()
          .mockResolvedValue("email,firstName,lastName"),
      },
    });

    const result = await processCsvImportJob(job, deps);

    expect(result.totalRows).toBe(0);
    expect(result.createdCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  it("saves a report even when some rows have errors", async () => {
    const job = buildMockJob();
    const deps = buildMockDeps({
      fileStorage: {
        getFileContent: vi.fn().mockResolvedValue(
          [
            "email,firstName,lastName",
            "alice@example.com,Alice,Smith",
            "bad-email,Bob,Jones",
          ].join("\n")
        ),
      },
      employeeService: {
        importFromCsv: vi.fn().mockResolvedValue({
          created: [{ id: "emp-new", email: "alice@example.com" }],
          errors: [],
        }),
      },
    });

    const result = await processCsvImportJob(job, deps);

    // "bad-email" row fails validation (pre-validation errors)
    expect(result.totalRows).toBe(2);
    expect(result.errorCount).toBeGreaterThanOrEqual(1);
  });
});
