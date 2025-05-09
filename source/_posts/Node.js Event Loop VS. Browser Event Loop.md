---
title:       "Node.js Event Loop VS. Browser Event Loop"
subtitle:    "討論 JavaScipt 在不同環境下的事件迴圈如何處理非同步事件"
excerpt:     "採用動畫方式並帶入範例程式碼說明 Browser Event Loop 和 Node.js Event Loop 是如何處理非同步事件，以釐清 JavaScript 的非同步事件原理"
date:        2023-08-01
tags:        ["javascript"]
categories:  ["System Arch"]
cover: /gallery/covers/default.jpg
toc: true
---
## 同步與非同步
同步的意思是一次只處理一次事件，而非同步的意思是同時多個事件一起處理。如下
### 同步執行
同步執行就是將程式碼一行一行執行下來
```javascript
console.log("Beginning")
console.log("Hello World")
console.log("Ending")
```
執行結果：  
Beginning  
Hello World  
Ending  

### 非同步執行
非同步執行就是同時執行多個程式碼，而 setTimeout 就是個非同步執行的程式碼，我們稱之為非同步事件，你可以發現輸出結果，竟然是先打印出 `End`，再打印出 `Hello World`。直觀的想不是應該要等待 0 秒後就直接打印出來嗎？這個問題於之後會解答
```javascript
console.log("Beginning")
setTimeout(() => {
    console.log("Hello World")
}, 0)
console.log("Ending")
```
執行結果：  
Beginning   
Ending  
Hello World 

了解甚麼是同步與非同步之後，其實有一個 Bug 就是 JavaScript 是單執行續的程式，她沒有其他的執行緒能使用啊，到底是如何做到非同步的效果。這就與 JavaScript 的環境和 JavaScipt 的事件佇列有關，而這樣對事件處理的過程就稱為 Event Loop。接下來將會對 JavaScript 在瀏覽器環境下的 Event Loop 和 Node.js 環境下的 Event Loop 去做講解。

## JavaScipt 在 Browser 上使用
在 Browser 環境下，遇到非同步事件的處理過程如下：
![Event Loop on Browser](https://i.postimg.cc/g2zY4scb/Event-Loop13.png)

### 名詞介紹
#### Call Stack
Call Stack 的角色就是執行緒，將要被執行的程式放入 Call Stack，接著在由上往下執行
- 同步事件立刻執行
- 非同步事件放到 Callback Queue 等待下一次執行
#### Web Apis
Web Apis 的角色就是補充包，若在 Call Stack 中出現 Web Apis 可支援的方法，如：setTimeout，則從 Web Apis 取出放入 Callback Queue 等待下一次執行
#### Callback Queue
Callback Queue 的角色就是事件佇列，所有非同步事件會先被放入這裡，等待 Call Stack 清空後，再將裡面的所有程式放入 Call Stack

### 流程說明
#### Demo 1
說明：非同步呼叫 web apis 的流程

```javascript
const A = () => console.log("Beginning")
const B = () => console.log("Ending")
const C = () => console.log("Function C")
const D = () => console.log("Function D")

console.log("Beginning")
setTimeout(() => D(), 300)
setTimeout(() => C(), 100)
console.log("Ending")
```
---
**執行結果：**  
Beginning  
Ending  
Function C  
Function D 

**圖解說明：**
![Demo 1](https://i.postimg.cc/cJMRzjHh/DEMO-1.gif)
1. Function A 是同步事件，所以直接執行
2. setTimeout 是非同步事件，呼叫 web Apis
3. Function B 是同步事件，所以直接執行
4. setTimout 先完成的先放入 Callback queue，所以是 Function C 和 Function D
5. Call Stack 清空後，將 Function C、Function D 放入
6. Function C 和 Function D 都是同步事件，所以依序執行
7. Callback Queue 清空，程式結束

####  Demo 2
說明：同時使用 Promsie 與 web apis 的執行順序

```javascript
const A = () => console.log("Beginning")
const B = () => console.log("Ending")
const C = () => console.log("Function C")
const D = () => console.log("Function D")
const E = () => console.log("Function E")

console.log("Beginning")
setTimeout(() => C(), 0)
new Promise(function(resolve, reject) {
    D()
    resolve('resolve')
}).then(result => {
    E()
})
console.log("Ending")
```
---
**執行結果：**  
Beginning  
Function D   
Ending  
Function E  
Function C 

![Demo 2](https://i.postimg.cc/vTbxLGfM/DEMO-2.gif)
1. Function A 是同步事件，所以直接執行
2. setTimeout 是非同步事件，呼叫 web Apis
3. Promise 是同步事件，所以直接執行
4. 但是 Promise 的 resolve 和 recject 結果則是非同步事件，所以放入 Callback queue
4. setTimout 放入 Callback queue
5. Call Stack 清空後，將 Function E、Function C 放入
6. Function E 和 Function C 都是同步事件，所以依序執行
7. Callback Queue 清空，程式結束

## JavaScript 在 Node.js 上使用
JavaScript 在 Node.js 環境下，和 Browser 環境不同的是，沒有 web apis 可以呼叫，但可以呼叫 node.js 的內建方法，此外還加入了 I/O 操作和 process object 的概念，所以使得非同步事件的處理更為複雜。不過基本上 Event Loop 沒有太大變化，只是多了非同步事件的優先順序要判斷而已，接下來要介紹非同步事件種類的處理順序

![Node.js Event Loop 流程說明](https://i.postimg.cc/wTBSxPbb/Event-Loop-111.png)
### 名詞介紹
#### nextTick Queue
此 queue 的優先級別最高
`process.nextTick()` 的 `callback function` 都會來這裡
#### microTask Queue
此 queue 的優先級別第二高
`resolve` 或 `reject` 所執行的 `callback function` 會被排在這裡
#### macroTask Queue
當上面兩種 queue 都清空時，才會開始跑這些事件
- timers：處理計時器相關的事件，例如 `setTimeout` 和 `setInterval` 設定的事件
- pending callbacks：處理一些系統級別的回調
- idle、prepare：node.js 內部使用
- poll：查詢 I/O 操作的事件，例如讀取文件，網路請求等
- check：處理 `setImmediate()` 設定的事件
- close callbacks：處理一些關閉事件的回調
### 流程說明
#### Demo 1
說明：多種非同步事件執行順序

```javascript
console.log("Beginning")
 
process.nextTick(function() {
  console.log('nextTick1');
});
 
setTimeout(function() {
  console.log('setTimeout');
}, 0);
 
new Promise(function(resolve, reject) {
  console.log('promise');
  resolve('resolve');
}).then(function(result) {
  console.log('promise then');
})

(async function() {
  console.log('async');
})();
 
setImmediate(function() {
  console.log('setImmediate');
});
 
process.nextTick(function() {
  console.log('nextTick2');
});
 
console.log('Ending');
```
---
**執行結果：**  
Beginning  
promise  
async  
Ending  
nextTick1  
nextTick2  
promise then  
setTimeout  
setImmediate  

![Demo 1](https://i.postimg.cc/Bv5HXJhT/DEMO-3.gif)
1. Beginning 是同步事件，直接執行
2. nextTick1 代表下一次的執行序，所以放到 nextTick Queue
3. setTimeout 是非同步事件，放到 macroTask Queue
4. Promise 是同步事件，所以直接執行
5. 但是 Promise 的 resolve 結果要放到 microTask Queue
6. async 是同步事件，直接執行
7. setImmediate 是非同步事件，放到 macroTask Queue
8. nextTick2 代表下一次的執行序，所以放到 nextTick Queue
9. Ending 是同步事件，直接執行
10. 從 nextTick Queue 開始取出放入 call Stack，接著反覆執行直到 nextTick Queue 是空的
11. 從 microTask Queue 開始取出放入 call Stack，接著反覆執行直到 microTask Queue 是空的
12. 若 nextTick Queue 和 micro Task Queue 都清空後，才從 macroTask Queue 開始取出放入 call Stack
13. 反覆執行直到所有 Queue 和 Stack 清空為止
#### Demo 2
說明：當非同步事件中又有其他非同步事件時的執行順序

```javascript
console.log("Beginning")
 
process.nextTick(function() {
    console.log("nextTick1")
    process.nextTick(() => {
        console.log("nextTick2")
    })
});

setTimeout(function() {
    new Promise(function(resolve, reject) {
        console.log('promise');
        resolve('resolve');
      }).then(result => {
        process.nextTick(() => {
            console.log("nextTick3")
        })
      }).then(result => {
        console.log('promise then');
      })
    console.log('setTimeout');
}, 0);

console.log('Ending');
```
---
**執行結果：**  
Beginning  
Ending      
nextTick1  
nextTick2  
promise  
setTimeout  
promise then  
nextTick3  

![Demo 2 層層包裝的非同步事件](https://i.postimg.cc/HxPRCNxG/DEMO-4.gif)
1. Beginning 是同步事件，直接執行
2. nextTick1 代表下一次的執行序，所以放到 nextTick Queue
3. setTimeout 是非同步事件，放到 macroTask Queue
4. Ending 是同步事件，直接執行
5. 從 nextTick Queue 取出，nextTick1 執行，遇到 nextTick2 放入 nextTick Queue
6. 從 nextTick Queue 取出，nextTick2 執行
7. 由於 nextTick Queue 和 microTask Queue 都是空的，所以從 macroTask Queue 取出
8. setTimeout 執行，遇到 Promise 先執行，因為 Promise 創建時是同步事件，接著將 resolve 放入 microTask Queue
9. setTimout 繼續執行打印出 setTimout
10. 從 microTask Queue 取出，先遇到 nextTick3 放入 nextTick Queue，繼續執行打印出 promise then
11. 從 nextTick Queue 取出 nextTick3 執行
12. 所有的 stack 和 queue 都清空，程式結束

## 總結
JavaScript 是藉由 call Stack (單執行緒) 和 callback Queue (事件佇列) 實現多執行緒的效果。在 Browser 中，非同步事件主要與 web 有關，所以會需要經常從 web Apis 呼叫所需要的方法。而 Node.js 中，非同步事件的種類更為複雜，所以設計了 nextTick Queue、microTask Queue 和 macroTask Queue 等 callback Queue 的設計來分類處裡，所以只要弄清楚現在的非同步事件是甚麼類型，就可以搞懂那些奇怪的輸出結果。

但仔細想想非同步事件只是重新安排程式的處理順序而已，並沒有比較快。沒錯，只是被重新安排的程式不會是非同步事件本身，而是非同步事件內的其他程式，如下：
```javaScript
setTimeout(() => console.log("Hello"), 2000)
```
當我們遇到了 `setTimeout` 這個非同步事件，我們會讓他開始計時兩秒，接著跳過繼續執行下一個程式。當計時結束時，才會把 console 放入事件佇列，所以被重新安排的其實是 console 這個程式，而不是把 setTimeout 整個放到最後執行

簡單來說就是讓這個非同步程式先開始執行，如連結資料庫，抓取 api，計時等，當程式執行完的結果就放到事件佇列等待。因此在處理較耗時的程式時，就不容易造成程式堵塞，建議在較大型、複雜的應用上，能採用非同步事件的設計來加速程式運作的過程。

## 資料來源
---
- [完全圖解 Node.js Event Loop](https://notes.andywu.tw/2020/%e5%ae%8c%e6%95%b4%e5%9c%96%e8%a7%a3node-js%e7%9a%84event-loop%e4%ba%8b%e4%bb%b6%e8%bf%b4%e5%9c%88/)  
- [JavaScript Event Loop](https://ithelp.ithome.com.tw/articles/10230871)