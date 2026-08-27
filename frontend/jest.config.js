export default {
  testEnvironment: "jsdom",
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
