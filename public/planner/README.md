# JR Design Build — Self-Hosted 3D Floor Planner

This folder is served at **`/planner/`** in production (everything under
`public/` is copied to the site root by Vite). The `PlannerModal` component
(`src/PlannerModal.tsx`) loads **`/planner/index.html`** inside a fullscreen
`<iframe>`.

> **Until you drop the planner files here**, the modal shows a friendly
> fallback: _"Planner is being prepared. Please request a consultation."_
> Add `index.html` (below) and the planner appears automatically — no code
> changes required.

---

## What goes here: Sweet Home 3D JS

We use the **free, open-source** [Sweet Home 3D JS Online](https://www.sweethome3d.com/SweetHome3DJSOnline.jsp)
viewer/editor build. It is self-hosted, so there are **no paid APIs** and **no
dependency on Planner 5D or HomeByMe**.

### Steps

1. Download the **Sweet Home 3D JS Online** package (the HTML5/WebGL editor)
   from the official site:
   - https://www.sweethome3d.com/SweetHome3DJSOnline.jsp
   - License: GNU GPL / free for self-hosting. Keep the upstream `LICENSE.txt`.

2. Unzip it and copy its contents **into this folder** so the structure looks
   roughly like:

   ```
   public/planner/
   ├── index.html        ← entry point the iframe loads (REQUIRED)
   ├── lib/              ← Sweet Home 3D JS scripts (e.g. *.js)
   ├── resources/        ← furniture catalog, textures, icons
   └── README.md         ← this file
   ```

   The only hard requirement is that **`index.html` exists** at
   `public/planner/index.html` — that is the URL the modal probes and embeds.

3. (Optional) Trim the bundled furniture catalog / textures to keep the
   download light for mobile users.

4. Commit the files. On the next deploy they are served from `/planner/`.

---

## Swapping the planner later

The integration is intentionally **iframe-based** so the planner can be
replaced without touching the React app. Two ways to repoint it:

- **Drop-in replacement:** put a different planner build's `index.html`
  (and assets) in this folder. Nothing else changes.
- **Different URL:** edit `PLANNER_URL` near the top of
  `src/PlannerModal.tsx`. It can point to another self-hosted path or any
  iframe-embeddable planner you choose.

```ts
// src/PlannerModal.tsx
const PLANNER_URL = "/planner/index.html"; // ← change this to repoint the planner
```

---

## Notes

- **No external tracking scripts** should be added to the planner bundle —
  keep the embed clean and privacy-friendly.
- The iframe is sandboxed (`allow-scripts allow-same-origin allow-forms
  allow-pointer-lock allow-downloads`). If a future planner needs more, adjust
  the `sandbox` attribute in `src/PlannerModal.tsx`.
- The **"Request Estimate"** button in the modal links to
  `/contact?source=planner` so planner-driven leads are attributed correctly.
