"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * next/image that quietly disappears if the source fails to load, letting the
 * parent's background/placeholder show instead of a broken-image icon.
 */
export function SafeImage({ fallback = null, ...props }: ImageProps & { fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <Image
      {...props}
      onError={() => {
        if (process.env.NODE_ENV !== "production") console.warn("[image] failed to load:", props.src);
        setFailed(true);
      }}
    />
  );
}
