---
title: Being Observability：用 Grafana Alert 或 Prometheus AlertManager 做告警通知
tags: ["grafana"]
toc: true
categories: ["DeveOps", "Monitor"]
excerpt: "使用 Grafana Alert 和 Prometheus AlertManager 告警，一些設定紀錄"
cover: /gallery/covers/monitor.png
date: 2026-03-03 01:36:30
---

## Grafana Alert 和 Prometheus AlertManager 的差別

在建立監控系統時，我第一次接觸 Grafana 時，會發現 Grafana 本身也能發送告警通知，因此產生疑問：

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

一樣在 Prometheus 可以[下載](https://prometheus.io/download/)

以下是一些參考範例
**alertmanager.yml**

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: "your-slack-webhook"

route:
  group_by: ['alertname', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#your-channel'
        send_resolved: true
        title: '{{ if eq .Status "firing" }}🔴 Alert Firing{{ else }}✅ Resolved{{ end }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Status:* {{ .Status }}
          *Started:* {{ .StartsAt | since }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

標註一些重要的欄位
- **`group_by`**：將相同 `alertname` 和 `instance` 的告警合併成一則通知，避免訊息洗版
- **`group_wait`**：第一次觸發後等 30 秒，收集同組告警再一起發出
- **`group_interval`**：同一組告警再次更新的間隔
- **`repeat_interval`**：告警持續 firing 時，重複通知的間隔（避免一小時內重複騷擾）
- **`inhibit_rules`**：當 critical 告警已觸發時，自動抑制同 instance 的 warning 告警，減少噪音

**alert.rules.yml**

用來定義告警規則，當觸發以下條件時就會調用 alertmanager 的 receiver

```yaml
groups:
  - name: blackbox_alerts
    rules:
      - alert: WebsiteDown
        expr: probe_success == 0
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "🔴 WebSite Down: {{ $labels.instance }}"
          description: "{{ $labels.instance }} has been unreachable for more than 3 minutes. Immediate investigation is required."
      - alert: SSLCertificateExpiringSoon
        expr: (probe_ssl_earliest_cert_expiry - time()) / 86400 < 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "⚠️ SSL Certificate Expiring Soon: {{ $labels.instance }}"
          description: "SSL certificate for {{ $labels.instance }} will expire in less than 5 days. Immediate renewal is required."
  - name: windows_alerts
    rules:
      - alert: DiskUsageHigh
        expr: |
          windows_logical_disk_free_bytes{volume!~"HarddiskVolume.*"} 
          / 1024 / 1024 / 1024 < 5
          unless
          windows_logical_disk_size_bytes{volume!~"HarddiskVolume.*"}
          / 1024 / 1024 / 1024 < 5
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "⚠️ Low Disk Space: {{ $labels.instance }}"
          description: "Disk {{ $labels.volume }} on {{ $labels.instance }} has less than 5GB remaining. Immediate investigation is required."
```


**prometheus.yml**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

rule_files:
  - "alert_rules.yml"

...下面省略

```

測試的時候可以先到 prometheus 的 alert 預設是 localhost:9090/alert，查看 alert rules 是否成功載入

成果畫面

<p align="center">
  <img src="/gallery/2026-03-03/alertmanager-1.png" width="60%">
</p>

| 比較項目 | Grafana Alert | Prometheus Alertmanager |
|---|---|---|
| 定位 | 視覺化層告警 | 監控核心告警 |
| 資料來源 | Grafana Panel Query（支援多種 datasource） | 僅 Prometheus metrics |
| 告警邏輯 | 在 Grafana 內設定 | 在 alert.rules.yml 設定 |
| 通知管理 | Contact Points + Notification Policy | Route + Receiver |
| 分組 / 去重 | 較基本 | 支援 group_by、inhibit_rules 等進階管理 |
| 適合場景 | 快速建立、與 Dashboard 整合 | 大規模、多服務、複雜路由需求 |
| HA 支援 | 依賴 Grafana HA | 原生支援 cluster 模式 |

---

## 資料來源

- [Grafana Labs - Get started with Grafana Alerting ](https://grafana.com/tutorials/alerting-get-started-pt4/)
- [Prometheus Alertmanager 官方文件](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Alertmanager routing configuration](https://prometheus.io/docs/alerting/latest/configuration/#route)