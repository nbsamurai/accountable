import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

function scan(args, cwd) {
  const flags = ["--verbose", "--redact=100", "--no-banner", "--no-color"];
  const result = spawnSync("gitleaks", [...args, ...flags], {
    cwd,
    stdio: "inherit",
  });
  if (result.error?.code === "ENOENT") {
    throw new Error("Install Gitleaks and add it to PATH. See docs/STATUS.md.");
  }
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = 1;
}

console.log("Scanning Git history");
scan(["git", "--log-opts=--all", "."]);
console.log("Scanning staged changes");
scan(["git", "--staged", "."]);

// Gitleaks' directory mode does not use Git's ignore rules. Scan the same
// working-tree files Git considers for commits, including new files.
console.log("Scanning the working tree");
const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const snapshot = mkdtempSync(join(tmpdir(), "accountable-gitleaks-"));
try {
  for (const file of new Set(files)) {
    if (!lstatSync(file, { throwIfNoEntry: false })?.isFile()) continue;
    const target = join(snapshot, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(file, target);
  }
  scan(["dir", "."], snapshot);
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
