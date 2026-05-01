module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@api':        './src/api',
            '@components': './src/components',
            '@hooks':      './src/hooks',
            '@navigation': './src/navigation',
            '@screens':    './src/screens',
            '@store':      './src/store',
            '@types':      './src/types',
            '@utils':      './src/utils',
          },
        },
      ],
    ],
  };
};
