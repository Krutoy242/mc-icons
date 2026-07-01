// Pre-commit tasks (run by simple-git-hooks → `pnpm exec lint-staged`).
//
// Kept deliberately cheap to stay under the ~3s budget: only staged files are
// touched, linting goes through the `eslint_d` daemon (the full antfu config,
// but ~1.5s warm instead of ~6s cold — the daemon persists between commits),
// and the 7s README regeneration fires ONLY when a doc source changes.
export default {
  '*.{ts,tsx,js,mjs,cjs}': 'eslint_d --fix',

  // The README autogen blocks are derived from source: the "Examples" table from
  // the `@example` rows in examples.ts, and the "Options" block from the CLI
  // definition in cli.ts. When either changes, regenerate and stage the result
  // (lint-staged re-adds only the *matched* files, so README.md must be added
  // explicitly).
  'src/{tool/examples,cli}.ts': () => [
    'tsx src/tool/gen-readme.ts',
    'git add README.md',
  ],
}
