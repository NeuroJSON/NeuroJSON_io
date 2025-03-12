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
            requireEnsure: false, // Prevents Webpack from complaining about dynamic requires
          },
        });
        return webpackConfig;
      },
    },
  };
  