/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const path = require('path');

// For GitHub Pages:
// - If repo is "username.github.io", leave basePath empty (deploys to root)
// - Otherwise, set basePath to "/repo-name" (deploys to subdirectory)
// You can set GITHUB_REPOSITORY_NAME env var or it will default to root
const repositoryName = process.env.GITHUB_REPOSITORY_NAME || '';
const basePath = repositoryName ? `/${repositoryName}` : '';

const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Enable static site export
  basePath: basePath, // GitHub Pages subdirectory support
  assetPrefix: basePath, // Ensure assets load correctly
  images: {
    unoptimized: true, // Required for static export
  },
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support for Transformers.js
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    // Handle .node files with null-loader FIRST (before any other rules)
    if (!config.module.rules) {
      config.module.rules = [];
    }
    config.module.rules.unshift({
      test: /\.node$/,
      use: 'null-loader',
    });
    
    // Replace optional dependencies with empty modules (we only need text processing, not image processing)
    const optionalModules = ['onnxruntime-node', 'sharp'];
    
    // Add aliases for all optional modules
    config.resolve.alias = {
      ...config.resolve.alias,
      ...optionalModules.reduce((aliases, module) => {
        aliases[module] = path.resolve(__dirname, 'lib/empty-module.js');
        return aliases;
      }, {}),
    };
    
    // Use NormalModuleReplacementPlugin for all optional modules
    optionalModules.forEach(module => {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          new RegExp(`^${module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
          path.resolve(__dirname, 'lib/empty-module.js')
        )
      );
    });
    
    // Handle onnxruntime-node differently for server vs client
    if (!isServer) {
      // On client: ignore .node files
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource(resource) {
            // Ignore all .node files (check full path)
            if (/\.node$/.test(resource)) {
              return true;
            }
            // Ignore onnxruntime-node module and its paths
            if (/onnxruntime-node/.test(resource)) {
              return true;
            }
            return false;
          },
        })
      );
    }
    
    // Prevent webpack from resolving .node files
    if (!config.resolve.extensions) {
      config.resolve.extensions = [];
    }
    // Remove .node from extensions if it exists
    config.resolve.extensions = config.resolve.extensions.filter(ext => ext !== '.node');
    
    // Handle Node.js built-ins
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    return config;
  },
};

module.exports = nextConfig;

