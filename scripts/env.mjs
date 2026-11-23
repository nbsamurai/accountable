// The settings in .env (spec 9.8), read with Node's own parser, for the npm scripts that
// start or reset Accountable. The shell's own environment wins over the file.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SUPABASE_SETTINGS = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];

/** The values in .env, or none when the file doesn't exist. */
export function readEnvFile(path = join(root, ".env")) {
  return existsSync(path) ? { ...parseEnv(readFileSync(path, "utf8")) } : {};
}

/** This process's environment, with the values in .env that it doesn't set itself. */
export function withEnvFile(env = process.env, path) {
  return { ...readEnvFile(path), ...env };
}

/** The Supabase settings that are missing or empty in `env`. */
export function missingSettings(env) {
  return SUPABASE_SETTINGS.filter((name) => !(env[name] ?? "").trim());
}

/** `env` without the three Supabase settings, so the app runs as a local copy. */
export function withoutSettings(env = process.env) {
  const copy = { ...env };
  for (const name of SUPABASE_SETTINGS) delete copy[name];
  return copy;
}
