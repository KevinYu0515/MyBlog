---
title: WebAssembly 入門：在 Browser 上跑 C Code 是怎麼回事
toc: true
cover: /gallery/covers/default.jpg
date: 2025-05-30 11:49:00
tags:
    - wasm
    - javascript
categories: ["System Arch"]
excerpt: "WebAssembly 讓瀏覽器能執行像是影像處理、遊戲引擎、甚至 AI 推論等原本只能在原生平台實現的功能，從如何執行 C Code 開始，一步步了解這神奇又大膽的實現吧"
---

## 前言

起因最開始是打 ctf 的 web 題時越來越常出現 WebAssembly 相關的題目，加上自己也好奇這種題目會不會很難設計，於是有了這篇的存在。這篇主要紀錄什麼是 WebAssembly、相關成熟的應用，接著聚焦於 Browser 方面的使用，最後再介紹後續研究 WebAssembly 可能的方向。

## 什麼是 WebAssembly

簡單來說，WebAssembly 提供了一種 binary format 允許從各種程式語言（最早以編譯式語言為主，如 C/C++），建立出可移植性高的可執行檔，其具有相對較高的安全性，並且因為是貼近 machine code 的方式執行，所以速度也相對高階語言快上不少。而這個設計方式因為可以讓 Browser 上執行 C/C++ Code，所以被稱為 WebAssembly，當然這也是其受到關注的原因。

而近年來 LLM 推論等 AI 應用蓬勃發展，透過容器化方式建立這些推論應用可見其缺點如下
- GB 量級的 image
- Cold Start 難以優化的問題

所以我認為 WebAssembly 是個可能的方案，提供一個沙盒環境來開發這些 AI 應用，可以轉化為 MB 量級的執行檔並兼顧安全性，外加實現 JIT 的推論回應，如 [LIamaEdge](https://github.com/LlamaEdge/LlamaEdge) 就是為此誕生的例子。

### 相關應用

當然 WebAssembly 不只可以應用於 AI 發展上，回到一開始說的，WebAssembly 原本是為了能在 Browser 上實現各種原本需要依靠大量運算的技術，在圖形、3D 渲染方面，影片、多媒體的領域上，甚至是線上遊戲的發展都有相關成熟的應用
- 圖形、3D 渲染：Figma、Google Earth
- 影片、多媒體：ffmpeg.wasm
- 線上遊戲：wasm4、pygbag

而因為 WebAssembly 安全性高，所以也因此產生許多 sandbox 例子，如 python sandbox 的 pyodide、或是可以模擬 nodejs 的 NodeVM。

### 使用情境

通常 WebAssembly 可以拆成兩大情境，一個是 Browser 架構，一個是 Server 架構
![WebAssembly with Browser](/gallery/2025-05-30/01.png)
![WebAssembly with Server](/gallery/2025-05-30/02.png)

唯一相異的點在於 WebAssembly Runtime 的實現方式，在 Browser 的部分是交給 V8 處理，而 Server 就需要自己安裝，常見的 Runtime 如下
- Wasmtime：一個高效能的 WASM Runtime，通常使用於　browser 和 server
- WasmEdge：一個輕量化的 WASM Runtime，為嵌入式裝置、IoT 應用設計
- Subtle：由 Rust 所寫，強調安全性的 WASM Runtime

而這次我先聚焦於在 Browser 上執行 WebAssembly 這回事，至於其他 Runtime 就不多作敘述，那麼有了執行環境之後，就是需要有 WebAssembly Module，通常會使用 `Emscripten` 來協助轉換 C/C++ Code。

## 在 Browser 上執行 WebAssembly

那麼 `Emscripten` 是什麼，這是一個由 Mozilla 開發人員開發出來將 C/C++ Code 轉換成 WebAssembly 的工具，在早期實現 Browser 上跑 C/C++ Code 這件事時，是先轉換成 `asm.js` 一個精簡的 JavaScript 子系列，後來為了能支援更多語言並且更有效的發揮出原本語言的優勢，所以才轉換為 WebAssembly。

### Emscripten

那麼就來安裝 Emscripten 吧

```bash
git clone https://github.com/emscripten-core/emsdk.git
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

這些指令成功執行後應該會生成一個 `.emscripten`，並且將 `emcc` 寫入環境變數讓我們可以使用這個指令。

接著使用這個指令就可以將目標 C Code 轉換為 `.wasm`

```bash
emcc [input file] -Os -sWASM=1 -sSIDE_MODULE=1 –o [ouput file]
```

這邊提供一個簡單的 C Code
```c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int square (int x) {
  return x * x;
}

int add(int a, int b) {
  return a + b;
}
```

### Wabt

有了 wasm，我們可以將其從 binary format 轉成 text format 來讀解其中內容，這邊推薦一個 WebAssembly 開發實用的工具 [The WebAssembly Binary Toolkit(Wabt)](https://github.com/WebAssembly/wabt)

```bash
wasm2wast [wasm file] -o [wst file]
```

轉換出來的 `.wst` 會長的像這樣，雖然不是像高階語言那麼好理解，但至少可以從部分關鍵字看出大概內容，如 `(export "_square" (func 0))` 就是輸出 `_square` 這個 function

```
(module
  (type (;0;) (func (param i32) (result i32)))
  (type (;1;) (func))
  (import "env" "memoryBase" (global (;0;) i32))
  (import "env" "memory" (memory (;0;) 256))
  (import "env" "table" (table (;0;) 0 anyfunc))
  (import "env" "tableBase" (global (;1;) i32))
  (func (;0;) (type 0) (param i32) (result i32)
    get_local 0
    get_local 0
    i32.mul)
  (func (;1;) (type 1)
    nop)
  (func (;2;) (type 1)
    block  ;; label = @1
      get_global 0
      set_global 2
      get_global 2
      i32.const 5242880
      i32.add
      set_global 3
      call 1
    end)
  (global (;2;) (mut i32) (i32.const 0))
  (global (;3;) (mut i32) (i32.const 0))
  (export "__post_instantiate" (func 2))
  (export "_square" (func 0))
  (export "runPostSets" (func 1)))
```

除此之外，這個工具包也提供其他指令，如 `wasm2c`、`wasm-decompile`，等實用的指令幫助我們進一步生成 C Code 和反編譯。

### JS with WebAssembly API

那有了 `.wasm`，我們要想透過 JavaScript 在 Browser 上調用這個 Module，這邊會需要用到一個東西叫做 `WebAssembly API`，這允許我們以 JavaScript 語法將 `.wasm` 實例化成物件來調用內部的 function。

總共有兩個步驟
1. 生成 `WebAssembly.Module` 物件
2. 將 `WebAssembly.Module` 物件初始化為 `WebAssembly.Instance` 物件

這樣就可以透過這樣的方式調用

```javascript
(async () => {
  const res = await fetch("square.wasm");
  const wasmFile = await res.arrayBuffer();
  const module = await WebAssembly.compile(wasmFile);
  const instance = await WebAssembly.instantiate(module);

  const square = instance.exports.square(13);
  console.log(square);
})();
```

不過 C/C++ Code 需要使用陣列或是 `Struct` 的時候，我們需要手動分配記憶體，在 API 中可以透過 `WebAssembly.Memory` 來配置 `ArrayBuffer` 或是與 JavaScript 共享的 `SharedArrayBuffer`。

除此之外，還提供了一些蠻方便 debug 的其他功能
- WebAssembly.Table：JavaScript 可以用來控制 WebAssembly 的 Function。
- WebAssembly.Global：當多個 module 協作時，此物件可用來被多個 module 和 JavaScript 共用。
- WebAssembly Error：例外處理機制
    - WebAssembly.CompileError
    - WebAssembly.LinkError
    - WebAssembly.RuntimeError

那麼要有效操控 module，最好的方法就是將其包裝成 `function`，這樣我們能較方便管理 `memory` 和 `table` 的配置

```javascript
    function loadWebAssembly(filename, imports = {}) {
    return fetch(filename)
        .then(response => response.arrayBuffer())
        .then(buffer => {
        imports.env = imports.env || {}
        Object.assign(imports.env, {
            memoryBase: 0,
            tableBase: 0,
            __memory_base: 0,
            __table_base: 0,
            memory: new WebAssembly.Memory({ initial: 256, maximum: 256 }),
            table: new WebAssembly.Table({ initial: 0, maximum: 0, element: 'anyfunc' })
        })
        return WebAssembly.instantiate(buffer, imports)
        })
        .then(result => result.instance )
    }
```

![result 1](/gallery/2025-05-30/03.png)

有趣的一點的是，透過 WebAssembly 執行的結果會延續原有語言的特性，所以就會出現以下結果

![result 2](/gallery/2025-05-30/04.png)

## 後續

玩完 Browser 的 WebAssembly，最後來談談 WebAssembly 在 Server 端的發展，除了有更多的 Runtime 可以選擇之外，如何與 OS 構通也是一個複雜的問題，而 WASI 正式為此誕生的存在，此外將 WebAssembly 與 Docker 協作的例子也不少。

WASI（WebAssembly System Interface）提供一組標準的 API，讓 WebAssembly 模組能在沒有瀏覽器的環境下，與檔案系統、網路、時間等作業系統資源安全地互動。這讓 WebAssembly 不再只是瀏覽器內的玩具，而是真正具備跨平台、可攜性與安全性的「輕量執行單元」。

在 Server 端的使用場景中，許多雲端平台或邊緣運算服務，開始將 WebAssembly 視為替代傳統容器的潛力選項。例如 Wasmtime、Wasmer、WasmEdge 等 Runtime，都能在無需完整容器的情況下，快速啟動 WebAssembly 模組並提供沙箱級別的隔離。

此外，WebAssembly 與 Docker 的整合也逐漸成熟，像是透過 `wasm-to-oci` 專案，可以將 WebAssembly 模組包裝成 OCI 容器映像檔，透過 Docker CLI 或容器平台部署運行，甚至未來 Docker 也可能直接支援執行 `.wasm` 模組，更簡單的一個例子就是官網有提供一個 image 可以玩玩看

> 不過記得要先開啟 Docker Desktop 上的 `wasm workload`，可以看到這邊的 Runtime 採用的是先前提到的 `wasmedge`

```bash
docker run \
  --runtime=io.containerd.wasmedge.v1 \
  --platform=wasi/wasm \
  secondstate/rust-example-hello
```

這樣的發展讓我們不禁期待，未來的微服務架構中，或許不再是滿滿的容器，而是以 WebAssembly 為單位的模組，提供更快啟動、更少資源、更高安全性的執行環境。


## 參考資料
- [知乎-WebAssembly原理剖析與生產應用](http://zhuanlan.zhihu.com/p/620767652)
- [Xa6p-WebAssembly: Docker без контейнеров](https://habr.com/ru/companies/flant/articles/734678/)
- [完整介紹 WebAssembly API 使用方式](https://tigercosmos.xyz/post/2020/08/js/webassembly-intro/)

最後提一下，這是我用來報告的簡報，不過比較簡明扼要些
- [WebAssembly 入門：在 Browser 上跑 C Code 是怎麼回事@HackerSir StudyGroup](https://speakerdeck.com/yukai0xe/webassembly-ru-men-zai-browser-shang-pao-c-code-shi-zen-mo-hui-shi)
