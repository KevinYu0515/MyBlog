---
title:       "嘗試優化網頁直到 LightHouse 放煙火"
subtitle:    "webpack 新手的網頁優化考古過程"
excerpt:     "本文說明如何使用 react.js + webpack + babel 三件套的方式優化 HTML 5 網頁"
date:        2024-04-25
tags:        ["webpack", "front-end", "react"]
categories:  ["Develop", "Web"]
cover:       /gallery/covers/default.jpg
toc:        true
---

本篇的動機為某次 Web 上課的作業是優化 Free CSS 網站上提供的模板，以 Lighthouse 的評測結果作為評分標準。當時以前端起家的我想說，那豈不是輕輕鬆鬆，但在第一個項目 Performance 的優化上，才發現沒這麼簡單，比如：要壓縮 JS 文檔需要打包工具，也就是 `webpack`、`vite` 這類的前端打包工具。轉念一想，自己好像沒有深入研究過打包工具，所以這篇主要會拆分成兩部分，有使用與未使用打包工具來各個擊破 Lighthouse 提供的問題點。

另外為什麼我選擇 `webpack`，因為 Free CSS 的模板主要以 CommonJS 實現模組功能，這樣就不需要特別設定 ESModule，另外也因為其發展較久，所以網路上的資源相當豐富，學習起來應該不會太難吧，另外在結合 `react.js` 和 `babel`，形成 `react.js` + `webpack` + `babel` 的三件套。

## Performance

這一部分基本上只要 `webpack` 配置的好，就能處理大部分的問題。  
左邊為原本的模板結構，右邊為修改後的結構。  


```bash
D:.
│  404.html
│  about.html
│  booking.html
│  contact.html
│  destination.html
│  index.html
│  package.html
│  service.html
│  team.html
│  testimonial.html
│
├─css
├─img
├─js
└─lib
    ├─animate
    ├─easing
    ├─owlcarousel
    ├─tempusdominus
    ├─waypoints
    └─wow
```

---

```bash
D:.
|
├─dist
├─node_modules
├─public
|   ├─404.html
|   ├─favicon.ico
|   └─index.html
|
├─src
|   ├─assets
|   ├─components
|   ├─css
|   ├─js
|   ├─App.jsx
|   └─index.js
|
├─.babelrc
├─package-lock.json
├─package.json
└─webpack.config.js
```


### 一般屬性

**output**：用來設定打包後輸出的位置

- path：打包後輸出的位置
- filename：打包後的名稱
  - 而這邊 name 就會根據 key 值去生成

```javascript
module.exports = {
    output: {
        path: __dirname + "/dist",
        filename: "[name].js",
    },
}
```

**devServer**：用來設置開發時的測試環境

- static：靜態檔案來源
- compress：是否需要壓縮檔案
- port：開啟的埠口

```javascript
module.exports = {
    devServer: {
        static: path.resolve(__dirname, "dist"),
        compress: true,
        port: 9000,
    },
}
```

**resolve**：這個設定用來描述 module 如何被解析

- alias：可以用來替換使用 `import` 方法的路徑，假如有一個路徑：  
`import 'src/css/style.css'`，就可以透過下面配置換成 `import 'css/style.css'`

```javascript
module.exports = {
    resolve: {
        alias: {
            css: path.resolve(__dirname, "src/css")
        },
    }
}
```

**entry**：抓取 js 的進入點，如下圖所示，會將這些進入點，也就是會使用到的 js 全部打包成 bundle.js

```javascript
module.exports = {
  entry: {
    bundle: [
      "./src/js/main.js",
      ...
    ],
  }
}
```

### Module

- 配置 css 先透過 `css-loader` 處理，接者用 `MiniCssExtractPlugin` 插件壓縮。  
- 配置 js、jsx 則使用 `babel-loader` 加載處理，`babel` 可以處理不同 js 版本的問題
- 打包圖片的部分，`webpack 5` 之前是採用 `file-loader` 或 `url-loader` 處理圖片，而我這次使用的是 `webpack 5`，這是用 `type:asset` 方式配置

```javascript
module.exports = {
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.(js|jsx)/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ['@babel/preset-react', '@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.(png|jpe?g|gif|webp)$/i,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 10 * 1024, // 小於 10 KB 會轉成 base64 的 url
                    }
                },
                generator:{ 
                    filename:'static/images/[name][ext]', // 輸出檔案位置
                },
            },
        ],
    }
}
```

### Plugin

- `HtmlWebpackPlugin`：用來壓縮 html
- `MiniCssExtractPlugin`： 用來壓縮 css
- `BundleAnalyzerPlugin`：檔案打包後的可視化工具

```javascript
module.exports = {
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            filename: 'index.html',
            inject: true,
            minify: true,
        }),
        new MiniCssExtractPlugin(),
        new BundleAnalyzerPlugin()
    ],
}
```

![bundle 可視化結果](/img/2024-04-25/bundle-analysis.png)

### Optiminization

這一部分配置打包優化的設定，主要介紹兩個常用的配置，`TerserPlugin` 插件和 `splitChunks`，最終配置如下

```javascript
module.exports = {
    optimization: {
        splitChunks: {
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    chunks: 'initial',
                    name: 'vendors',
                    enforce: true,
                    priority: 10, // 預設為 0，必須大於預設 cacheGroups
                },
            }
        },
        minimize: true,
        minimizer: [
            new TerserPlugin({
                test: /\.js(\?.*)?$/i,
            })
        ],
    }
}
```

#### TerserPlugin

用來壓縮 js 檔案，安裝指令與使用方式如下

```bash
npm install terser-webpack-plugin --save-dev
```

```javascript
module.exports = {
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                test: /\.js(\?.*)?$/i,
            })
        ],
    }
}
```

#### splitChunks

splitChunks 可以幫助我們拆分 js 檔案，減少單個 bundle 的容量，比如 node_modules 的第三方模組打包成 `vendor.js`，自己開發的 js 模組打包成 `bundle.js`，而這項設定在 webpack4 就被預設開啟，所以不需要另外下載，以下為 splitChunks 的預設配置

```javascript
splitChunks: {
    chunks: 'async',
    minSize: 30000,
    // minRemainingSize: 0, (Webpack 5 才有此選項)
    maxSize: 0,
    minChunks: 1,
    maxAsyncRequests: 6,
    maxInitialRequests: 4,
    automaticNameDelimiter: '~',
    cacheGroups: {
    vendors: {
        test: /[\\/]node_modules[\\/]/,
        priority: -10,
    },
    default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true,
    },
    },
}
```

最重要的是 chunks 和 cacheGroups 的設定，其他設定基本上就是字面的意思

- chunks：async | initial | all
  - async：只處理 lazy loading 的 chunk，如：import(xxx) 語法載入的模組
  - initial：只處理同步加載的 chunk，如：import xxx 語法載入的模組  
  - all：處理以上兩種情況的 chunk

- cacheGroups
  - 定義 chunks 所屬的緩存組
  - {cacheGroups}：緩存組名稱，可由 name 屬性更改
  - cacheGroups.{cacheGroups}.priority：緩存組優先級，默認為 0
  - cacheGroups.{cacheGroups}.test：控制當下緩存組匹配的 chunk，省略它會選擇所有 chunk
  - cacheGroups.{cacheGroups}.filename：僅當 chunk 為同步加載時，才允許覆蓋文件名
  - cacheGroups.{cacheGroups}.enforce：忽略全域的部分選項
  - 補充 1：可以將 caheGroups 當作一個區域，所以當我們在這個區域內配置的 chunks 屬性就不會影響到其他 cacheGroups，也就是說 cacheGroups 彼此的設定是獨立的
  - 補充 2：如果想要避免全域設定的 chunks 影響到 cacheGroups 的設定，可以添加 `enforce` 為 true，這樣就會強制使用 cacheGroups 內的設定

## Accessibillity

### Elements must meet minimum color contrast ratio thresholds

- 這條的問題點希望我們能縮小顏色對比的閥值，使得使用者能更好的閱讀 APP 上的文字。  
- 標準如下：
  - 小型文字 => 4.5:1
  - 大型文字 => 3:1

可以透過這個[**網頁工具**](https://dequeuniversity.com/rules/axe/4.8/color-contrast)來調出適合的閥值

### Links must have discernible text

- 這條問題點可以添加 `aria-label` 屬性來對 link 加以敘述  

更多關於這個問題的[**詳細說明**](https://dequeuniversity.com/rules/axe/4.8/link-name)

## Best Practice

### Uses third-party cookies

- 這條問題點避免使用第三方 cookies
- 解決方法：由於我的第三方 cookies 是來自於 font-awesome 來載入 icon 圖檔，所以我可以將圖檔下載後，以靜態檔案的方式加入。
- 其他方法：
  - 添加 Cookie 屬性 Partitioned，以支援依頂層環境劃分的跨網站 Cookie
  - 使用相關網站集（RWS），說明網站間的關係，使瀏覽器能允許第三方 cookie

更多關於這個問題的[**詳細說明**](https://developers.google.com/privacy-sandbox/3pcd?utm_source=lighthouse&utm_medium=devtools&hl=zh-tw)

## 總結

- 使用 webpack + react.js + babel 優化 Performance
  - 使用到的 webpack 設定如下
    - mode、devtool、entry、resolve.alias、output、devServer
    - module.rules
      - 使用 MiniCssExtractPlugin、css-loader 加載 css
      - 使用 babel-loader 加載 js
      - 使用 webpack5 的內建方式(type: 'asset')打包圖片
    - plugins
      - HtmlWebpackPlugin
      - MiniCssExtractPlugin
      - BundleAnalyzerPlugin：可視化分析 bundle
    - optimization
      - splitChunks
        - chunks、cacheGroups
      - TerserPlugin
- 使用線上工具調整顏色閥值
- Links element 要添加 aria-label 表敘述
- 避免使用第三方 cookies

最後附上一張 Lighthouse 的煙火
![alt](/img/2024-04-25/firework.gif)

## 相關資料

- [webpack documations](https://webpack.js.org/)
- [webpack-splitchunks](https://awdr74100.github.io/2020-04-06-webpack-splitchunksplugin/)
- [webpack5-react-ts](https://github.com/guojiongwei/webpack5-react-ts)
- [web-dev](https://web.dev/?hl=zh-tw)
- [remove-duplicate-modules-in-javascript-bundles](https://www.performance90.com/guide/remove-duplicate-modules-in-javascript-bundles/)
- [Web Vitals 優化方式懶人包](https://gcdeng.com/blog/a-guidebook-to-optimize-web-vitals#largest-contentful-paint-lcp)