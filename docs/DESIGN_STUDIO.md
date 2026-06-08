# Design Studio — interactive finish visualizer

Route: `#/studio` (nav: **Studio**). Marker tool: `#/studio-editor` (hidden).
Code: `src/studio.jsx`, `src/studio-editor.jsx`.

The client taps hotspots on a room to repaint surfaces live: walls & ceiling
(Sherwin-Williams colors), cabinets, countertop, backsplash, flooring (wood/tile
in perspective) and a crown-molding toggle. The chosen combination is stashed in
`sessionStorage` (`jr_studio_look`) and auto-fills the Contact form.

Everything is **data-driven** — edit the arrays at the top of `src/studio.jsx`:

| Array | Drives |
|-------|--------|
| `SW` | Sherwin-Williams palette (walls/ceiling). `{ id, name, hex, sw }` |
| `CABINETS` | Cabinet finishes (`kind: "color" \| "wood"`) |
| `COUNTERS` | Countertop slabs (`base` + optional `vein`) |
| `BACKSPLASH` | Backsplash (`style: "subway" \| "slab"`) |
| `FLOORS` | Flooring (`kind: "wood" \| "tile"`, `base`, `line`) |
| `ROOMS` | Rooms + each region's hotspot/coords and swatch library |

> SW hex values are on-screen approximations; the **SW number is exact** — always
> confirm against a physical chip.

## Two room kinds

- **`kind:"vector"`** — the brand-styled SVG kitchen that ships by default.
  Works with zero photography.
- **`kind:"photo"`** — your photo + polygon regions. Tint regions recolor with
  `mix-blend-mode:multiply` (keeps the photo's shadows, so it looks real, not
  like a sticker). The floor warps a texture onto a 4-corner quad in perspective
  via a `matrix3d` homography.

## "Does the site detect the regions automatically?"

No auto-detection — you **mark** each surface once, which is reliable and takes
~2 minutes. You don't hand-write coordinates: use the in-browser marker.

### Adding a real photo room (the easy path)

1. Open **`/#/studio-editor`** (the marker — not in the nav).
2. **Load photo** (stays local in your browser; nothing is uploaded here).
3. Set a `room id` (e.g. `kitchen-oakland`) and name.
4. Pick a surface tab (Walls, Ceiling, Cabinets, Countertop, Backsplash) and
   **click around its corners**. For **Flooring**, click exactly **4 corners**
   in order: top-left → top-right → bottom-right → bottom-left.
5. Keep "Preview recolor" on to confirm each region covers the right area.
6. **Copy config** and paste the object into the `ROOMS` array in
   `src/studio.jsx`.
7. Save the photo at `public/studio/<room id>/base.jpg`.
8. Commit & push — the room shows up in the Studio room switcher with the same
   hotspot + swatch UX as the demo kitchen.

A region is included once it has 3+ points (the floor needs exactly 4).
Hotspots default to each region's centroid; add an explicit `hotspot:{x,y}`
(in % of the image) to fine-tune where the dot sits.

### Example exported config

```js
{
  id: "kitchen-oakland",
  name: "Kitchen",
  kind: "photo",
  base: "/studio/kitchen-oakland/base.jpg",
  defaults: { walls: "SW7757", ceiling: "SW7757", floor: "white-oak" },
  regions: [
    { id: "ceiling", label: "Ceiling", lib: "SW",     type: "tint",  poly: [[0,1],[100,0],[100,14],[0,16]] },
    { id: "walls",   label: "Walls",   lib: "SW",     type: "tint",  poly: [[1,16],[100,14],[100,55],[1,58]] },
    { id: "floor",   label: "Flooring",lib: "FLOORS", type: "floor", quad: [[6,70],[94,70],[114,99],[-14,99]] },
  ],
}
```

### Crown molding on a photo (optional)

Add a region `{ id:"molding", label:"Crown molding", lib:"TOGGLE", type:"toggle",
overlay:"/studio/<id>/molding.png", hotspot:{x,y} }` — a transparent PNG of the
molding shown when the toggle is on. (The marker doesn't generate this overlay;
it's an optional manual asset.)

## Rendering contract (already wired)

- `type:"tint"`  → `<div>` clipped to the polygon, `background:<hex>`,
  `mix-blend-mode:multiply` over the photo.
- `type:"floor"` → texture `<div>` transformed by `matrix3d(...)` from the quad.
- `type:"toggle"`→ overlay `<img>` shown/hidden.
- vector rooms ignore `poly`/`quad` and draw the SVG scene.
