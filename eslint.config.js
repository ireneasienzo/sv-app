const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseConfig: require('./.eslintrc.json'),
});

module.exports = [
  ...compat.extends('next/core-web-vitals'),
];
