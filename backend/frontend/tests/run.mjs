// DOM interaction checks only. No browser, server or real account is used.
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { unlink } from "node:fs/promises";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "Node",
  "Event",
  "MouseEvent",
  "FormData",
  "File",
  "location",
]) {
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: true });
HTMLElement.prototype.scrollIntoView = () => {};
await build({
  entryPoints: ["tests/screens.jsx"],
  outfile: "tests/.screens.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "automatic",
});
try {
  await import("./.screens.mjs");
} finally {
  dom.window.close();
  await unlink("tests/.screens.mjs");
}
