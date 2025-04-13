/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
  // transform: { "^.+\.tsx?$": ["ts-jest",{}], },
  transform: {
    "^.+\.tsx?$": ["ts-jest", { useESM: true }],
  },
  moduleNameMapper: {
    "(.+)\\.js": "$1",
  },
  extensionsToTreatAsEsm: [".ts"],
  projects: [
    {
      displayName: "node-tests",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/**/*.test.ts"],
      // testPathIgnorePatterns: ["tests/jsdom"],

      // These settings are repeated here because project configs don't inherit from the root config
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
      },
      moduleNameMapper: {
        "(.+)\\.js": "$1",
      },
      extensionsToTreatAsEsm: [".ts"],
    },
    {
      displayName: "msw-jsdom-tests",
      // Using `jest-fixed-jsdom` env for MSW+JSDOM. See: https://github.com/mswjs/examples/tree/main/examples/with-jest-jsdom
      // testEnvironment: "jsdom",
      testEnvironment: "jest-fixed-jsdom",

      testMatch: [
        // "**/__tests__/**/websocket-event-client.test.ts",
        // "**/__tests__/jsdom/**/*.test.ts",
        // "<rootDir>/tests/jsdom/msw-websocket-mock-example.test.ts",
        // "<rootDir>/tests/jsdom/msw-jsdom-example.test.ts",
        // "<rootDir>/tests/jsdom/websocket-event-client.test.ts",
        // "<rootDir>/tests/jsdom/connection-aware-event-bus.test.ts",
        "<rootDir>/tests/jsdom/*.test.ts",
      ],

      // These settings are repeated here because project configs don't inherit from the root config
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
      },
      moduleNameMapper: {
        "(.+)\\.js": "$1",
      },
      extensionsToTreatAsEsm: [".ts"],
    },
  ],
};
