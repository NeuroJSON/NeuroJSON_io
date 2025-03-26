module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        path: require.resolve("path-browserify"),
      };

      webpackConfig.module.rules.push({
        test: /\.js$/,
        parser: {
          requireEnsure: false, // Prevents Webpack from treating require() as a critical dependency
        },
      });

      webpackConfig.ignoreWarnings = [/the request of a dependency is an expression/];

      return webpackConfig;
    },
  },
};
