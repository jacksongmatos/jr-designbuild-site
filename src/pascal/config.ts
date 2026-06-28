/*
 * Pascal integration config.
 *
 * Pascal resolves 3D models, textures and UI icons from its hosted CDN. The
 * packages read `process.env.NEXT_PUBLIC_ASSETS_CDN_URL` (Next convention),
 * which vite.config.ts `define`s at build time. We mirror the same default
 * here so the next/image shim resolves "/icons/..." paths to the same origin.
 *
 * To self-host Pascal assets later, set VITE_PASCAL_ASSET_BASE and update the
 * `define` for NEXT_PUBLIC_ASSETS_CDN_URL in vite.config.ts to match.
 */
export const PASCAL_ASSET_BASE =
  (import.meta.env.VITE_PASCAL_ASSET_BASE as string | undefined) ||
  "https://editor.pascal.app";
