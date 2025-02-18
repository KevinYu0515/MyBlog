---
title: Migrate from SQLite DB to PostgreSQL DB in Grist
toc: true
cover: /gallery/covers/database.png
date: 2025-02-18 13:23:14
tags: ["grist", "database"]
categories: ["Develop", "Backend"]
excerpt: 雖然 Grist 的主要資料庫為 SQLite，但同時也支援 PostgreSQL，而本篇記錄如何將 SQLite 轉換成 PostgreSQL，並把舊資料搬遷到新資料庫
---

## 新增環境變數

要改變 Grist 的資料庫類型非常簡單，甚至連程式都不需要寫，首先需要新增以下環境變數
- TYPEORM_DATABASE: [your_datbase_name]
- TYPEORM_USERNAME: [your_username]
- TYPEORM_PASSWORD: [your_password]
- TYPEORM_PORT: [your_port]
- TYPEORM_TYPE: postgres

可以將環境變數加入 `/etc/profile`，這樣就不用每次都手動新增

```shell /etc/profile
export TYPEORM_DATABASE=[your_datbase_name]
export TYPEORM_USERNAME=[your_username]
export TYPEORM_PASSWORD=[your_password]
export TYPEORM_PORT=[your_port]
export TYPEORM_TYPE=postgres
```

接著 `source /etc/profile`，就可以執行該 bash shell，此時我們呼叫 `env | grep "TYPE"`，就可以確認是否有加入環境變數

## 安裝 PostgreSQL

Grist 需要的變數設好後，就需要給一個資料庫給 Grist 連接，這邊使用 Local Databse，但從 Docker 下載使用

```shell
docker pull postgres
docker run --name postgres -e POSTGRES_PASSWORD=[your_password] -p 5432:5432 -d postgres
```

裝好 postgres 之後，可以再額外安裝 postgres-client 用 CLI 來嘗試連接 local database

```shell
sudo apt install postgres-client
psql -U [username] -h localhost -p 5432 -d [your_database_name]
```

但如果我不知道 `username` 和 `database_name`，可以先進入 docker 內的 postgres 查看，不過預設 username 通常會是 postgres，所以先嘗試用預設登入試試

```shell
docker exec -it [your-container-id] psql -U postgres
```

進入 postgres shell 之後，可以使用以下指令去找出基本資訊

```shell
\list                    # 列出基本資訊
select current_username; # 查出現在使用者
select current_database(); # 查出現在資料庫
```

## 使用 pgloader 轉換 database file type
在 Ubuntu 上，可以直接使用 pgloader 來轉換 sqlite 的 database fie 為 postgres 的 database file

```shell
sudo apt install pgloader
```

安裝好後新增一個 `db.load`，並加入以下內容

```shell
load database
  from sqlite:///PATH/TO/LANDING.DB
  into postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME

with truncate, data only;
```

最後直接跑 pgloader 指令就可以了，基本上這樣就轉換成功了

```shell
pgloader db.load
```

## 相關資料
- [pgloader github](https://github.com/dimitri/pgloader)
- [how-to-migrate-from-a-sqlite-db-to-postgresql](https://community.getgrist.com/t/how-to-migrate-from-a-sqlite-db-to-postgresql/3152)