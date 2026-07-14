import next from 'eslint-config-next';

const config = Array.isArray(next) ? next : [next];

const eslintConfig = [
  {
    ignores: ['node_modules', '.next', 'dist', 'build', 'coverage'],
  },
  ...config,
];

export default eslintConfig;
