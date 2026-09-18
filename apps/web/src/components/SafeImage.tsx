"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type Props = Omit<ImageProps, "onError"> & {
  fallbackSrc: string;
};

export function SafeImage({ fallbackSrc, src, alt, ...rest }: Props) {
  const [current, setCurrent] = useState(src);

  return (
    <Image
      {...rest}
      alt={alt}
      src={current}
      onError={() => {
        if (current !== fallbackSrc) setCurrent(fallbackSrc);
      }}
    />
  );
}
