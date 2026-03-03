---
title: Being Observability：用 Grafana Alert 或 Prometheus AlertManager 做告警通知
tags: ["grafana"]
toc: true
categories: ["DeveOps", "Monitor"]
excerpt: 這是摘要
cover: /gallery/covers/default.jpg
date: 2026-03-03 01:36:30
---

## Grafana Alert 和 Prometheus AlertManager 的差別

在建立監控系統時，許多人第一次接觸 Grafana 時，會發現 Grafana 本身也能發送告警通知，因此產生疑問：

已經有 Grafana Alert，為什麼還需要 Prometheus Alertmanager？

事實上，兩者雖然都能發送通知，但在監控架構中的定位完全不同。

簡單來說：

- Grafana Alert 偏向「視覺化層級告警」
- Prometheus Alertmanager 則是「監控核心告警系統」

兩者解決的是不同問題。

---

## Grafana Alert

Grafana Alert 是建立在 Dashboard 與查詢之上的告警機制。在介面上主要分為 Alert rules、Contact points、Notification policy，每當 Grafana 執行 Panel Query 時，如果結果符合 alert rule，就會觸發 Contact points，而 Notification policy 可以幫助我們做進一步的管理，決定怎麼樣程度的 alert rule 被觸發，需要搭配什麼 contact points。

<p align="center">
  <img src="/gallery/2026-03-03/grafana-alert-1.png" width="60%">
</p>

首先，先創建一個 Discord Webhook 作為通知手段，Optional 的內容可以先略過

<p align="center">
  <img src="/gallery/2026-03-03/grafana-alert-2.png" width="60%">
</p>

接著，創建一個 alert rule，第二點就是要定義要搜尋怎樣的指標並設定條件，Alert condition 那張表可以預覽怎麼樣的資料會觸發通知

<p align="center">
  <img src="/gallery/2026-03-03/grafana-alert-3.png" width="60%">
</p>

第三、第四點需要定義 folder 和 evaluation behavior，作為分類依據

<p align="center">
  <img src="/gallery/2026-03-03/grafana-alert-4.png" width="60%">
</p>

第五點就是設定要綁定的 Contact point，第六點先略

<p align="center">
  <img src="/gallery/2026-03-03/grafana-alert-5.png" width="60%">
</p>

接者就是通知畫面預設會長這樣，左邊是 Firing，右邊是 Resolved

<p align="center">
  <img src="/gallery/2026-03-03/grafana-alert-6.png" width="30%">
  <img src="/gallery/2026-03-03/grafana-alert-7.png" width="30%">
</p>

**客製化訊息**

那如果要客製化訊息，建議先從 Notification Template 建立，這個進入點在 Contact points > Notification Templates，用來決定 Firing 和 Resolve 訊息分別會長怎樣，其實在建立的過程是可以預覽資料會長怎樣，也可以將現存的 alert rule 資料套進 template 預覽。需要注意的是 define 的名稱要和 Template group name 一樣，語法的部分是 Go Template，變數部分可以參考[官方文件](https://grafana.com/docs/grafana-cloud/alerting-and-irm/alerting/configure-notifications/template-notifications/reference/)

<p align="center">
  <img src="/gallery/2026-03-03/grafana-alert-8.png" width="60%">
</p>

後續定義 Summary 和 Description 的部分，這個就是用來替代 `.Annotations.summary` 和 `.Annotation.description`。變數同樣可以參考[官方資料](https://grafana.com/docs/grafana-cloud/alerting-and-irm/alerting/alerting-rules/templates/reference/)

<p align="center">
  <img src="/gallery/2026-03-03/grafana-alert-9.png" width="60%">
</p>

<p align="center">
  <img src="/gallery/2026-03-03/grafana-alert-10.png" width="60%">
</p>

---

## Prometheus AlertManager

Prometheus Alertmanager 則屬於監控系統的核心元件。

Prometheus 會持續評估 Alert Rules，一旦條件成立，就交由 Alertmanager 負責通知與管理。

**alertmanager.yml**

**alert.rules.yml**

---

## 資料來源

- [Grafana Labs - Get started with Grafana Alerting ](https://grafana.com/tutorials/alerting-get-started-pt4/)