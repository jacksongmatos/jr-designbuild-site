/*
 * Type stub for @pascal-app/editor.
 *
 * The package ships raw, untranspiled .tsx source (its "exports" entry is
 * ./src/index.tsx), so `tsc` would otherwise type-check Pascal's entire
 * internal source tree against THIS project's stricter tsconfig and emit
 * hundreds of irrelevant errors. tsconfig.json `paths` redirects the module
 * to this stub for type-checking only.
 *
 * IMPORTANT: this affects `tsc` ONLY. Vite resolves the real package at
 * runtime via resolve.alias + node resolution (it does not read tsconfig
 * paths), so the actual Editor component is what ships in the build.
 */
declare module "@pascal-app/editor" {
  import type { ComponentType } from "react";
  // We only consume <Editor />; all props are optional in the real package.
  export const Editor: ComponentType<Record<string, unknown>>;
}
