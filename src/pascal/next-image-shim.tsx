/*
 * next/image shim
 * ---------------
 * @pascal-app/editor is published as a Next.js library and imports `next/image`
 * in ~26 files. This site is Vite, not Next, so vite.config.ts aliases
 * "next/image" to this module. It renders a plain <img> and drops Next-only
 * props that aren't valid DOM attributes.
 *
 * Pascal references some icons by root-absolute paths (e.g. "/icons/wall.png").
 * Those assets live on Pascal's CDN, not on this site, so we resolve "/"-paths
 * against PASCAL_ASSET_BASE. Anything else (http(s), data:, blob:) is used as-is.
 */
import React from "react";
import { PASCAL_ASSET_BASE } from "./config";

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
  if (!raw) return raw;
  if (/^(https?:|data:|blob:|asset:)/.test(raw)) return raw;
  // Root-absolute Pascal asset → resolve against the Pascal CDN.
  return `${PASCAL_ASSET_BASE}${raw.startsWith("/") ? raw : `/${raw}`}`;
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
