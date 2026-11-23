// `npm run seed`: resets a local database to the sample data. It passes the settings in
// .env to the seed command, which refuses when DATABASE_URL points at Supabase (spec 9.6).

import { spawnSync } from "node:child_process";
import { root, withEnvFile } from "./env.mjs";

const result = spawnSync("uv", ["run", "--quiet", "python", "-m", "backend.app.seed", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  env: withEnvFile(),
  shell: process.platform === "win32",
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
