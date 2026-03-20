/**
 * Global Vitest setup — runs once before any test file.
 * Provides a minimal environment for unit tests that do not need
 * a real database or Firebase connection.
 */

// Provide stub environment variables so config.ts validation passes
// without a real .env file during tests.
process.env["NODE_ENV"] = "test";
process.env["API_PORT"] = "3001";
process.env["MONGODB_URI"] = "mongodb://localhost:27017/leaveflow_test";
process.env["REDIS_URL"] = "redis://localhost:6379";
process.env["FIREBASE_PROJECT_ID"] = "leaveflow-test";
process.env["FIREBASE_CLIENT_EMAIL"] = "test@leaveflow-test.iam.gserviceaccount.com";
process.env["FIREBASE_PRIVATE_KEY"] = "-----BEGIN RSA PRIVATE KEY-----\nMIItest\n-----END RSA PRIVATE KEY-----";
process.env["CORS_ALLOWED_ORIGINS"] = "http://localhost:3000";
// 64-character hex string (32 bytes) used for AES-256-GCM token encryption in tests
process.env["TOKEN_ENCRYPTION_KEY"] = "a".repeat(64);
