---
title:       "Google Map 商家資料爬取"
subtitle:    "Web scraping, or crawling, refers to the automated process of extracting data from websites."
excerpt:    "紀錄如何使用 selenium 和 bs4 來抓取網路上資料，本此以 google map 的商家資料作為初次嘗試的對象"
date:        2022-08-20
tags:        ["python", "crawler", "back-end"]
categories:  ["Data Analysis"]
cover:      /gallery/covers/webcrawel.jpg
toc: true
---

## 技能大綱
- 如何用 Selenium 點擊、滑動、鎖定元素
- 如何用 Python 製作 json
- 相關 `Library`：`selenium`、`pandas`、`json`、`bs4`、`time`

## 主要過程與介紹
- 我打算製作 json 作為店家網站的評論資料庫，但 json 資料須定期更新，
為了節省製作的時間，所以希望能透過自動化流程製作出近期評論的 json。
- 抓取過程（主要由 `Selenium` 操作）

## 第一部分：初始化設定
1. 瀏覽器綁定：本次所使用的是 `Edge`
    ```Python
    browser = webdriver.Edge()
    ```
2. 前往特定連結：如果有例外就取消視窗
    ```Python
    url = "https://reurl.cc/KQ0xNj"
    try:
        browser.get(url)
    except:
        browser.execute_script("window.stop()")
    ```
3. 超時設定：防止程式當機
    ```Python
    browser.set_page_load_timeout(10) # 頁面加載超過 10 秒就停止
    browser.set_script_timeout(10) # 設置此腳本停留超過 10 秒就停止
    ```
4. 視窗放大
    ```Python
    browser.maximize_window()
    ```

## 第二部分：網頁操作與動態加載
- 評論篩選：透過 `google map` 提供的篩選功能將我們需要的評論先整理出來
    1. 點擊篩選功能按鈕
    ```Python
    # 等待瀏覽器跑出篩選功能的 class
    WebDriverWait(browser, 30).until(EC.presence_of_element_located((By.CLASS_NAME, 'S9kvJb')))
    # 鎖定我們需要的 class 作為我們的 WebElement
    category_click = browser.find_elements(By.CLASS_NAME,'S9kvJb')
    time.sleep(1)
    # 點擊篩選功能選項
    category_click[data_index].click()
    time.sleep(1)
    ```
    - `time.sleep()`：由於點擊後要等到網頁更新畫面，所以我們設定時間等待一秒
    2. 點擊篩選選項按鈕
    ```Python
    # 鎖定我們需要的篩選選項清單的 class
    category_click = browser.find_elements(By.CLASS_NAME,'fxNQSd')
    time.sleep(1)
    # 點擊我們需要的篩選選項
    category_click[sort_index].click()
    ```

- 動態加載：由於我們所需要的評論並不是一次加載完，而是根據我們移動頁面而持續的加載。
    1. 向下滑動頁面
    ```Python
    time.sleep(1)
    # 透過 javascript 語法滑動頁面
    js = 'document.getElementsByClassName("m6QErb DxyBCb kA9KIf dS8AEf")[0].scrollTop=1000000'
    browser.execute_script(js)
    ```
    2. 讀取資料的網頁程式碼
    ```Python
    time.sleep(3)
    # 使用 soup library 將目前網頁的程式碼取出
    soup = Soup(browser.page_source,"lxml")
    # 鎖定所有評論的 class
    all_reviews = soup.find_all(class_ = 'jftiEf fontBodyMedium')
    ```

## 第三部分：尋找目標資料的網頁程式碼
- 抓取評論內容的各個資料並丟入陣列作儲存 
    ```Python
    comments = [] # 全部評論的陣列
    i = -1 
    for ar in all_reviews:
    i += 1
    obj = [] # 暫存目前所抓的評論內容資料
    # 增加索引序號
    obj.append(i)
    # 增加評論者姓名
    obj.append(ar.find(class_ = "d4r55").text)
    # 增加評論者給予的星星
    obj.append(str(ar.find(class_ = "kvMYJc").get('aria-label').strip().strip(" 顆星")))
    # 增加評論日期
    obj.append(ar.find(class_ = "rsqaWe").text)
    # 增加評論內容
    obj.append(ar.find(class_ = "wiI7pd").text)
    # 增加評論者頭像
    obj.append(ar.find(class_ = "NBa7we").get('src'))
    comments.append(obj) # 存進全部評論的陣列
    ```

## 第四部分：打包成 json 送出
1. 透過 `panda` 將資料整理成 `json array`
    ```Python
    select_df = pd.DataFrame(comments, columns = ['id','name','star','date','content','icon'])
    ```
2. 載入 `json array`，製作成 `json object` 送出
    ```Python
    # 載入 json array
    data = json.loads(select_df.to_json(orient = 'records'))
    # 製成 json object
    j = {"comments": data }
    with open('comment.json', 'w', encoding='UTF-8') as f:
        json.dump(j, f, ensure_ascii= False)
    ```
## 實作結果
```Python

import time
import json
import pandas as pd
from selenium import webdriver
from bs4 import BeautifulSoup as Soup
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions as EC

if __name__ == '__main__':

    # 初始化
    browser = webdriver.Edge()
    url = "https://reurl.cc/KQ0xNj"
    browser.set_page_load_timeout(10)
    browser.set_script_timeout(10)

    try:
        browser.get(url)
    except:
        browser.execute_script("window.stop()")

    browser.maximize_window()

    data_index = 4 
    sort_index = 2

    # 點擊篩選選項功能
    WebDriverWait(browser, 30).until(EC.presence_of_element_located((By.CLASS_NAME, 'S9kvJb')))
    category_click = browser.find_elements(By.CLASS_NAME,'S9kvJb')
    time.sleep(1)
    category_click[data_index].click()
    time.sleep(1)

    # 點擊篩選樣式
    category_click = browser.find_elements(By.CLASS_NAME,'fxNQSd')
    time.sleep(1)
    category_click[sort_index].click()

    # 滑動頁面加載更多資料
    time.sleep(1)
    js = 'document.getElementsByClassName("m6QErb DxyBCb kA9KIf dS8AEf")[0].scrollTop=1000000'
    browser.execute_script(js)

    # 加載完成後，重新抓取資料
    time.sleep(3)
    soup = Soup(browser.page_source,"lxml")
    all_reviews = soup.find_all(class_ = 'jftiEf fontBodyMedium')

    # 找尋資料的網頁原始碼
    comments = []
    i = -1
    for ar in all_reviews:
        i += 1
        obj = []
        obj.append(i)
        obj.append(ar.find(class_ = "d4r55").text)
        obj.append(str(ar.find(class_ = "kvMYJc").get('aria-label').strip().strip(" 顆星")))
        obj.append(ar.find(class_ = "rsqaWe").text)
        obj.append(ar.find(class_ = "wiI7pd").text)
        obj.append(ar.find(class_ = "NBa7we").get('src'))
        comments.append(obj)

    # json 打包
    select_df = pd.DataFrame(comments, columns = ['id','name','star','date','content','icon'])
    data = json.loads(select_df.to_json(orient = 'records'))
    j = {"comments": data }
    with open('comment.json', 'w', encoding='UTF-8') as f:
        json.dump(j, f, ensure_ascii= False)

```

## 資料來源
1. [Medium Google Map Review 動態爬蟲：如何獲取店家評論內容、圖片以及篩選評論（附Python程式碼）](https://reurl.cc/W1GXpD)  
2. [Medium Google Map Review 動態爬蟲：如何解決評論動態加載的問題以及在不同視窗間跳轉、滑動（附Python程式碼）](https://reurl.cc/YXejZa)
3. [CSDN 頁面滑動](H5-Jquery和Vue同时使用冲突_天堂比不过家乡啦的博客-CSDN博客)
4. [CSDN 內嵌 div 滾動](https://blog.csdn.net/LYX_WIN/article/details/119972741)  