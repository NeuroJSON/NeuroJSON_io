module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        webpackConfig.resolve.fallback = {
          ...webpackConfig.resolve.fallback,
          path: require.resolve("path-browserify"),
        };
        return webpackConfig;
      },
    },
  };
  