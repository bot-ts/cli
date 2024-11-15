const typescript = require("@rollup/plugin-typescript")

module.exports = [
  // Build du code JavaScript
  {
    input: "src/index.ts",
    output: {
      file: "bin/index.js",
      format: "cjs",
      banner: "#!/usr/bin/env node",
    },
    plugins: [typescript()],
  },
]
