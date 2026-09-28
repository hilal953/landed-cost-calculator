import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Legacy static browser scripts are covered by node --check +
    // functional tests instead of ESLint.
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "public/**"],
  },
];

export default config;
