/*
 * PascalEditor — thin wrapper around @pascal-app/editor's <Editor />.
 *
 * Lives in its own module so PlannerModal can React.lazy() it: the heavy 3D
 * editor (three.js, r3f, drei, radix, …) and its CSS are code-split into a
 * separate chunk that only downloads when the planner is actually opened.
 *
 * To swap the planner later, replace what this component renders — PlannerModal
 * doesn't care what's inside.
 */
import "./pascal-editor.css";
import { Editor } from "@pascal-app/editor";
import { JR_BUILD_PANELS } from "./jr-build-panels";

export default function PascalEditor() {
  return (
    // `.pascal-editor-root` re-applies a Tailwind reset scoped to the editor
    // (global preflight is disabled to protect the rest of the site).
    // `.dark` selects the editor's dark shadcn theme.
    <div className="pascal-editor-root dark">
      {/* extraSidebarPanels adds our Build (structure tools) + Furnish
          (item catalog) panels to the left rail — the package doesn't ship a
          build palette of its own. See src/pascal/jr-build-panels.tsx. */}
      <Editor extraSidebarPanels={JR_BUILD_PANELS} />
    </div>
  );
}
