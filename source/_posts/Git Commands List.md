---
title:       "Commands List"
subtitle:    "Git是一個強大的版本控制系統，用於追蹤、管理和協同開發程式碼的變更。"
excerpt:     "Git有助於有效地保存和追蹤版本歷史，解決問題和恢復變更。它支持多人協同開發，並提供分支管理機制，讓開發人員能夠同時進行不同任務，確保穩定性和平行開發。"
date:        2022-09-26
tags:        ["git"]
categories:  ["DeveOps", "Version Control"]
cover:       /gallery/covers/git.webp
toc: true
---

[官網 git 文件](https://git-scm.com/docs/git)  
***

### 首次使用必要指令
- 設定使用者名稱
    ```csharp
    git config --global user.name "your_username"
    ```
- 設定使用者電子信箱
    ```csharp
    git config --global user.email "your_email_address@example.com" 
    ```
- 列出使用者資訊  
    ```csharp
    git config --global --list  
    ```
### 常見上傳流水線指令
---

1. 初始化本地儲存庫
    ```csharp
    git init
    ```
2. 將檔案加入 git 暫存區
    ```csharp
    git add .
    ```
3. 將檔案提交至本地儲存庫
    ```csharp
    git commit -m "commit message"
    ```
4. 將檔案連結遠端儲存庫
    ```csharp
    git remote add origin [repo_url]
    ```
5. 將檔案上傳至遠端儲存庫
    ```csharp
    git push -u origin main
    ```
### 分支指令、傳輸指令
1. 查看分支列表（只有本地）
    ```csharp
    git branch
    ```
2. 查看分支列表（本地和遠端）
    ```csharp
    git branch -a
    ```
3. 創建新分支
    ```csharp
    git branch [branch name]
    ```
4. 刪除本地分支
    ```csharp
    git branch -d [branch name]
    ```
5. 刪除本地分支（強制執行）
    ```csharp
    git branch -D [branch name]
    ```
6. 刪除遠端分支
    ```csharp
    git push origin --delete [branch name]
    ```
7. 創建新分支並切換於此
    ```csharp
    git checkout -b [branch name]
    ```
8. 下載遠端分支並切換於此
    ```csharp
    git checkout -b [branch name] origin/[branch name]
    ```
9. 更名分支
    ```csharp
    git branch -m [old branch name] [new branch name]
    ```
10. 切換分支
    ```csharp
    git checkout branch [branch name]
    ```
11. 切換回上個分支
    ```csharp
    git checkout -
    ```
12. 捨棄該檔案的更動
    ```csharp
    git checkout -- [file-name.txt]
    ```
13. 刪除該檔案
    ```csharp
    git rm -r [file-name.txt]
    ```
14. 合併分支（合併於當前分支）
    ```csharp
    git merge [branch name]
    ```
15. 合併分支（來源分支合併於目標分支）
    ```csharp
    git merge [source branch] [target branch]
    ```
16. 預覽分支合併後的更動
    ```csharp
    git diff [source branch] [target branch]
    ```
17. 上傳至遠端分支
    ```csharp
    git push [repo_url_shortname] [branch name]
    ```
18. 上傳至遠端分支並且記憶該分支
    ```csharp
    git push -u [repo_url_shortname] [branch name]
    ```
19. 上傳至遠端分支並且記憶該分支
    ```csharp
    git push
    ```
20. 拉取遠端儲存庫更動
    ```csharp
    git pull
    ```
21. 拉取遠端儲存庫更動
    ```csharp
    git pull [repo_url_shortname] [branch name]
    ```
22. 增加遠端儲存庫  
    ```csharp
    git remote add [repo_url_shortname] [repo_url]
    ```
23. 設置儲存庫的起點為 SSH
    ```csharp
    git remote set-url [repo_url_shortname] [repo_url]
    ```
24. 移除遠端儲存庫
    ```csharp
    git remote remove [repo_url_shortname]
    ```
25. 列出遠端儲存庫
    ```csharp
    git remote
    ```
26. 列出遠端儲存庫(更詳細)
    ```csharp
    git remote -v
    ```
27. 下載遠端儲存庫
    ```csharp
    git clone repo_url
    ```
28. 下載遠端私人儲存庫
    ```csharp
    git clone [repo_url]
    ```
### 其他指令
1. 查看當前狀態
    ```csharp
    git status
    ```
2. 將當前工作區加入暫存
    ```csharp
    git stash
    ```
3. 將暫存區清空
    ```csharp
    git stash clear
    ```
4. 列出歷史紀錄
    ```csharp
    git log
    ```
5. 列出詳細歷史紀錄
    ```csharp
    git log --summary
    ```
6. 列出簡要的歷史紀錄
    ```csharp
    git log --oneline
    ```
7. 還原提交更改
    ```csharp
    git revert commitid
    ```

### 參考資料
[35+ Git Commands List Every Programmer Should Know](https://www.loginradius.com/blog/engineering/git-commands/)