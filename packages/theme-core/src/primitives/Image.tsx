import NextImage from "next/image";
import type { ImgHTMLAttributes, ReactElement } from "react";

import { cn } from "../utils/cn";
import { isNextJsEnvironment } from "../utils/isNextJs";

export interface StaticImageData {
  blurDataURL?: string;
  height: number;
  src: string;
  width: number;
}

export interface ImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width" | "height"
> {
  adapter?: "auto" | "html" | "next";
  alt: string;
  blurDataURL?: string;
  fill?: boolean;
  height?: number | string;
  placeholder?: "blur" | "empty";
  priority?: boolean;
  quality?: number | string;
  src: string | StaticImageData;
  width?: number | string;
}

const parseNumeric = (value?: number | string): number | undefined => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Math.trunc(Number(value));
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
};

const NextImageAdapter = ({
  alt,
  blurDataURL,
  className,
  decoding,
  fill,
  height,
  loading,
  placeholder,
  priority,
  quality,
  src,
  style,
  width,
  ...props
}: ImageProps): ReactElement => {
  const nextWidth = parseNumeric(width);
  const nextHeight = parseNumeric(height);
  const nextQuality = parseNumeric(quality);

  return (
    <NextImage
      alt={alt}
      blurDataURL={blurDataURL}
      className={cn(className)}
      data-slot="image"
      decoding={decoding}
      fill={fill}
      height={nextHeight}
      loading={loading}
      placeholder={placeholder}
      priority={priority}
      quality={nextQuality}
      src={src}
      style={style}
      width={nextWidth}
      {...props}
    />
  );
};

const HtmlImageAdapter = ({
  adapter: _adapter,
  alt,
  blurDataURL: _blurDataURL,
  className,
  decoding = "async",
  fill,
  height,
  loading,
  placeholder: _placeholder,
  priority,
  quality: _quality,
  src,
  style,
  width,
  ...props
}: ImageProps): ReactElement => {
  const srcString = typeof src === "string" ? src : src.src;
  const resolvedWidth = typeof src === "string" ? width : (width ?? src.width);
  const resolvedHeight =
    typeof src === "string" ? height : (height ?? src.height);

  return (
    // oxlint-disable-next-line next/no-img-element
    <img
      alt={alt}
      className={cn(
        fill && "absolute inset-0 h-full w-full object-cover",
        className
      )}
      data-slot="image"
      decoding={decoding}
      height={fill ? undefined : resolvedHeight}
      loading={priority ? "eager" : (loading ?? "lazy")}
      src={srcString}
      style={style}
      width={fill ? undefined : resolvedWidth}
      {...props}
    />
  );
};

export const Image = ({
  adapter = "auto",
  ...props
}: ImageProps): ReactElement => {
  const useNext =
    adapter === "next" || (adapter === "auto" && isNextJsEnvironment());

  return useNext ? (
    <NextImageAdapter {...props} />
  ) : (
    <HtmlImageAdapter {...props} />
  );
};
