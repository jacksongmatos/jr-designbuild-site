/*
 * next/image shim
 * ---------------
 * @pascal-app/editor is published as a Next.js library and imports `next/image`
 * in ~26 files. This site is Vite, not Next, so vite.config.ts aliases
 * "next/image" to this module. It renders a plain <img> and drops Next-only
 * props that aren't valid DOM attributes.
 *
 * Pascal references icons by root-absolute paths (e.g. "/icons/wall.png").
 * Some are rendered with <Image> (this shim), others with a plain <img> in
 * Pascal's source — which this shim can't touch. So we pass "/"-absolute paths
 * through unchanged and SELF-HOST the icons at public/icons/ (copied from the
 * pascalorg/editor v0.9.1 tag — Pascal's live CDN serves a newer webp set that
 * 404s for the .png names this package version requests). Both <Image> and
 * plain <img> then resolve to our own origin identically. Anything else
 * (http(s), data:, blob:, asset:) is used as-is.
 */
import React from "react";

// Bump when the self-hosted icons in public/icons/ change. Appended as ?v= to
// "/icons/*" requests so browsers/edges that cached an old response (including
// the pre-self-hosting 404s) fetch the current file instead of serving stale.
const ICONS_VERSION = "1";

type StaticImport = { src: string; height?: number; width?: number };

type NextImageProps = {
  src: string | StaticImport;
  alt?: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  loading?: "eager" | "lazy";
  draggable?: boolean;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  // Next-only props we accept but ignore (so spreads don't leak them to the DOM):
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
  loader?: unknown;
  onLoadingComplete?: unknown;
  fetchPriority?: string;
  overrideSrc?: string;
};

function resolveSrc(src: string | StaticImport): string {
  const raw = typeof src === "string" ? src : src?.src || "";
  // Cache-bust the self-hosted icons; everything else passes through unchanged.
  if (raw.startsWith("/icons/")) {
    return `${raw}${raw.includes("?") ? "&" : "?"}v=${ICONS_VERSION}`;
  }
  return raw;
}

const NextImage = React.forwardRef<HTMLImageElement, NextImageProps>(function NextImage(
  props,
  ref,
) {
  const {
    src,
    alt = "",
    width,
    height,
    fill,
    className,
    style,
    sizes,
    loading,
    draggable,
    onClick,
  } = props;

  const fillStyle: React.CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...(style ?? {}) }
    : style ?? {};

  return (
    <img
      ref={ref}
      src={resolveSrc(src)}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      style={fillStyle}
      sizes={sizes}
      loading={loading}
      draggable={draggable}
      onClick={onClick}
    />
  );
});

export default NextImage;
