import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as pathResolve, dirname } from "node:path";
import fs from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  let candidatePath = null;

  if (specifier.startsWith("@/")) {
    candidatePath = pathResolve(process.cwd(), "src", specifier.slice(2));
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const parentFile = fileURLToPath(context.parentURL);
    candidatePath = pathResolve(dirname(parentFile), specifier);
  }

  if (candidatePath) {
    const extensions = ["", ".ts", ".tsx", ".js", "/index.ts", "/index.js"];
    for (const ext of extensions) {
      const testFile = candidatePath + ext;
      if (fs.existsSync(testFile) && fs.statSync(testFile).isFile()) {
        return {
          url: pathToFileURL(testFile).href,
          shortCircuit: true,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}
