import type { PayloadRequest } from "payload";

export interface GenerateThemePreviewPathOptions {
  collection?: string;
  path?: string;
  previewEndpoint?: string;
  previewSecret?: string;
  req?: PayloadRequest;
  slug?: string;
  storeSlug?: string | null;
}

const normalizePath = (rawPath: string): string => {
  if (!rawPath || rawPath === "/") {
    return "/";
  }

  return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
};

const resolveCollectionPath = (collection?: string, slug?: string): string => {
  if (collection === "themes") {
    return "/";
  }

  if (collection === "templates") {
    return !slug || slug === "home" ? "/" : `/${encodeURIComponent(slug)}`;
  }

  if (collection) {
    return slug
      ? `/${collection}/${encodeURIComponent(slug)}`
      : `/${collection}`;
  }

  return "/";
};

const applyStorePrefix = (
  targetPath: string,
  storeSlug?: string | null
): string => {
  if (!storeSlug) {
    return targetPath;
  }

  const trimmedSlug = storeSlug.trim();
  if (!trimmedSlug) {
    return targetPath;
  }

  const storePrefix = `/${trimmedSlug}`;
  if (targetPath === storePrefix || targetPath.startsWith(`${storePrefix}/`)) {
    return targetPath;
  }

  return targetPath === "/" ? storePrefix : `${storePrefix}${targetPath}`;
};

export const generateThemePreviewPath = ({
  collection,
  path: explicitPath,
  previewEndpoint = "/next/preview",
  previewSecret,
  slug,
  storeSlug,
}: GenerateThemePreviewPathOptions): string => {
  const basePath =
    explicitPath !== undefined && explicitPath !== null
      ? normalizePath(explicitPath)
      : resolveCollectionPath(collection, slug);

  const targetPath = applyStorePrefix(basePath, storeSlug);
  const searchParams = new URLSearchParams();
  searchParams.set("path", targetPath);

  if (previewSecret !== undefined && previewSecret !== "") {
    searchParams.set("previewSecret", previewSecret);
  }

  const endpoint = previewEndpoint.startsWith("/")
    ? previewEndpoint
    : `/${previewEndpoint}`;

  return `${endpoint}?${searchParams.toString()}`;
};
