export const cn = (
  ...classes: (boolean | null | string | undefined)[]
): string => classes.filter(Boolean).join(" ");
