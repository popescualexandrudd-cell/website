import { config } from "dotenv";
import { testDatabaseUrl } from "../test-db";

config({ path: ".env", quiet: true });
process.env.DATABASE_URL = testDatabaseUrl();
process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-123456";
process.env.APP_URL ??= "http://localhost:3000";
