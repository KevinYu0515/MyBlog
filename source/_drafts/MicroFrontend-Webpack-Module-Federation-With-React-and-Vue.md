---
title: 'MicroFrontend: Webpack Module Federation With React and Vue'
toc: true
cover: /gallery/covers/default.jpg
date: 2025-02-07 11:58:23
tags: ["webpack", "react", "vue"]
categories: ["Develop", "Web"]
excerpt: 使用 Webpack 5 的 Module Federation Plugin 整合多個 React 應用與靜態 Vue 應用，初步探索微前端架構。
---

## MicroFrontend

## 整合多個 React Application

首先來把 React Application 整合進 Host Application，如下可以看見這個 Application 提供兩個 components（Card、Filter）
<div style="text-align: center">
  <img src="/gallery/2025-02-07/image1.png" alt="react application tree graph"/>
</div>

進到 `webpack.config.js`，引入 `ModuleFederationPlugin`，並加進 plugin 設定，並寫入以下設定
{% codeblock webpack.config.js %}
const { ModuleFederationPlugin } = require("webpack").container;
module.exports = {
    // other settings
    plugins: [
        new ModuleFederationPlugin({
            name: "widget",
            filename: "remoteEntry.js",
            exposes: {
                "./Card": "/src/components/Card.jsx",
                "./Filter": "/src/components/Filter.jsx"
            }
        })
    ]
}
{% endcodeblock %}

接著到 Host Application，一樣修改 `webpack.config.js` 來引入外部套件，需要從 name 為 widget 的 react application 透過 URL 的方式引入被公開的 component，而這些 component 會透過 webpack 被壓縮進 `remoteEntry.js` 這個檔案中，所以我們只需要將這個檔案引入進來，最後標記這些檔案為 widgetHost。

{% codeblock webpack.config.js %}
const { ModuleFederationPlugin } = require("webpack").container;
module.exports = {
    plugins: [
        new ModuleFederationPlugin({
            name: "MFHost",
            filename: "remoteEntry.js",
            remotes: {
                "widgetHost": "widget@http://localhost:7001/remoteEntry.js"
            }
        })
    ]
}
{% endcodeblock %}

在 Host Application 要使用這些 component 需要透過懶加載的方式載入，並搭配 Suspense 來額外增加載入畫面，載入的 Component 名稱需要對應被打包時向外公開的名稱，在這裡是 Card，所以要引入的 Component 來源是 'widgetHost/Card'，至於要指定的變數名稱對程式運行沒有影響，為了方便所以也是取名為 Card。

{% codeblock %}
import React, { Suspense, lazy } from "react";
const Card = lazy(() => import('widgetHost/Card'));

const CardDisplay = (props) => {
    
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <div className="container">
                <Card key={index} data={item} />
            </div>
        </Suspense>
    )
}
{% endcodeblock %}

## 整合靜態 Vue Application

如果想要把 Vue Application 的 Component 整合進來，透過 webpack module federation 的方式，可以整合進 Host Application，但是無法與 Host Application 的其他 Component 作 Communication，也就是沒辦法經由 props/emits 溝通，不確定是有缺什麼，但目前測試上行不通。而以下是本篇整合的 Vue Application
<div style="text-align: center">
  <img src="/gallery/2025-02-07/image2.png" alt="vue application tree graph"/>
</div>

我們接著把 bookmark.vue 整合進 Host Application，先看一下這個 component 的結構是沒有接收任何的 props，不過有沒有 props 都不影響整合。

{% codeblock %}
<script setup>
import { ref } from "vue";
const mark = ref("Your Game");
</script>

<template>
    <div class="bookmark-box">
        <div class="flat-btn btn">{{ mark }}</div>
    </div>
</template>
{% endcodeblock %}

看到 webpack 設定，name 設為 vueApp，但這次要公開的檔案不是 component 檔案，而是 index.js

{% codeblock webpack.config.js %}
const { ModuleFederationPlugin } = require("webpack").container;
module.exports = {
    plugins: [
        new ModuleFederationPlugin({
            name: "vueApp",
            filename: "remoteEntry.js",
            exposes: {
                "./Display": "/src/components/bookmark/index.js"
            }
        })
    ]
}
{% endcodeblock %}

至於 index.js 在作什麼，可以看到主要是輸出 mount 這個 function 用來將 vue 掛載到 DOM 上

{% codeblock %}
import { createApp } from 'vue';
import App from './bookmark.vue';

let currentApp = null;

const mount = (el) => {
    if (currentApp) {
        currentApp.unmount();
    }
    
    currentApp = createApp(App);
    currentApp.mount(el);
}

export { mount };
{% endcodeblock %}

回到 Host Application 的 webpack，與之前的引入方式相同，只不過這次 name 為 vueApp，並將引入的檔案名稱改為 vueHost

{% codeblock webpack.config.js %}
const { ModuleFederationPlugin } = require("webpack").container;
module.exports = {
    plugins: [
        new ModuleFederationPlugin({
            name: "MFHost",
            filename: "remoteEntry.js",
            remotes: {
                "widgetHost": "widget@http://localhost:7001/remoteEntry.js",
                "vueHost": "vueApp@http://localhost:7002/remoteEntry.js"
            }
        })
    ]
}
{% endcodeblock %}

在 Host Application 使用 vue Component 的方式如下，把 mount function 引入後，搭配 useRef 掛載到 DOM 上，接者作為 react Componet 輸出，之後的使用方式與 react 一樣，但就是沒有辦法使用 props 功能。

{% codeblock %}
import React, {useEffect, useRef} from 'react';
import { mount } from "vueHost/Display";

const Gamemark = () => {
    const ref = useRef(null);

    useEffect(() => {
        mount(ref.current);
    }, []);

    return (
        <div ref={ref}></div>
    )
}

export default Gamemark;
{% endcodeblock %}

## 總結

## 資料來源

[Micro Frontends Crash Course with React & Webpack 5 Module Federation](https://www.youtube.com/watch?v=qkaTFb7mOb4&list=PLrJ-e9wsoQTHueC5ub1sTvrFXitczXNdi&index=1)
[Integrating Microfrontends with Vue.js and React Using Webpack 5 Module Federation](https://www.youtube.com/watch?v=bBm6D3R7NN8&list=PLrJ-e9wsoQTHueC5ub1sTvrFXitczXNdi&index=2)