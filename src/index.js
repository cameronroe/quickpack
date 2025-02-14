import path from 'path'
import fs from 'fs'
import webpack from 'webpack'
import autoprefixer from 'autoprefixer'
import DefinePlugin from 'webpack/lib/DefinePlugin'
import ExtractTextPlugin from 'extract-text-webpack-plugin'
import HotModuleReplacementPlugin from 'webpack/lib/HotModuleReplacementPlugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import LoaderOptionsPlugin from 'webpack/lib/LoaderOptionsPlugin'
import ProgressPlugin from 'webpack/lib/ProgressPlugin'
import UglifyJsPlugin from 'webpack/lib/optimize/UglifyJsPlugin'
import WebpackMd5Hash from 'webpack-md5-hash'

export default (options = {}, env) => {

  // accept first arg as process.env.NODE_ENV
  env = (typeof options === 'string') ? options : env

  const ENV_DEVELOPMENT = env === 'development'
  const ENV_PRODUCTION = env === 'production'
  const ENV_TEST = env === 'test'
  const HOST = '0.0.0.0'
  const PORT = 3000

  //=========================================================
  //  CONFIG
  //---------------------------------------------------------
  const config = {}
  const extensions = ['.js', '.json', '.css', '.scss']
  const rules = {
    js: {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'},
    json: {test: /\.json$/, loader: 'json-loader'},
    scss: {test: /\.(scss|css|sass)$/, loader: 'style-loader!css-loader!postcss-loader!sass-loader'},
    woff: {test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'url-loader?limit=10000&mimetype=application/font-woff'},
    file: {test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader'}
  }

  config.resolve = {
    extensions,
    modules: [
      path.resolve(options.context || './src'),
      path.resolve(__dirname, '../node_modules'),
      path.resolve(options.context || './src', '../node_modules'),
    ]
  }

  config.resolveLoader = {
    modules: [
      path.resolve(options.context || './src'),
      path.resolve(__dirname, '../node_modules'),
      path.resolve(options.context || './src', '../node_modules'),
    ]
  }
  
  if (options.target) {
    config.target = options.target
  }

  config.module = {
    rules: [
      rules.js,
      rules.woff,
      rules.file
    ]
  }

  config.plugins = [
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env)
    }),
    new LoaderOptionsPlugin({
      debug: false,
      minimize: ENV_PRODUCTION,
      options: {
        postcss: [
          autoprefixer({browsers: ['last 3 versions']})
        ],
        sassLoader: {
          outputStyle: 'compressed',
          precision: 10,
          sourceComments: false
        }
      }
    })
  ]

  //=====================================
  //  DEVELOPMENT or PRODUCTION
  //-------------------------------------
  if (ENV_DEVELOPMENT || ENV_PRODUCTION) {
    const standard = { main: ['./src/index.js'] }

    if (options.entry && options.entry.main && typeof options.entry.main === 'string') {
      options.entry.main = [
        options.entry.main
      ]
    }

    config.entry = options.entry ? Object.assign({}, standard, options.entry) : standard

    config.output = {
      filename: '[name].js',
      path: path.resolve(options.context || './dist'),
      publicPath: '/'
    }
    
    // check if there's a src/index.html and create one if not
    const htmlFile = path.resolve((options.context || ''), './src/index.html')
    if (!fs.existsSync(htmlFile)) {
      throw new Error('Could not find index.html in root src/ directory. Please add one and try again.')
    }
    
    const html = (typeof options.html === 'string') ? {
      filename: 'index.html',
      hash: false,
      inject: 'body',
      template: options.html || './src/index.html'
    } : Object.assign({
      filename: 'index.html',
      hash: false,
      inject: options.inject || 'body',
      template: './src/index.html'
    }, options.html)

    config.plugins.push(
      new HtmlWebpackPlugin(html)
    )

    // add user's plugins
    config.plugins = (options.plugins && options.plugins.length > 0) ? config.plugins.concat(options.plugins) : config.plugins

  }

  //=====================================
  //  DEVELOPMENT
  //-------------------------------------
  if (ENV_DEVELOPMENT) {
    config.devtool = options.devtool || 'cheap-module-source-map'

    config.entry.main.unshift('react-hot-loader/patch')

    config.module.rules = config.module.rules.concat([
      rules.json,
      rules.scss
    ])

    config.plugins.push(
      new HotModuleReplacementPlugin(),
      new ProgressPlugin()
    )

    config.devServer = {
      contentBase: options.context || './src',
      historyApiFallback: true,
      host: HOST,
      hot: true,
      port: PORT,
      stats: {
        cached: true,
        cachedAssets: true,
        chunks: true,
        chunkModules: false,
        colors: true,
        hash: false,
        reasons: true,
        timings: true,
        version: false
      }
    }
  }

  //=====================================
  //  PRODUCTION
  //-------------------------------------
  if (ENV_PRODUCTION) {
    config.devtool = 'hidden-source-map'

    config.entry.main.unshift('babel-polyfill')

    config.output.filename = '[name].[chunkhash].js'
    
    config.module.rules.push(rules.json)
    config.module.rules.push({
      test: rules.scss.test,
      loader: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: 'css-loader?-autoprefixer!postcss-loader!sass-loader'
      })
    })

    config.plugins.push(
      new WebpackMd5Hash(),
      new ExtractTextPlugin('styles.[contenthash].css'),
      new UglifyJsPlugin({
        comments: false,
        compress: {
          dead_code: true, // eslint-disable-line camelcase
          screw_ie8: true, // eslint-disable-line camelcase
          unused: true,
          warnings: false
        },
        mangle: {
          screw_ie8: true  // eslint-disable-line camelcase
        }
      })
    )
  }

  //=====================================
  //  TEST
  //-------------------------------------
  if (ENV_TEST) {
    config.devtool = 'inline-source-map'

    config.module.rules.push(
      rules.json,
      rules.scss
    )

    let standard = {
      'jsdom': 'window',
      'react/addons': true,
      'react/lib/ExecutionEnvironment': true,
      'react/lib/ReactContext': true
    }

    config.externals = options.externals ? Object.assign({}, standard, options.externals) : standard

  }

  return config

}