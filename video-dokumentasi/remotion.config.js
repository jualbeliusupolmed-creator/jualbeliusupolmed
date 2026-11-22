/** @type {import("@remotion/cli/config").RemotionConfig} */
const config = {
  outputLocation: "out",
  entryPoint: "./src/index.tsx",
  webpackOverride: (config) => {
    return config;
  },
};

export default config;