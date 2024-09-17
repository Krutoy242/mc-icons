import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {

  }
}, {
  files: ['**/*.md'],
  rules: {
    'style/no-trailing-spaces': 'off',
  },
})
