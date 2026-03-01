---
title: 入門監控觀測技能，Blackbox Exporter 檢測 HealthCheck
tags: ["grafana"]
toc: true
categories: ["DeveOps", "Monitor"]
excerpt: 使用 Grafana、Prometheus 與 Blackbox Exporter 建立網站 Health Check 與 Uptime 監控系統
cover: /gallery/covers/default.jpg
date: 2026-03-01 13:20:42
---

前言，想要將內部系統的監控建立的更加完善(現在只有 Web Application Logging)，首先以 Health Check 入手，有嘗試使用 .Net 的 health check ui 和 Uptime kuma 等套件或開源專案，但總覺得這樣有點碎片化，那有沒有一個可以較系統性，能將整個監控服務包攬的開源方案，第一念頭想到的就是強大的 grafana，想要用它來集中管理，但這只是個 Dashboard 有辦法支援這麼多的監控方案嗎，直到進一步查詢才發現原來支援 grafana 接口的工具也非常齊全，如 Prometheus、Loki、elasticSearch，甚至連雲端服務都可以，那麼好極了，我這樣就只要想辦法將這些工具的配置檔寫好再串進 grafana 就可以了，回歸正題，我既然想要可以對網站做到 Health Check，那就是透過 BlackBox Exporter 來實現了。 

## 什麼是 BlackBox Exporter

Black Box Monitor 指的是由外部發起的監測，以用戶的角度探測系統的可靠性，可用於檢測服務是否停機、網站性能下降等。反過來，從內部監控系統，如 loggingg、handlers、tracing、mertrics 等就是 White Box Monitor。

而 BlackBox Exporter，可用於探測 HTTP(s)、TCP、DNS、ICMP、gRPC 等 Endpooint，測量出 Endpoint 的可靠性，以下以 Prometheus BlackBox Exporter 串接 Grafana 為實作。

---

## 整體配置

```yaml compose.yaml
version: "3.9"

services:
  blackbox:
    image: prom/blackbox-exporter
    container_name: blackbox
    volumes:
      - ./blackbox/blackbox.yml:/config/blackbox.yml
    command:
      - "--config.file=/config/blackbox.yml"
    ports:
      - "9115:9115"

  prometheus:
    image: prom/prometheus
    container_name: prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - "--web.enable-lifecycle"
    ports:
      - "9090:9090"
    depends_on:
      - blackbox
      
  grafana:
    image: grafana/grafana
    container_name: grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
```

### BlackBox Exporter 配置

```yaml blackbox.yml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      method: GET
      preferred_ip_protocol: ip4
```

### Prometheus 配置

這邊 targets 的部分，是因為被監控的 Website 不是和這套 monitor 同時架設，加上這個範例是基於 Docker Desktop 的 docker engine，所以才使用 `host.docker.internal` 取得 docker 內部的 ip，所以設定上要先保證在建立 BlackBox Exporter 的網路環境下能否成功發起請求到想要監控的網站，而不是設 localhost 就一定能打得到。

```yaml prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:

  - job_name: "blackbox-http"
    metrics_path: /probe
    params:
      module: [http_2xx]

    static_configs:
      - targets:
          - http://host.docker.internal:8081
          - http://host.docker.internal:8080
          - https://google.com

    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target

      - source_labels: [__param_target]
        target_label: instance

      - target_label: __address__
        replacement: blackbox:9115
```

### 建立 Grafana Dashboard

將服務架起來後就需要將 Prometheus 作為 Data Source 加入，並且串建 Dashboard

**新增 Dashboard Panel**

<p align="center">
  <img src="/gallery/2026-03-01/grafana-1.png" width="60%">
</p>

**加入 Data Source、Metric、Legend Format**

Metric 為 Prometheus 透過 BlackBox Exporter 提供給我們可以呈現的指標

常用的指標如下
- `probe_success`：是否成功 (1 = 成功, 0 = 失敗)
- `probe_duration_seconds`：整體請求耗時
- `probe_http_status_code`：HTTP 回應狀態碼
- `probe_dns_lookup_time_seconds`：DNS 解析時間
- `probe_connect_duration_seconds`：TCP 連線時間
- `probe_tls_duration_seconds`：TLS Handshake 時間

而這邊先以 `probe_success` 來判斷該網站的 Endpoint 是否可靠

<p align="center">
  <img src="/gallery/2026-03-01/grafana-2.png" width="60%">
</p>

<p align="center">
  <img src="/gallery/2026-03-01/grafana-3.png" width="60%">
</p>

<p align="center">
  <img src="/gallery/2026-03-01/grafana-4.png" width="60%">
</p>

而 Legand Format 可以定義 Display Text 的 Template，內容顯示上更精美，通常以 `{{label name}}` 定義，這邊以 `{{instance}}` 為例，如果想要找其他變數可以先默認 Auto 顯示看看 Json 結構，像這邊就是顯示

```json
{__name__="probe_success", instance="https://google.com", job="blackbox-http"}
```

<p align="center">
  <img src="/gallery/2026-03-01/grafana-8.png" width="60%">
</p>

又或者可以到 Prometheus 的 BlackBox Exporter 查看所有 label name

<p align="center">
  <img src="/gallery/2026-03-01/prometheus-1.png" width="60%">
</p>

<p align="center">
  <img src="/gallery/2026-03-01/prometheus-2.png" width="60%">
</p>

當然這個 label 也可以在 prometheus.yaml 自訂義作為過濾方式，例如我們有不同的測試環境就可以添加 env 作為 label

```yaml
static_configs:
  - targets:
      - https://api-prod.example.com
    labels:
      env: production

  - targets:
      - https://api-staging.example.com
    labels:
      env: staging
```

**以 Stat Visualization 呈現，調整 Value Options、Thresholds**

<p align="center">
  <img src="/gallery/2026-03-01/grafana-5.png" width="30%">
  <img src="/gallery/2026-03-01/grafana-6.png" width="30%">
  <img src="/gallery/2026-03-01/grafana-7.png" width="30%">
</p>

這邊 Thresholds 是因為 probe_success 只會顯示是否成功，所以才設定 0 和 1 來顯示，後續可以串接 Grafana Alert 或是用 Prometheus AlertManager 做告警通知提醒。

最後完整的 [Panel JSON](https://gist.github.com/KevinYu0515/36c2d59351c836fbdaca0a160f048e0e)

### 加上 Uptime 百分比

一樣在建立一個 Panel，但這次在 Query 使用這樣的 Code

```
avg_over_time(
  probe_success{job="blackbox-http"}[24h]
) * 100
and on(instance)
present_over_time(probe_success[5m])
```

<p align="center">
  <img src="/gallery/2026-03-01/grafana-9.png" width="60%">
</p>

這個的意思代表抓取 24hr 內 probe_success 成功比率，並且只顯示過去 5 分鐘內仍持續監測的 instance，這樣就能過濾已經沒有在監測的 Endpoint。那如果想將時間拉更長到 30 天就只要換成 30d 就可以了。

接著到右側的 Standard options 換成 Unit -> Percent(0-100)，重新設定 thresholds 就可以了。

以下是整個 Dashboard 完成圖

<p align="center">
  <img src="/gallery/2026-03-01/grafana-10.png" width="60%">
</p>

當然也可以直接使用現成的 Dashboard，例如 Grafana Labs 提供的 [BlackBox Exporter Dashboard](https://grafana.com/grafana/dashboards/13659-blackbox-exporter-http-prober/)

---

## 資料來源

- [Blackbox Exporter Configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [探索Prometheus Blackbox Exporter：全方位網路監控利器](https://juejin.cn/post/7354940558672199689)