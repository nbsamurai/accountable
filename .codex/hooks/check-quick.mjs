import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { stop_hook_active } = JSON.parse(readFileSync(0, "utf8"));
if (stop_hook_active) process.exit(0);

const result = spawnSync("npm", ["run", "check:quick"], {
  cwd: fileURLToPath(new URL("../../", import.meta.url)),
  encoding: "utf8",
  timeout: 110_000,
  killSignal: "SIGKILL",
});

if (result.status !== 0) {
  const output = [result.error?.message, result.stderr, result.stdout]
    .filter(Boolean)
    .join("\n");
  const excerpt =
    output.length <= 16_000
      ? output
      : `${output.slice(0, 8_000)}\n… output shortened …\n${output.slice(-8_000)}`;
  console.log(
    JSON.stringify({
      decision: "block",
      reason: `npm run check:quick failed (${result.signal ?? result.status ?? "could not start"}). Fix the reported issues and rerun it before finishing.\n\n${excerpt.trim()}`,
    }),
  );
}
