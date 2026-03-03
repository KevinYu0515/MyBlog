---
title: Being Observability：使用 Node Exporter/Window Exporter 監控主機資源
tags: ["grafana"]
toc: true
categories: ["DeveOps", "Monitor"]
excerpt: 這是摘要
cover: /gallery/covers/default.jpg
date: 2026-03-02 23:41:06
---

## Node Exporter

### 收集來源

- /proc 檔案系統
- sysfs
- System Calls / ioctl

### 核心指標呈現

- CPU（node_cpu_seconds_total）
- Memory（node_memory_MemAvailable_bytes）
- Disk（node_filesystem_size_bytes / node_filesystem_free_bytes）
- Network（node_network_receive_bytes_total / node_network_transmit_bytes_total）

---

## Window Exporter

### 收集來源

- WMI (Windows Management Instrumentation)：標準 Windows API，提供系統資訊、事件、磁碟、服務等
- Performance Counters (PerfMon)：內建效能監控工具、提供 CPU、磁碟 I/O、網路流量、記憶體使用量
- Windows API / System Calls

### 核心指標呈現

- CPU（windows_cpu_time_total）
- Memory（windows_memory_available_bytes）
- Disk（windows_logical_disk_size_bytes / windows_logical_disk_free_bytes）
- Network（windows_net_bytes_total）

---

## 總結

---

## 資料來源