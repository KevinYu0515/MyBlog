---
title: 試試 Claw Cloud 的容器化服務是否真的那麼方便
date: 2025-05-16T07:54:50.511Z
tags:
  - PaaS
toc: true
categories: ["Useful Resource"]
excerpt: "Claw Cloud 提供 Web 介面配置容器化服務，在 YT 上被捧上天，至於是不是這麼好用，還得觀察觀察"
cover: /gallery/covers/cloud.jpg
---

以下僅為個人實驗結果，僅供參考

## 沒有免費方案可以蹭了?
截至 5/16 新狀況，原本要來補一些測試結果圖的，但似乎不給單獨配置了，滿頭疑惑之際，剛好看到有個[帖子](https://www.nodeseek.com/post-340499-3)在討論 Claw Cloud Run 容器的 tcp、udp 網路協議不給免費用戶使用，裡面的情況跟我遇到的一樣，要嘛創建 app 的面板不斷跳 "This app can't be used standalone."，要不然就是說沒有憑證不給創建，真的很無言...而 DevBox 也是遇到無法配置的問題，至於其他的類型的服務就沒有進一步測試了。

![alt text](/gallery/2025-05-16/image1.png)

## 一些小嘗試

以下內容為 5/14 的測試結果，如果有用 hobby 或 pro 方案可能會遇到，反正現在 free 方案啥都不能用(´c_`)

###  如何配置 docker compose

想要自己用 Docker Image 部屬，就是使用 Claw Cloud 的 App Launchpad，但問題是，我今天是使用 Docker Compose 來協調兩個 Service，那有沒有某個地方可以讓我貼上 docker compose 一鍵執行，很可惜沒有。

官方有提供一個[參考用例](https://docs.run.claw.cloud/clawcloud-run/migration/migrate-from-docker-compose)，使個 wordpress + db 的需求，他的做法則是將這些服務拆開，wordpress 用 App Launchpad 運行，而 db 則是用另一個叫做 Database 的方式運行，接著在調整網路配置，這樣的舉例，擺明告訴我想要配置 docker compose 就得自己將 service 拆開成單獨的 docker，然後分別建立後再想辦法解決網路問題，因此這樣就對於 docker 技術能力有些要求。

不過我有想到一個奇怪的作法，就是能不能安裝 docker 管理工具，如 portainer，這樣我就能使用 docker compose，讓管理工具幫我配置就好，結果還是太天真了，用 App Launchpad 啟的服務就是個 container，所以 portainer 部屬好後，進入配置畫面，當然沒有任何的環境可以配置，還是得生一台 VM 來配置其他 docker 服務。

此外，我也發現 App Launchpad 提供的 protocol，private network 好像只有 http，所以如果是 https server，就會出現問題，容易發生 `Client sent an HTTP request to an HTTPS server.` 的錯誤。

###  我改在 DevBox 上跑 docker 行不行

直接寫結論，不行，因為他是 rootless，所以根本無法啟用 docker daemon，而現在版本直接不給你選，但創建的時候卻要你選擇執行版本，根本沒打算給你建嘛。

![alt text](/gallery/2025-05-16/image2.png)

話雖如此，如果真的可以建的話，算是一個蠻方便的 IDE 選擇方案，我可以把 Intellij 系列搬到上面，Client 再架設一個 JetBrain Gateway 連線過去就能遠端開發了。

## 總結

果然，天下沒有白吃的午餐，就像之前的 Zeabur，一開始開放使用時，也是一堆免費方案，但現在也是開始需要花點小錢才能使用服務，至於這次的 Claw Cloud 的情況更加糟糕，表面上打著可以有 5 美元的免費額度，但還是甚麼都無法配置，也不確定是不是我的帳號問題，但整體的體驗真的很差，太可惜了。