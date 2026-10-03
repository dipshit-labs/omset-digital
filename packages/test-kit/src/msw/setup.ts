import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./server";

export { server } from "./server";

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
