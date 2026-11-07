import { pathToFileURL } from "node:url";
import { resolve as pathResolve } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const targetPath = pathResolve(process.cwd(), "src", specifier.slice(2));
    const extensions = ["", ".ts", ".tsx", ".js", ".mjs"];
    for (const ext of extensions) {
      try {
        return await nextResolve(pathToFileURL(targetPath + ext).href, context);
      } catch {}
    }
  }
  return nextResolve(specifier, context);
}
