import type { Payload } from "payload";

import type { ThemeSyncPayload } from "../types.js";

// SAFETY: Payload instance conforms to structural ThemeSyncPayload contract.
export const getSyncClient = (
  payload: Payload | ThemeSyncPayload
): ThemeSyncPayload => payload as ThemeSyncPayload;
