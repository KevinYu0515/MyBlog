---
title: Cron For Conatiners - 在 Docker 內執行 cronjob
date: 2025-05-26T07:57:54.775Z
tags:
  - docker
toc: true
categories: ["DeveOps", "Docker"]
excerpt: "我只是想簡單地在容器裡跑個定時任務，沒打算用像 k8s 那種大型的自動化系統，畢竟為了跑個排程就搞那一套，真的有點殺雞用牛刀。"
cover: /gallery/covers/docker.png
---

## 前言

想要定時執行特定的服務，且都要能在不同的環境上執行，那 Docker 會是一個很好的選擇，而據我所知要對 Docker 定時排程可以使用 k8s 這類的自動化容器部屬系統，但我不想搞得這麼複雜，所以想說可以在 docker 內運行 cronjob，可以簡單實現這個需求。

## 怎麼在 docker 內使用 cronjob

1. 需要新增一個檔案，寫入 cronjob 的指令，雖然檔名不影響，但通常我都直接取名為 cronjob。記得最後要保留一行，這樣才能被成功執行。
```bash
* * * * * root echo test >> /var/log/cron.log 2>&1
# Don't remove the empty line at the end of this file. It is required to run the cron job
```
> 怎麼知道自己的 cronjob 時間設定對不對，可以用這個網站測試 [Crontab](https://crontab.guru/)

2. 在 dockerfile 安裝 cron 並給予足夠的權限，以下為簡單的範例
```Dockerfile
FROM debian:bullseye

# 安裝 cron 和 bash
RUN apt-get update && \
    apt-get install -y cron && \
    apt-get clean

COPY cronjob /etc/cron.d/test-cron

# 設定時區
ENV TZ=Asia/Taipei
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 設定權限
RUN chmod 0644 /etc/cron.d/test-cron && \
    crontab /etc/cron.d/test-cron

# 建立 log 檔案，避免 cronjob 無法自動生成
RUN touch /var/log/cron.log

# 執行 cron 並保留 log 輸出在 foreground
CMD cron && tail -f /var/log/cron.log
```

如果只是要用 cronjob 執行 linux 指令，基本上這樣就可以了，但如果是要執行其他程式語言的 script 就需要注意以下幾點
- cronjob 會無法獲取環境變數
- cronjob 需要指定指令路徑，這樣才能有效執行指令

以下例子為執行 python script 的 cron file
```bash
0 0 * * * root /usr/local/bin/python3 /app/catch_news.py >> /proc/1/fd/1 2>> /proc/1/fd/2
# Don't remove the empty line at the end of this file. It is required to run the cron job
```

那至於環境變數的部分，就需要在 cronjob 的設定加入環境變數，或者改成執行 bash shell，假如我要在上面加入環境變數就會長這樣
```bash
0 0 * * * root ENV_VAR1=test /usr/local/bin/python3 /app/catch_news.py >> /proc/1/fd/1 2>> /proc/1/fd/2
# Don't remove the empty line at the end of this file. It is required to run the cron job
```

這個 cronjob 的意思是每天的午夜 12. 使用 `/usr/local/bin/python3` 執行 `/app/catch_news.py` 程式，並將輸出、錯誤顯示在 docker log

最後提一下簡單排錯，可以先進到 container 的環境，使用 `crontab` 指令來檢測
- `crontab -l`：查看現在運行的排程任務
- `crontab -e`：編輯現在的 cron file
- `crontab -r`：刪除所有的排程任務

## Case Study：Supercronic

Supercronic 是特別設計用來在 container 執行的 cron job runner，同時完全兼容 crontab 指令，可以幫助我們解決 cronjob 在 container 內執行的一些詬病：
- 開始執行任務之前，環境會被清除，導致許多容器的基礎配置失效（如環境變數）
- 通常 cronjob 的 log 會被儲存進 syslog，方便伺服器統一管理，但在 container 環境中，任務的 log 直接輸出在 `stdout` / `stderr` 會讓工作更輕鬆

也就是說，Supercronic 幫助我們在 container 使用 cron 時更符合我們的預想，如下述功能：
- 環境變數可以在 cronjob 中被使用
- cronjob 的 log 會被導到 `stdout` / `stderr`
- `SIGTERM`、`SIGUSR2`、`SIGQUIT` 能被更優雅的中止

以下是 Dockerfile 搭配 Supercronic 的範例
```Dockerfile
FROM debian:bullseye-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates cron tzdata coreutils && \
    apt-get clean

COPY cronjob /etc/cron.d/test-cron

ENV TZ=Asia/Taipei
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN chmod 0644 /etc/cron.d/test-cron

# 設定 Supercronic 需要的環境變數
ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v0.2.33/supercronic-linux-amd64 \
    SUPERCRONIC_SHA1SUM=71b0d58cc53f6bd72cf2f293e09e294b79c666d8 \
    SUPERCRONIC=supercronic-linux-amd64

# 安裝 Supercronic
RUN curl -fsSLO "$SUPERCRONIC_URL" \
 && echo "${SUPERCRONIC_SHA1SUM}  ${SUPERCRONIC}" | sha1sum -c - \
 && chmod +x "$SUPERCRONIC" \
 && mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" \
 && ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic

# 需要明確指向 supercronic 的路徑，否則會 "Failed to fork exec: no such file or directory"
CMD ["/usr/local/bin/supercronic", "/etc/cron.d/test-cron"]
```

至於要放進去的 cronjob 只要按照 contab 格式就可以了，記得最後要空一行
```bash
# Run every 2 seconds
*/2 * * * * * * ls 2>/dev/null

# Run once every hour
@hourly echo "$SOME_HOURLY_JOB"
```

![測試結果圖](/gallery/2025-05-27/01.png)

除此之外，其實也是有已經把 supercronic 包進去的 image ([imega/supercronic](https://hub.docker.com/r/imega/supercronic))

## Case Study：Ofelia

Ofelia 也是一個輕量級、容器導向的排程管理工具，專門設計來在 Docker 環境中執行 cron 任務，不過更為系統性地去分配任務。

在 job 分類上分為四種，更詳細說明在這 [ Jobs reference ](https://github.com/mcuadros/ofelia/blob/master/docs/jobs.md)：
- job-exec: 在正在執行的 container 執行任務，與 `docker exec` 很像
- job-run: 在新的 container 內執行任務，與 `docker run`、`docker start` 很像
- job-local: 在運行 ofelia 的主機上執行任務
- job-service-run: 在一次性服務內執行任務



在使用上可以分為 INI-style 或者 docker labels

INI-style 會寫出像以下的設定檔，接者只要執行 `ofelia daemon --config=/path/to/config.ini`
```ini
[job-exec "job-executed-on-running-container"]
schedule = @hourly
container = my-container
command = touch /tmp/example

[job-run "job-executed-on-new-container"]
schedule = @hourly
image = ubuntu:latest
command = touch /tmp/example

[job-local "job-executed-on-current-host"]
schedule = @hourly
command = touch /tmp/example


[job-service-run "service-executed-on-new-container"]
schedule = 0,20,40 * * * *
image = ubuntu
network = swarm_network
command =  touch /tmp/example
```

docker labels 則是透過 labels 參數附加 job，這邊則以 docker compose 為例，畢竟更常使用。
```yml
version: "3"
services:
  ofelia:
    image: mcuadros/ofelia:latest
    depends_on:
      - nginx
    command: daemon --docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels:
      ofelia.job-local.my-test-job.schedule: "@every 5s"
      ofelia.job-local.my-test-job.command: "date"

  nginx:
    image: nginx
    labels:
      ofelia.enabled: "true"
      ofelia.job-exec.datecron.schedule: "@every 5s"
      ofelia.job-exec.datecron.command: "uname -a"
```

## 總結

在 container 內使用 cronjob 來定時執行程式的想法是可行的，但由於 container 的用途與伺服器統一管理的策略上有些不同，所以還需要修改 cronjob 使用上的一些習慣，不過這方面也有許多相對應的工具如 Supercronjob 和 Ofelia 可以協助在 container 更有系統的配置與方便除錯。在選擇上，我個人會傾向將 Supercronjob 使用在單一的 container 這類的小型專案，而 Ofelia 則使用在中型專案，需要複數個 container 使用的情境，至於更大型的專案，需要依賴自動化流程及監控需求，則採用 k8s 這類更加完善的工具。最後附上些 Ofelia 和 Supercronjob 的比較。

| 特性 | Ofelia |	Supercronic |
| --- | --- | --- |
| 運作方式 |	獨立容器，透過 Docker labels 或 config 控制 |	當作 base image 或附加進應用容器裡 |
| Docker 整合 | 非常強，設計就是為了 Docker 環境 |	通常與應用合併在一起執行 |
| 設定方式 |	YAML 設定檔 或 labels |	crontab 格式的文本檔案 |
| Log 輸出 |	支援記錄輸出 | 標準輸出支援良好 |
| Docker Compose 支援 |	非常好，推薦搭配使用 |可以，但較適合單一 container 任務 |
| 多任務支持 |	多任務，集中管理 | 通常是一個容器執行一個或少數任務 |
| 容器啟動與控制 |	獨立服務，統一控制 | 隨應用啟動，較緊耦合 |

## 參考資料

- [supercronjob](https://github.com/aptible/supercronic/)
- [ofelia](https://github.com/mcuadros/ofelia)