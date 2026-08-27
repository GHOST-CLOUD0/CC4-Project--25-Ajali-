export default {
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/src/polyfills.js"],
  setupFilesAfterEnv: ["<rootDir>/src/testSetup.js"],
  transform: {
    "^.+\\.[jt]sx?$": ["@swc/jest", {
      jsc: {
        parser: { syntax: "ecmascript", jsx: true },
        transform: { react: { runtime: "automatic" } },
      },
    }],
  },
};
