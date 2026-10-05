export const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error), {
    cause: error,
  });
};

export const quoteIdentifier = (value: string): string =>
  `"${value.replaceAll('"', '""')}"`;
