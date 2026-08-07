import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Folds the snapshot build into one self-contained HTML file.
 *
 * Publishing targets forbid external requests, so the JS and CSS are inlined
 * rather than linked. The wrapper tags are omitted deliberately: the artifact
 * host supplies <!doctype>, <head> and <body> around this content.
 */
const DIST = "dist-snapshot";
const assets = readdirSync(join(DIST, "assets"));
const js = readFileSync(join(DIST, "assets", assets.find((f) => f.endsWith(".js"))), "utf8");
const css = readFileSync(join(DIST, "assets", assets.find((f) => f.endsWith(".css"))), "utf8");

const out = join(DIST, "atlas-dashboard.html");
writeFileSync(
  out,
  `<title>Atlas Analytics — Dashboard</title>\n` +
    `<style>\n${css}\n</style>\n` +
    `<div id="root"></div>\n` +
    // A literal "</script" inside a JS string would close the tag early.
    `<script type="module">\n${js.replaceAll("</script", "<\\/script")}\n</script>\n`,
);

console.log(`${out} — ${(readFileSync(out).length / 1024 / 1024).toFixed(2)} MB`);
