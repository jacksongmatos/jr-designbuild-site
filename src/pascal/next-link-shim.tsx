/*
 * next/link shim
 * --------------
 * @pascal-app/editor imports `next/link`. vite.config.ts aliases "next/link"
 * to this module. Renders a plain <a> and drops Next-only routing props.
 */
import React from "react";

type NextLinkProps = {
  href: string | { pathname?: string };
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  // Next-only props accepted and ignored:
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  locale?: string | false;
};

const NextLink = React.forwardRef<HTMLAnchorElement, NextLinkProps>(function NextLink(
  props,
  ref,
) {
  const { href, children, className, style, target, rel, title, onClick } = props;
  const url = typeof href === "string" ? href : href?.pathname || "#";
  return (
    <a
      ref={ref}
      href={url}
      className={className}
      style={style}
      target={target}
      rel={rel}
      title={title}
      onClick={onClick}
    >
      {children}
    </a>
  );
});

export default NextLink;
