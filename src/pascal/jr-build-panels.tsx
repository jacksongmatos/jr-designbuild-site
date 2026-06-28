/*
 * JR build panels for the embedded Pascal editor.
 *
 * The published @pascal-app/editor package ships the 3D engine + editor shell
 * but NOT the "Build" tool palette / item catalog UI — that lives in Pascal's
 * own hosted app. So we assemble our own, wired to the editor's exported store
 * (useEditor) and its built-in furniture catalog (ItemsPanel), and inject them
 * as extra sidebar panels via <Editor extraSidebarPanels={...} /> (the v1 slot).
 *
 * - BuildPanel: structure tools (Wall, Room, Door, …) -> useEditor.setTool().
 * - FurnishPanel: the package's ItemsPanel (built-in CATALOG_ITEMS) for furniture.
 *
 * Icons are the self-hosted /icons/*.png (see public/icons + next-image-shim).
 */
import { ItemsPanel, useEditor, type ExtraPanel } from "@pascal-app/editor";

type ToolId =
  | "wall"
  | "room"
  | "door"
  | "window"
  | "stair"
  | "slab"
  | "ceiling"
  | "roof"
  | "column"
  | "fence"
  | "zone";

const STRUCTURE_TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: "wall", label: "Wall", icon: "/icons/wall.png" },
  { id: "room", label: "Room", icon: "/icons/room.png" },
  { id: "door", label: "Door", icon: "/icons/door.png" },
  { id: "window", label: "Window", icon: "/icons/window.png" },
  { id: "stair", label: "Stairs", icon: "/icons/stairs.png" },
  { id: "slab", label: "Floor", icon: "/icons/floor.png" },
  { id: "ceiling", label: "Ceiling", icon: "/icons/ceiling.png" },
  { id: "roof", label: "Roof", icon: "/icons/roof.png" },
  { id: "column", label: "Column", icon: "/icons/column.png" },
  { id: "fence", label: "Fence", icon: "/icons/fence.png" },
  { id: "zone", label: "Zone", icon: "/icons/zone.png" },
];

// Mirror of the package's command-palette tool activation: enter Structure
// build mode and select the tool, then draw in the 3D scene.
function activateTool(id: ToolId) {
  const s = useEditor.getState();
  s.setPhase("structure");
  s.setMode("build");
  s.setStructureLayer(id === "zone" ? "zones" : "elements");
  s.setTool(id);
}

function BuildPanel() {
  const activeTool = useEditor((s: { tool: string | null }) => s.tool);
  return (
    <div className="flex flex-col gap-3 p-3 text-foreground">
      <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        Build — pick a tool, then draw in the scene
      </div>
      <div className="grid grid-cols-3 gap-2">
        {STRUCTURE_TOOLS.map((t) => {
          const active = activeTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => activateTool(t.id)}
              className={[
                "flex flex-col items-center gap-1 rounded-lg border bg-background p-2 text-center transition-colors hover:bg-accent",
                active ? "border-ring ring-2 ring-ring" : "border-border",
              ].join(" ")}
            >
              <img src={t.icon} alt="" className="h-8 w-8 object-contain" />
              <span className="text-[11px] leading-tight text-foreground">{t.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-[11px] leading-snug">
        Tip: click points in the scene to draw. Press Esc to finish/cancel, X to
        delete, and use the bottom bar to orbit/pan.
      </p>
    </div>
  );
}

function FurnishPanel() {
  // ItemsPanel defaults to the package's built-in CATALOG_ITEMS and handles
  // placement itself. Hide the source/tag chips (community/mine need a backend).
  return (
    <div className="flex h-full flex-col text-foreground">
      <ItemsPanel showSourceFilter={false} showTagFilters={false} />
    </div>
  );
}

const railIcon = (src: string) => (
  <img src={src} alt="" className="h-6 w-6 object-contain" />
);

// Injected via <Editor extraSidebarPanels={JR_BUILD_PANELS} />.
export const JR_BUILD_PANELS: ExtraPanel[] = [
  { id: "jr-build", label: "Build", icon: railIcon("/icons/build.png"), component: BuildPanel },
  { id: "jr-furnish", label: "Furnish", icon: railIcon("/icons/couch.png"), component: FurnishPanel },
];
