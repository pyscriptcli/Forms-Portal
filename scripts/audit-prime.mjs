import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

// Guard product surfaces against accidental prototype/theme color regressions.
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? (["api", "__tests__"].includes(entry.name) ? [] : walk(path.join(dir, entry.name))) :
  entry.name.endsWith(".tsx") ? [path.join(dir, entry.name)] : []);
const files = [...walk("src/app"), ...walk("src/components")];
const forbidden = /\b(?:bg|text|border|ring)-(?:slate|gray|zinc|neutral|stone|blue|purple|violet|indigo|sky|cyan|teal|green|emerald|amber|yellow|orange|red|rose)-\d+|\bbg-(?:white|black)\b|\brounded-(?!none)[a-z0-9]+|\bbg-gradient/;
const failures = files.flatMap(file => fs.readFileSync(file, "utf8").split("\n")
  .flatMap((line, i) => forbidden.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : []));
assert.deepEqual(failures, [], "Unbranded surface styles found");
const css = fs.readFileSync("src/styles/prime-brand.css", "utf8");
for (const color of ["#003366", "#FFFCFB", "#C9A84C", "#181D1E"]) assert.ok(css.includes(color), `Missing official token ${color}`);
const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
assert.ok(layout.includes("next/font/local"), "Brand fonts must be bundled");
for (const family of ["CormorantGaramond", "Montserrat", "BebasNeue"]) assert.ok(layout.includes(family));
for (const font of ["CormorantGaramond-Italic-Variable.ttf", "Montserrat-Variable.ttf", "BebasNeue-Regular.ttf"]) assert.ok(fs.statSync(`public/fonts/${font}`).size > 10000);
process.stdout.write(`PRIME audit passed: ${files.length} UI files; canonical palette, square geometry, bundled fonts.\n`);
