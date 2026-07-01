// Pre-commit tasks (run by simple-git-hooks → `pnpm exec lint-staged`).
//
// Kept deliberately cheap to stay under the ~3s budget: only staged files are
// touched, linting goes through the `eslint_d` daemon (the full antfu config,
// but ~1.5s warm instead of ~6s cold — the daemon persists between commits),
// and the 7s README regeneration fires ONLY when the example source changes.
export default {
  '*.{ts,tsx,js,mjs,cjs}': 'eslint_d --fix',

  // The README "Examples" table is generated from these `@example` rows. When
  // they change, regenerate it and stage the result (lint-staged re-adds only
  // the *matched* files, so README.md must be added explicitly).
  'src/tool/examples.ts': () => [
    'tsx src/tool/gen-readme.ts',
    'git add README.md',
  ],
}
