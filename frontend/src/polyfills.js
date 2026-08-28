// frontend/src/polyfills.js
// jsdom does not implement TextEncoder/TextDecoder, but some runtime
// dependencies (e.g. react-router v7) rely on them. Jest loads this file
// via `setupFiles`, before any module under test is imported.
const { TextEncoder, TextDecoder } = require("node:util");

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder;
}
