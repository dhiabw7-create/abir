module.exports = {
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module"
  },
  root: true,
  env: {
    node: true,
    jest: true
  },
  ignorePatterns: [".eslintrc.cjs", "dist", "node_modules"],
  extends: ["eslint:recommended"],
  rules: {
    "no-console": "off"
  }
};
