// Runs npm scripts one after another, and fails at the end if any of them failed.
// Every check runs without the three Supabase settings, so no test touches Supabase,
// whatever the shell or .env holds (spec 10).

import { spawnSync } from "node:child_process";
import { withoutSettings } from "./env.mjs";

const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this script through npm.");

const env = withoutSettings();
const failed = [];
for (const task of process.argv.slice(2)) {
  const result = spawnSync(process.execPath, [npm, "run", task], { stdio: "inherit", env });
  if (result.status !== 0) {
    failed.push(task);
    if (result.error) console.error(result.error.message);
    if (result.signal) console.error(`${task} ended with ${result.signal}`);
  }
}

if (failed.length > 0) {
  console.error(`\nFailed npm scripts: ${failed.join(", ")}`);
  process.exitCode = 1;
}
