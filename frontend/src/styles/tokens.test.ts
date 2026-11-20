// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

// Checks the color tokens in tokens.css against the contrast rules in spec 5.2 and section 6,
// and that no color is written anywhere else.

const styles = fileURLToPath(new URL(".", import.meta.url));
const src = join(styles, "..");
const tokensCss = readFileSync(join(styles, "tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The custom properties declared in the first block that starts a line with this selector. */
function declarations(selector: string): Record<string, string> {
  const start = tokensCss.search(new RegExp(`^${selector.replace(/[[\]"]/g, "\\$&")} \\{`, "m"));
  if (start < 0) return {};
  const body = tokensCss.slice(tokensCss.indexOf("{", start) + 1, tokensCss.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  );
}

const light = declarations(":root");
const darkBlock = declarations(':root[data-theme="dark"]');
// Dark mode is the light tokens with the dark block on top, as in the browser.
const MODES = { light, dark: { ...light, ...darkBlock } } as const;

type Rgba = { r: number; g: number; b: number; a: number };

/** A token's color in a mode, following var() references. */
function color(tokens: Record<string, string>, name: string): Rgba {
  const value = tokens[name];
  if (value === undefined) throw new Error(`${name} isn't defined`);
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  if (reference) return color(tokens, reference[1]);
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgb = value.match(/^rgb\((\d+) (\d+) (\d+)(?: \/ (\d+)%)?\)$/);
  if (rgb)
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a: rgb[4] === undefined ? 1 : +rgb[4] / 100 };
  throw new Error(`${name} isn't a color the test can read: ${value}`);
}

/** WCAG relative luminance of an opaque color. */
function luminance({ r, g, b }: Rgba) {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** The WCAG contrast ratio of a foreground over an opaque background. */
function contrast(fg: Rgba, bg: Rgba) {
  const over = (c: "r" | "g" | "b") => fg[c] * fg.a + bg[c] * (1 - fg.a);
  const [a, b] = [luminance({ r: over("r"), g: over("g"), b: over("b"), a: 1 }), luminance(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const INKS = [
  "--ink",
  "--ink-muted",
  "--primary-ink",
  "--secondary-ink",
  "--tertiary-ink",
  "--info-ink",
  "--alert-ink",
];

/** [foreground, background, minimum ratio] */
const PAIRS: [string, string, number][] = [
  // Text on the page and on panels: 4.5:1.
  ...INKS.flatMap((ink): [string, string, number][] => [
    [ink, "--panel", 4.5],
    [ink, "--page", 4.5],
  ]),
  // Lost, the secondary button and row hover.
  ["--ink", "--subtle", 4.5],
  // Text on fills: 4.5:1.
  ["--on-bright", "--primary", 4.5],
  ["--on-bright", "--primary-hover", 4.5],
  ["--on-bright", "--secondary", 4.5],
  ["--on-bright", "--tertiary", 4.5],
  ["--on-dark", "--info-fill", 4.5],
  ["--on-dark", "--alert-fill", 4.5],
  ["--on-dark", "--alert-fill-hover", 4.5],
  ["--on-fill-strong", "--fill-strong", 4.5],
  // Controls, the focus ring and chart shapes: 3:1.
  ["--control", "--panel", 3],
  ["--info-ink", "--panel", 3],
  ["--info-ink", "--page", 3],
  ["--info", "--panel", 3],
];

/** The stage fills that show a count badge in the pipeline's column headers. */
const COUNTED_FILLS = [
  "--primary",
  "--secondary",
  "--tertiary",
  "--info-fill",
  "--fill-strong",
  "--subtle",
];

describe.each(Object.entries(MODES))("%s mode", (_mode, tokens) => {
  test.each(PAIRS)("%s on %s reaches %s:1", (fg, bg, minimum) => {
    expect(contrast(color(tokens, fg), color(tokens, bg))).toBeGreaterThanOrEqual(minimum);
  });

  test.each(COUNTED_FILLS)("a count's text on its badge over %s reaches 4.5:1", (fill) => {
    const badge = color(tokens, "--count-bg");
    const under = color(tokens, fill);
    const mix = (c: "r" | "g" | "b") => badge[c] * badge.a + under[c] * (1 - badge.a);
    const background = { r: mix("r"), g: mix("g"), b: mix("b"), a: 1 };
    expect(contrast(color(tokens, "--on-bright"), background)).toBeGreaterThanOrEqual(4.5);
  });
});

test("the dark block redefines every color token, the shadows and the backdrop", () => {
  const colored = Object.keys(light).filter((name) => /#[0-9a-f]{3,8}\b|rgb\(/i.test(light[name]));
  expect(colored.filter((name) => !(name in darkBlock))).toEqual([]);
});

/** Every .css, .ts and .tsx file under src/, apart from tests and tokens.css. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(css|tsx?)$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return path === join(styles, "tokens.css") ? [] : [path];
  });
}

const COLOR =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|red|green|blue|gr[ae]y|silver)\b/i;

/** The colors written in a file: in CSS, in declaration values; in scripts, in strings. */
function colorsIn(path: string): string[] {
  const text = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  if (path.endsWith(".css")) {
    const values = [...text.matchAll(/[\w-]+\s*:\s*([^;{}]+);/g)].map((m) => m[1]);
    return [
      ...values.filter((value) => COLOR.test(value)),
      ...(text.match(/\[data-theme[^\]]*\]/g) ?? []),
    ];
  }
  const strings = [...text.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].map((m) => m[2]);
  return strings.filter((s) => /^#[0-9a-f]{3,8}$|\b(?:rgba?|hsla?|oklch)\(/i.test(s));
}

test("colors are written only in tokens.css", () => {
  const found = sourceFiles(src).flatMap((path) =>
    colorsIn(path).map((c) => `${relative(src, path)}: ${c}`),
  );
  expect(found).toEqual([]);
});
