---
title:       "整合 Discord Slash 指令與 Notion，自動化集中碎片資源"
subtitle:    "n8n - Discord Slash Command X Notion"
excerpt: "使用 n8n 監聽 discord bot 的 slash command 輸入的資源，自動化寫入 Notion 資料庫並分類"
date:        2025-01-23
tags:        ["n8n"]
categories:  ["Workflow Tools"]
cover:       /gallery/covers/default.jpg
toc:         true
---

## 前言

我經常把 discord server 當作自己的筆記本去接收各種新知識，但也就僅止於一個 Link，提醒我有這麼個酷東西，需要的時候再翻來看看，但我想要對這些碎片資源快速做個 overview，並記錄起來，但這樣全部塞在同一個 channel 會導致資料雜亂，剛好最近實驗室告訴我有 n8n 這樣子的自動化工作流工具，可以快速幫我搭建一個收集工作流，將 discord 上面的資料全部儲存進 notion，以後需要找資源時，就不用在 discord 上翻找，可以從資料庫一目瞭然，而且要對這些資源做額外的延伸，就只需要在新頁面繼續紀錄就好，整體更有系統性。

## 架設流程

### 架設 n8n 和申請一個 discord bot

我使用 Zeabur 部署 n8n，當然也可以在自己的 VM 上部屬，但這部分可能要等到我需要集中式管理我的 IT 資產時才有這麼個打算，所以現在就先使用第三方平台幫我快速部屬 n8n，部屬方式如下：

這邊先選取 GCP 的 Free Trial，但只有 24hr 的使用，目前對於我這樣實驗性質的使用不影響，但如果要長期使用的話，建議選擇 AWS Tokyo/Japan，主要是距離最近，傳輸速度會快些，但要另外每個月付 5 美元，其實沒有很多啦。

<div style="text-align: center">
  <img src="/gallery/2025-01-23/001.jpg" width="400" height="800" alt="選擇地區"/>
</div>

接著搜尋 n8n，然後點擊最多下載量的 service 就可以了

<div style="text-align: center">
  <img src="/gallery/2025-01-23/002.jpg" width="400" height="800" alt="選擇 n8n 下載版本"/>
</div>

成功建立 n8n 後，點擊網路並找到網域的欄位，可以使用自訂網域，也可以直接使用 Zeabur 提供的網域，輸入後點擊網址就可以進到 n8n 的工作介面了

![image](/gallery/2025-01-23/003.jpg)

另外還要申請一支 discord bot ，這部分網路資源很多，這邊就不多作介紹

### 為 discord bot 配置 interaction endpoint

以下是 n8n 的 workflow，會對主要邏輯作說明，細項設定請參考最後的設定 json

![image](/gallery/2025-01-23/004.jpg)

首先需要監聽 discord bot 接收到的指令，所以 n8n 開頭的節點為 webhook，點擊設置，先將 Test URL 的 Request 改成 POST 並將這個 URL 貼到 discord bot 的 Interactions Endpoint URL，到此會發現測試會失敗是正常的，因為我們沒有回覆這個 verify。如果要成功設置，根據 [discord develop](https://discord.com/developers/docs/interactions/overview#configuring-an-interactions-endpoint-url) 需要達成兩點

- 成功確認並回傳 PONG 給來自 Discord 的 PING requests
- 驗證 security-related request headers (X-Signature-Ed25519 and X-Signature-Timestamp)

![image](/gallery/2025-01-23/005.jpg)

首先來處理第一點，進入第二個節點，我們要將 request 整理成要用來驗證的資料，也就是（X-Signature-Ed25519 and X-Signature-Timestamp），還有 discord bot 的 publicKey

接著使用一個社群開發的 node 來實現驗證，要引入這個 node 的路徑：Settings > Community nodes > Install > 輸入 n8n-nodes-tweetnacl

![image](/gallery/2025-01-23/006.jpg)

經過驗證後會給一欄位（isVerified）表示是否成功驗證，所以要作 if 判斷，成功就回傳 `{"type": 1}`，失敗就回傳 reponse code 401。

最後這份 interaction endpoint 的 workflow 如下，可以直接引入到 n8n 使用

### 使用 postman 註冊 slash command

成功將 endpoint 加入 disocrd bot 之後就可以來自定義指令了，我們可以使用 postman 向 discord api 註冊一個 slash command 到我們的 discord bot。根據 [postman doc](https://www.postman.com/discord-api/discord-api/request/po6utqg/create-application-command?tab=body) 提供的設置，我們只需要修改 application id、body 和 authorization header。

application id 應該不用解釋，就是 discord bot 的 application id，而 body 我們可以簡化成這樣就好

```json
{
    "name": "link",
    "description": "Add link to Notion",
    "options": [
        {
            "name": "title",
            "description": "Add the Title you want to Notion",
            "required": true,
            "type": 3
        },
        {
            "name": "url",
            "description": "Add the URL you want to Notion",
            "required": true,
            "type": 3
        }
    ]
}
```

最後的 authorization header 要另外添加到 headers，value 為 `BOT [Bot Token]`，雖然 postman 有提供 authorization 的功能，但不知道為甚麼沒有用，所以只好以 header 方式發送就能成功註冊，送出後有回覆 200 或 201 的 response code 就是註冊成功，如果 discord 的指令沒有提示，可以將 bot 踢出後重新邀請試試。

![image](/gallery/2025-01-23/007.jpg)

### 接收 slash command 並寫入 notion

回到 n8n 完成工作流，如下

![image](/gallery/2025-01-23/008.jpg)

我們可以透過 request body 中的 type 來分析是哪種類型的 event，如果 `type = 1`，就是 PING EVENT，也就是前段的 endpoint 驗證，否則就是我們的 slash command event，所以先用 if 來判斷 `{{ $json.body.type }}`

接著我們要將 data 寫入 notion，需要使用到 notion node，這次使用 create database page，我想要將收集到的資源都作成一個 page 存進各自的 database。但在這之前需要先去 notion 開通一個 Integrations，[路徑](https://www.notion.so/profile/integrations)如下：Settings > My connections > Develop or manage integrations。

使用 internal Integration Secret，只讓處於同個 workspace 的使用這可以使用，最後將這段 secret 寫入 n8n 的 notion 節點的 `Credential to connect with` 欄位，`Database` 欄位選擇 `By ID`，並將 database 的 ID 寫入。

補充一點 notion 的 database id 是這樣看的：`https://www.notion.so/<long_hash_1>?v=<long_hash_2>`，前者是 database id，後者是 view id。[資料來源](https://stackoverflow.com/questions/67728038/where-to-find-database-id-for-my-database-in-notion)

還有最重要的一點，就是要將 notion database 作 connection 設定，這樣才找得到 database，才能 fetch 出需要的 key property

<div style="text-align: center">
  <img src="/gallery/2025-01-23/010.jpg" width="400" height="800" alt="將 notion database 作 connection 設定"/>
</div>

完整的 notion node 設置如下

<div style="text-align: center">
  <img src="/gallery/2025-01-23/009.jpg" width="400" height="800" alt="完整的 notion node"/>
</div>

進到最後的節點，也就是完成之後要將回傳訊息給 discord，設置 `{"data":{"content": ""}}`，用來當作 discord bot 回覆的內容，還有記得要設置一個 `{"type": 4}`，來說明此 slash command event 成功完成。

完整的 workflow，包含設定細項如下

### 轉換成生產環境

所有測試完成之後，就是轉換成生產環境啦，打開 Active 就可以了，記得 production URL 與 test URL 不一樣，所以要進到 webook 裡面複製替換掉 discrod bot 的 interaction endpoint。

## 總結

這樣就快速建立一個 workflow，幫助我們抓取 discord bot 的訊息並記錄到 notion 的 database，之後會想要結合爬蟲與 AI 來快速分析文章內容，完善這整套系統，將 notion 的知識庫發揮更高價值。

## 資料來源

- [Zeabur deploy n8n](https://www.youtube.com/watch?v=gJ7TF3Uiv1o)
- [connect your Notion workspace with Slash Command via n8n](https://www.youtube.com/watch?v=pOt_HXF-78g)
- [Discord Interactions Endpoint URL validation](https://community.n8n.io/t/discord-interactions-endpoint-url-validation/50759)