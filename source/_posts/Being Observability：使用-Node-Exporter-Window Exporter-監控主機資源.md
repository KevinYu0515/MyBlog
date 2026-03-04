---
title: Being Observability：使用 Node Exporter/Window Exporter 監控主機資源
tags: ["grafana"]
toc: true
categories: ["DeveOps", "Monitor"]
excerpt: 講述如何使用 Node Exporter、Window Exporter 獲取主機資源指標並透過 Grafana 呈現
cover: /gallery/covers/monitor.png
date: 2026-03-02 23:41:06
---

主機層級的資源監控是必不可少的，可以參考 Prometheus 的 Node Exporter 收集 Linux 生態的作業系統指標，至於 Window 則可以使用 Window Exporter 來獲取，下面將介紹如何使用，以及核心指標的意義。

## Node Exporter

### 安裝方式

可以直接從 [Prometheus 官方 GitHub](https://github.com/prometheus/node_exporter/releases) 下載對應平台的二進制檔，或使用 Docker 執行：

```bash
wget https://github.com/prometheus/node_exporter/releases/download/v1.8.2/node_exporter-1.8.2.linux-amd64.tar.gz
tar -xzf node_exporter-1.8.2.linux-amd64.tar.gz
cd node_exporter-1.8.2.linux-amd64

# 直接執行（預設 port 9100）
./node_exporter
```

建議以 systemd service 方式管理，確保主機重啟後自動恢復：

```ini
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

接著在 Prometheus 的 `prometheus.yml` 加入 scrape 設定：

```yaml
scrape_configs:
  - job_name: "node"
    static_configs:
      - targets:
          - localhost:9100
          - 192.168.0.100:9100
```

若搭配 Grafana Dashboard，可以使用 [Node Exporter Full（ID: 1860）](https://grafana.com/grafana/dashboards/1860)。

### 收集來源

主要來源有三種：

- `/proc` 檔案系統：Linux 核心將 CPU 時間、行程狀態、記憶體使用量、網路統計等資訊以虛擬檔案的形式掛載於此。例如 `/proc/stat` 提供 CPU 使用時間，`/proc/meminfo` 提供記憶體使用量，`/proc/net/dev` 提供網路流量。
- `sysfs`：暴露裝置驅動程式與核心子系統的資訊，例如磁碟 I/O 統計（`/sys/block/`）、網路介面狀態、硬體感測器（溫度、電壓）等。
- `System Calls` / `ioctl`：部分指標需要透過系統呼叫取得，例如磁碟剩餘空間使用 `statfs()`，網路連線數使用 `netlink` socket 等。

### 核心指標呈現

**CPU（`node_cpu_seconds_total`）**

這是一個 Counter 類型的指標，記錄各 CPU 核心在不同模式（`mode`）下累積花費的時間（秒）。常見的 mode 包括：

| Mode | 說明 |
|------|------|
| `user` | 執行使用者空間程式的時間 |
| `system` | 執行核心空間（系統呼叫）的時間 |
| `idle` | CPU 閒置時間 |
| `iowait` | 等待 I/O 完成的時間（過高代表儲存瓶頸）|
| `steal` | 虛擬機被 Hypervisor 偷走的 CPU 時間 |

計算 CPU 使用率的 PromQL 範例：

```promql
# 計算所有核心平均 CPU 使用率（排除 idle）
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Memory（`node_memory_MemAvailable_bytes`）**

記憶體相關的指標以 Gauge 類型呈現，`MemAvailable` 是 Linux 3.14 之後引入的欄位，代表系統在不發生 swap 的前提下，實際可用的記憶體量（包含部分 cache 與 buffer 可回收的部分），比單純的 `MemFree` 更能反映真實可用量。

```promql
# 記憶體使用率
100 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100)
```

**Disk（`node_filesystem_size_bytes` / `node_filesystem_free_bytes`）**

這組指標以掛載點（`mountpoint`）與檔案系統類型（`fstype`）為 label 區分，可以針對特定分割區做監控。通常會過濾掉 `tmpfs`、`devtmpfs` 等虛擬檔案系統。

```promql
# 磁碟使用率（排除虛擬 fs）
100 - (
  node_filesystem_free_bytes{fstype!~"tmpfs|devtmpfs"}
  / node_filesystem_size_bytes{fstype!~"tmpfs|devtmpfs"} * 100
)
```

**Network（`node_network_receive_bytes_total` / `node_network_transmit_bytes_total`）**

這兩個 Counter 指標記錄各網路介面（`device`）累積收發的位元組數，搭配 `rate()` 函數可換算為即時流量：

```promql
# 網路入流量（bits/s）
rate(node_network_receive_bytes_total{device!="lo"}[5m]) * 8

# 網路出流量（bits/s）
rate(node_network_transmit_bytes_total{device!="lo"}[5m]) * 8
```

---

## Window Exporter

Windows Exporter（原名 `wmi_exporter`），透過 WMI 與 Performance Counters 收集 Windows 主機的系統指標

### 安裝方式

可以從這裡[下載](https://github.com/prometheus-community/windows_exporter/releases)，下載 msi 安裝後，在 collectors 開啟 `"cpu,memory,logical_disk,physical_disk,net,os,system,service"`，也就是第一行加入

<p align="center">
  <img src="/gallery/2026-03-02/window-exporter-1.png" width="60%">
</p>

這樣就安裝好了，同樣地，在 Prometheus 的 `prometheus.yml` 加入 scrape 設定：

```yaml
scrape_configs:
  - job_name: "windows"
    static_configs:
      - targets:
          - 192.168.0.101:9182
```

安裝完成後，預設會在 `http://<host>:9182/metrics` 暴露指標。可以在瀏覽器或 curl 確認是否正常運作：

```bash
curl http://192.168.0.101:9182/metrics | grep windows_cpu
```

若需要監控特定 Windows Service 的狀態，可在安裝時額外開啟 `service` collector，並在 Grafana 中透過 `windows_service_state` 指標過濾服務名稱。

如果要搭配 grafana dashboard 可以使用參考[這個](https://grafana.com/grafana/dashboards/24390-windows-exporter-dashboard-2025/)

### 收集來源

- WMI (Windows Management Instrumentation)：標準 Windows API，提供系統資訊、事件、磁碟、服務等
- Performance Counters (PerfMon)：內建效能監控工具、提供 CPU、磁碟 I/O、網路流量、記憶體使用量
- Windows API / System Calls：部分指標（如磁碟空間、系統開機時間）直接透過 Win32 API 呼叫取得，比 WMI 更輕量且延遲更低。

### 核心指標呈現

Windows Exporter 的指標命名與 Node Exporter 對齊，方便在 Grafana 中撰寫跨平台通用的 Dashboard。

**CPU（`windows_cpu_time_total`）**

與 `node_cpu_seconds_total` 對應，同樣以 `mode` label 區分不同狀態（`idle`、`user`、`privileged` 等）：

```promql
# Windows CPU 使用率
100 - (avg by(instance) (rate(windows_cpu_time_total{mode="idle"}[5m])) * 100)
```

注意 Windows 的 `privileged` 模式對應 Linux 的 `system` 模式，代表在核心（Ring 0）執行的時間。

**Memory（`windows_memory_available_bytes`）**

對應 Node Exporter 的 `node_memory_MemAvailable_bytes`，單位同為 bytes：

```promql
# Windows 記憶體使用率
100 - (windows_memory_available_bytes / windows_os_visible_memory_bytes * 100)
```

**Disk（`windows_logical_disk_size_bytes` / `windows_logical_disk_free_bytes`）**

以磁碟機代號（如 `C:`）作為 `volume` label 區分，概念與 Node Exporter 的 `mountpoint` 相同：

```promql
# Windows 磁碟使用率
100 - (
  windows_logical_disk_free_bytes{volume!~"HarddiskVolume.*"}
  / windows_logical_disk_size_bytes{volume!~"HarddiskVolume.*"} * 100
)
```

**Network（`windows_net_bytes_total`）**

對應 Node Exporter 的 receive/transmit 指標，以 `direction` label（`received` / `sent`）區分方向：

```promql
# Windows 網路流量（bits/s）
rate(windows_net_bytes_total{nic!~".*isatap.*", direction="received"}[5m]) * 8
```

---

## 資料來源

- [Prometheus 官方文件 - node_cpu_seconds_total](https://prometheus.io/docs/guides/node-exporter/)
- [Linux `/proc/stat` 文件說明](https://www.kernel.org/doc/html/latest/filesystems/proc.html)
- [Windows Performance Counters 文件](https://learn.microsoft.com/en-us/windows/win32/perfctrs/performance-counters-portal)