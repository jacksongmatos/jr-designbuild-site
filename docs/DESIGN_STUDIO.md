# Design Studio — interactive finish visualizer

Route: `#/studio` (nav: **Studio**). Code: `src/studio.jsx`.

The client taps hotspots on a room to repaint surfaces live:
walls & ceiling (Sherwin-Williams colors), cabinets, countertop, backsplash,
flooring (wood/tile in perspective) and a crown-molding toggle. The chosen
combination can be sent to the team — it's stashed in `sessionStorage` under
`jr_studio_look` and auto-fills the Contact form message.

Everything is **data-driven**. To extend, edit the arrays at the top of
`src/studio.jsx`:

| Array | Drives |
|-------|--------|
| `SW` | Sherwin-Williams palette (walls/ceiling). `{ id, name, hex, sw }` |
| `CABINETS` | Cabinet finishes (`kind: "color" | "wood"`) |
| `COUNTERS` | Countertop slabs (`base` + optional `vein`) |
| `BACKSPLASH` | Backsplash (`style: "subway" | "slab"`) |
| `FLOORS` | Flooring (`kind: "wood" | "tile"`, `base`, `line`) |
| `ROOMS` | Rooms + each region's hotspot position and swatch library |

> SW hex values are on-screen approximations; the **SW number is exact** —
> always confirm against a physical chip.

## MVP today

The kitchen renders as a **brand-styled vector scene** (`kind: "vector"`), so
the whole experience works with zero photography. Adding swatches is a one-line
edit to the arrays above.

## Adding a real PHOTO room (production path)

Same data model, with `kind: "photo"`. Drop assets in
`public/studio/<room>/` and add a room entry:

```js
{
  id: "kitchen-oakland",
  name: "Kitchen",
  kind: "photo",
  base: "/studio/kitchen-oakland/base.jpg",  // the room photo
  w: 1600, h: 1067,                            // intrinsic px (for hotspot %)
  regions: [
    // tint = recolor a masked region with multiply blend (keeps shadows)
    { id: "walls",   label: "Walls",   lib: "SW",       type: "tint",
      mask: "/studio/kitchen-oakland/mask-walls.png",   hotspot: { x: 18, y: 30 } },
    { id: "ceiling", label: "Ceiling", lib: "SW",       type: "tint",
      mask: "/studio/kitchen-oakland/mask-ceiling.png", hotspot: { x: 50, y: 8 } },
    { id: "cabinets",label: "Cabinets",lib: "CABINETS", type: "tint",
      mask: "/studio/kitchen-oakland/mask-cabinets.png",hotspot: { x: 35, y: 62 } },
    // floor = perspective-warp a texture onto the 4 floor corners (% of image)
    { id: "floor",   label: "Flooring",lib: "FLOORS",   type: "floor",
      quad: [[2,72],[98,72],[112,99],[-12,99]],         hotspot: { x: 40, y: 88 } },
    { id: "molding", label: "Crown molding", lib: "TOGGLE", type: "toggle",
      overlay: "/studio/kitchen-oakland/molding.png",   hotspot: { x: 30, y: 12 } },
  ],
}
```

### How each asset is produced

- **base.jpg** — the room photo (1600px wide is plenty; keep it < ~400 KB).
- **mask-*.png** — a transparent PNG the same size as the photo, painted white
  over the region (wall/ceiling/cabinets) and transparent everywhere else.
  Make them in Photoshop (Select > Subject / quick mask) or any segmentation
  tool. The renderer uses each mask as a CSS `mask-image` and paints the chosen
  color through it with `mix-blend-mode: multiply`, so shadows and texture from
  the photo show through — the recolor looks real, not like a sticker.
- **floor `quad`** — the four floor corners as `[x%, y%]` (top-left, top-right,
  bottom-right, bottom-left). The renderer computes a `matrix3d` homography and
  maps the wood/tile texture onto that plane, so planks recede in correct
  perspective. No mask needed for the floor.
- **molding.png** — optional transparent overlay of the crown molding, shown
  when the toggle is on.

### Rendering contract (already wired in `src/studio.jsx`)

- `type:"tint"`  → `<div>` with `WebkitMaskImage: url(mask)` + `background: hex`
  + `mixBlendMode: "multiply"` over the photo.
- `type:"floor"` → texture `<div>` transformed by `matrix3d(...)` from `quad`.
- `type:"toggle"`→ overlay `<img>` shown/hidden.
- `type` omitted → treated as the vector scene path.

Once the assets exist, the photo room shows up in the room switcher with the
exact same hotspot + swatch UX as the vector kitchen.
