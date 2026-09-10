const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const validateSlug = (val: unknown): string | true => {
  if (!val || typeof val !== "string" || val.length === 0) {
    return "Slug is required";
  }

  if (!SLUG_REGEX.test(val)) {
    return "Slug must be lowercase alphanumeric characters and hyphens only (no spaces or edge hyphens)";
  }

  return true;
};
