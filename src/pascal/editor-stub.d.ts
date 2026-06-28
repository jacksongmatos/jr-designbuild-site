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
  import type { ComponentType, ReactNode } from "react";
  // <Editor/> — all props optional in the real package; extraSidebarPanels is
  // the v1 slot we use to inject the JR build/furnish panels.
  export const Editor: ComponentType<Record<string, unknown>>;
  // Built-in furniture catalog panel (props all optional).
  export const ItemsPanel: ComponentType<Record<string, unknown>>;
  // Editor store (zustand). Used both as a hook `useEditor(selector)` and via
  // `useEditor.getState()`; typed loosely since we only call known actions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const useEditor: any;
  // Extra sidebar panel descriptor consumed by <Editor extraSidebarPanels>.
  export type ExtraPanel = {
    id: string;
    icon: ReactNode;
    label: string;
    component: ComponentType;
  };
}
