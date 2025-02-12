---
title: 談談 Docker 環境變數
toc: true
cover: /gallery/covers/docker.png
date: 2025-02-11 12:24:50
tags: ["docker"]
categories: ["DeveOps", "Docker"]
excerpt: 分析 ARG、ENV、.env、.env_file 的各種使用、覆蓋原則，以及多個階段如何設置環境變數來提高開發效率
---

## 前言
由於現在開發很依賴 Docker，所以在面臨不同環境時，需要設置並管理一大堆環境變數，所以希望藉由這片紀錄整理出在 Docker 如何使用環境變數來實現想要的環境效果，主要會從 .env 最常見的設置手法開始說明，接者進入 Dockerfile 講解 ARG、ENV 的使用，來靈活設置不同 stage 的情況以及如果想要額外測試不同的環境變數，可以怎麼透過 Docker CLI 或修改 docker-compose 的方式來作調適，最後探討如果有敏感資料要怎麼安全的處理。

以下為本次實作的 Application 為 flask 簡單建立的 Web Application

```python app.py
from flask import Flask
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

@app.route('/')
def home():
    user = os.getenv('user', 'Flask')
    more = os.getenv('more', 'This is a simple Flask app running in a localhost.')
    return f"Hello, {user}! {more}"

if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)
```

## .env

通常 .env 會用來跟 docker-compose 結合作為動態變數使用，以 `Dollar-notation variables` 的形式取出 .env 指定的變數，如下這樣就可以取出 user 環境變數和 more 環境變數

```shell .env
user=Docker
more=This is a simple Flask app running in a Docker container.
```

```YAML docker-compose.yml
version: '3'

services:
  flask:
    build: .
    environment:
      - user=${user}
      - more=${more}
    ports:
      - "8080:5000"
```

可以使用 `docker-compose config`，來協助 debug 環境變數替換後的 compose 檔案

```shell docker-compose config
$ docker-compose config
WARN[0000] /mnt/c/Users/marve/Project/Personal/2025-02-11/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion 
name: "2025-02-11"
services:
  flask:
    build:
      context: /mnt/c/Users/marve/Project/Personal/2025-02-11
      dockerfile: Dockerfile
    environment:
      more: This is a simple Flask app running in a Docker container.
      user: Docker
    networks:
      default: null
    ports:
      - mode: ingress
        target: 5000
        published: "8080"
        protocol: tcp
networks:
  default:
    name: 2025-02-11_default
```

而經過 docker-compsoe 建立出來的 image 當中的環境變數也就變成了 docker-compose config 檢視後的樣子，所以用這樣的 image 所建立出來的 container 預設就會使用如同 .env 的環境變數。

但是 .env 定義的環境變數卻很容易被其他方式覆蓋，例如在 build image 階段我啟動 docker-compose 時定義環境變數，就可以取代掉原本的環境變數

```shell 在 build image 替換環境變數
$ user="shell" more="This is running by shell" docker-compose up -d

# 在網頁上會顯示 Hello, shell! This is running by shell
```

又或著我在建立新的 container 就可以透過 `-e` 來取代掉原本的環境變數

```shell 在 create container 替換環境變數
$ docker run -d -p 8081:5000 -e "user=test" -e "more=this is test" --name test 2025-02-11-flask

# 在網頁上會顯示 Hello, test! this is test
```

除了使用 .env 搭配 docker-compose 作為動態變數的方式，也可以改成從 Dockerfile 下手，所以接下來談談 Dockerfile 中 `ARG` 和 `ENV` 的使用

## ARG 和 ENV 的使用

ARG 和 ENV 最主要的差別在於有效的範圍
- ARG：只在 build image 階段有效
- ENV：在 build image 和 running contaienr 階段都有效

<div style="text-align: center">
  <img src="/gallery/2025-02-11/image1.png" alt="ARG 和 ENV available scope"/>
</div>

### how to use ARG

被 ARG 定義出來的變數稱為 `build-time variables`，只有在 build 階段有效，也就是只限於 Dockerfile 使用，常見使用方式如下，另外也可透過 `--build-arg` 的參數在 build 階段覆蓋 Dockefile 預設，至於 docker-compose，則是使用 args 來加入。

```Dockerfile dockerfile
ARG ENV=production
RUN if [ "$ENV" = "development" ]; then npm install --dev; else npm install; fi
```
```YAML docker-compose.yml
version: '3'

services:
  flask:
    build: .
    environment:
      - user=${user}
      - more=${more}
    ports:
      - "8080:5000"
    args:
        some_variable_name: a_value
```

而也因為只存在 build 階段，所以不適合出現在 `CMD`、`ENTRYPOINT`，這樣在 running container 階段會因為抓取不到變數而報錯。除此之外，也不建議將敏感資料放在 ARG，因為還是有可能在 image history、build cache 洩漏。

### how to use ENV

通常會需要沿用到 running container 的環境變數就會透過 ENV 來設定，在 Dockerfile 的寫法如下

```Dockerfile dockerfile
# ENV 需要有預設值，Dockerfile 接受以下兩種寫法
ENV VERSION 1.0 
ENV VERSION=2.0
```

至於如果想要在 build 階段可以設置動態的 ENV values，則可以搭配 ARG 使用，如下

```Dockerfile dockerfile
ARG VERSION_ARG
ENV VERSION=$VERSION_ARG
```

而經過 build 階段還是有其他方式在 running container 時可以覆蓋 image 原有的環境變數，以下提供三種方式

- 透過 `-e` 逐個變數覆蓋，這樣的效果在前面的 .env 示範過就不說明了，而這等同於在 docker-compose.yml 設定 environment

```YAML docker-compose.yml
version: '3'

services:
  flask:
    build: .
    environment:
      - env_var=some_val
```

- 透過參考 Host Machine 的環境變數

```Shell 參考 Host Machine 的環境變數
$ export more="this is host env"
$ env | grep more
more=this is host env

# 開啟一個 test image 建立的 container，叫做 test2
$ docker run -e more -d -p 8082:5000 --name test2 test
$ curl localhost:8082
Hello, Docker! this is host env
```

-  從 `env_file` 獲取環境變數

```Shell 從 env_file 獲取環境變數
$ docker run --env-file=env_file -d -p 8003:5000 --name test3 test
$ curl localhost:8003
Hello, ENV_FILE! Running With ENV_FILE.
```

```YAML docker-compose.yml
version: '3'

services:
  flask:
    build: .
    env_file:
      - env_file
    ports:
      - "8080:5000"
```

另外如果想要透過 Dockerfile 指令的方式，如：`RUN export user=123`，會發現這個變數沒辦法在下一行被調用，這是因為這個變數不會被保留，所以不要異想天開，這和 ENV 設置環境變數的方式不一樣。 

另外關於 docker-compose 取得環境變數的順位如下
1. Compose file
2. **Shell environment variables**
3. `environment` attribute in compose file 
3. Environment file passed to compose
3. `env_file` attribute in compose file
4. **.env file**
5. Dockerfile

## Secert 問題

儘管已經刪除了關於環境變數的檔案，但如果在 build image 時將 secert（如：SSH key）透過 ARG 方式帶入，還是有可能透過 `docker history IMAGE_ID` 被查找出來，所以不是很建議透過 build-time variables 來傳遞 secert，以下為 ARG 傳遞變數，可以從 image history 洩漏：

```shell
$ docker build --build-arg DEFAULT_MESSAGE=hello -t test2 .
$ docker history c37f01ea78e4
c37f01ea78e4   29 seconds ago   CMD ["python" "app.py"]                         0B        buildkit.dockerfile.v0
<missing>      29 seconds ago   RUN |1 DEFAULT_MESSAGE=hello /bin/sh -c pip …   10.8MB    buildkit.dockerfile.v0
<missing>      37 seconds ago   RUN |1 DEFAULT_MESSAGE=hello /bin/sh -c echo…   0B        buildkit.dockerfile.v0
<missing>      38 seconds ago   EXPOSE map[5000/tcp:{}]                         0B        buildkit.dockerfile.v0
<missing>      38 seconds ago   COPY . /app # buildkit                          19.2MB    buildkit.dockerfile.v0
```

至於要怎麼傳遞 secert，以下提供幾種方法：

**Squashing**

`--squash` 可以協助 build image 時移除之後完全不需要的檔案來減少 image 大小，並且減少原來到最新階段 image 之間的層級，這樣就可以有效移除 secert 檔案在 image 的痕跡

```Shell --squash
$ docker build --squash [...]
```

但同樣的這樣會減少 Docker layer caching 的使用，另外如果某次忘記 squashing，則有更高的風險外洩。

**Multi-stage Builds**
更好的方式是使用多階段的 build，先將 secert 用於中間層級的 image 來存取需要 secert 的資料並將這些資料傳遞到最後 image 建置的過程，這樣就能避免 secert 洩漏。以下是參考資料的範例

```Dockerfile Multi-stage Dockerfile
# this is our first build stage, it will not persist in the final image
FROM ubuntu as intermediate

# install git
RUN apt-get update
RUN apt-get install -y git

# add credentials on build
ARG SSH_PRIVATE_KEY
RUN mkdir /root/.ssh/
RUN echo "${SSH_PRIVATE_KEY}" > /root/.ssh/id_rsa

# make sure your domain is accepted
RUN touch /root/.ssh/known_hosts
RUN ssh-keyscan bitbucket.org >> /root/.ssh/known_hosts

RUN git clone git@bitbucket.org:your-user/your-repo.git

FROM ubuntu
# copy the repository form the previous image
COPY --from=intermediate /your-repo /srv/your-repo
# ... actually use the repo :)
```

先透過 SSH_PRIVATE_KEY 取出 private github repo，最後將這個 repo 的位置複製進最後 image，這樣就能完美避開 SSH_PRIVATE_KEY 出現在 history command 當中

## 總結

以下為這次的重點
- .env 與 docker-compose 的交互
- ARG 與 ENV 的差別
- 如何在 build image 階段覆蓋 ARG
- 如何在 running container 階段覆蓋原有的環境變數
- 如何查看 docker-compose 的環境變數設定
- docker-compose 抓取環境變數的順序
- 如何避免 secert 於 image history 洩漏

經過這次學習，可以更靈活的調適不同環境，也可以更有效的 debug，甚至如何避免 secert 洩漏，希望能幫助大家在 docker 環境下更有效的開發。

## 資料來源
- [docker-arg-env-variable-guide](https://vsupalov.com/docker-arg-env-variable-guide/#arg-and-env)
- [override-docker-compose-dot-env](https://vsupalov.com/override-docker-compose-dot-env/)
- [build-docker-image-clone-private-repo-ssh-key](https://vsupalov.com/build-docker-image-clone-private-repo-ssh-key/)