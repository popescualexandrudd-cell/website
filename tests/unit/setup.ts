import { config } from "dotenv";

config({ path: ".env", quiet: true });
process.env.TZ = "UTC";
