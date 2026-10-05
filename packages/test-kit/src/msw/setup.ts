import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./server";

let isListening = false;

beforeAll(() => {
  if (!isListening) {
    server.listen();
    isListening = true;
  }
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  if (isListening) {
    server.close();
    isListening = false;
  }
});
