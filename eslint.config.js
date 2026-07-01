import antfu from '@antfu/eslint-config'

export default antfu({
  // `@antfu/eslint-config` already bundles eslint-plugin-jsdoc; these turn the
  // doc rules that guard the `@example` conversion rows into hard errors.
  rules: {
    'no-console': 'off',
    'jsdoc/check-alignment': 'error',
    'jsdoc/no-multi-asterisks': 'error',
    'jsdoc/empty-tags': 'error',
    'jsdoc/no-defaults': 'error',
  },
}, {
  files: ['**/*.md'],
  rules: {
    'style/no-trailing-spaces': 'off',
  },
})
