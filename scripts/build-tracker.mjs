import { build } from "esbuild";

await build({
  entryPoints: ["tracker/src/index.ts"],
  outfile: "public/script.js",
  bundle: true,
  minify: true,
  target: "es2018",
  format: "iife",
  logLevel: "info",
});
