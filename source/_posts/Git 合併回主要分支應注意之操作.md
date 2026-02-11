---
title: Git 合併回主要分支應注意之操作
toc: true
date: 2026-02-10 23:43:02
tags:        ["git"]
categories:  ["DeveOps", "Version Control"]
cover:       /gallery/covers/git.webp
excerpt: 主要探討當我們要將開發功能合併回主要分支時會需要用到那些操作，如 merge、rebase、stash、squash 等，思考這些操作帶來的結果是我們想要在主要分支上看到的嗎，進而維護主要分支的品質
---

## 推版前，拉取最新紀錄

當我們開發完一個功能，想要提交到 public git repo 時，**同步 remote branch 的最新紀錄**。

記得要先用 pull 將 remote branch 的最新紀錄拉下來給 local branch 追蹤，這樣才不會導致 local 與 remote branch 版本記錄不同導致衝突。另外如果 workspace 還有些內容沒有 commit，如 credientials、.env 等設定，可以先存到 stash，這樣也比較不會有內容衝突的情況，等到完整 pull、push 之後，再將 stash apply 就好。

1. stash workspace
2. pull remote branch
3. commit done
4. push to remote branch

---

## 合併分支

如果我們要將新功能合併回分支，可以使用 `git merge` 將分支合併回去，接著會在被合併的分支上新增一個 commit 標示 merge 行為。

至於是要 A -> B，還是要 B -> A，就依照團隊的意思，這兩個方式只有最後的結果顯示上有些差異而已。如下

<p align="center">
  <img src="/gallery/2026-02-11/image.png" width="60%">
</p>

如果是 master 合併到 feature/test101，feature/test101 會變成 HEAD，feature/test101 會包含 master 的最新變更
<p align="center">
  <img src="/gallery/2026-02-11/image-1.png" width="60%">
</p>

如果是 feature/test101 合併到 master ，master 會變成 HEAD，並且 master 分支作為更新版本
<p align="center">
  <img src="/gallery/2026-02-11/image-2.png" width="60%">
</p>

### 修改 merge commit

那如果覺得 Merge branch 'feature/test101' 這樣的 commit 不好看，可以這樣修改 commit 紀錄

**方法一：用 `--no-commi`**

使用這個參數，就可以在合併時編輯 merge 的 commit message

```bash
git merge feature/test101 --no-commit
```

在 fork GUI 使用上有這個選項可以選擇
<p align="center">
  <img src="/gallery/2026-02-11/image-3.png" width="60%">
</p>

**方法二：用 `--amend`**

另一個方法，部分 GUI 可能不提供，所以會需要用 Console 修改，而這也只針對剛 commit 完反悔想要修改 message 時才能使用，使用 `git commit --amend`，就會對最新一筆的 commit 做修改，如下

<p align="center">
  <img src="/gallery/2026-02-11/git-amend.png" width="60%">
</p>

---

## 修改分支歷史紀錄 

不過開發的時候如果在主要分支修復了一個 bug，我們希望也能在開發分支上有這個 bug 被修復的紀錄，這樣才能更準確的測試，這時就可以使用 `rebase`，重新指定分支分岔的起始位置，如下

這是我們現在的 git graph，我們想要將 feature/test1 也要有 master 最新的紀錄
<p align="center">
  <img src="/gallery/2026-02-11/git-rebase.png" width="60%">
</p>

使用 rebase 後的結果
<p align="center">
  <img src="/gallery/2026-02-11/git-rebase2.png" width="60%">
</p>

這樣乍看之下很像 merge 在做的事情，看起來是一條分支，但這只是將 master 的新 commit 補回去後畫面調正的結果，實際上 master 的版本還是停留在原位沒有追蹤到最新的 feature/test1 進度，所以這時候還是需要用 merge 將 brach 合併，不過也因為有用 rebase，合併上就比較不會有衝突，當然在做 rebase 時，如果新的 commit 會和 feature/test1 修改的檔案有重疊，也是需要解衝突的。

因此無論如何都還是要解衝突，只是在 rebase 時解的還是 merge 時解的而已，另外 rebase 解衝突是會將每個 commit 逐個掃過去，所以不用擔心一次要解太多，當然如果 commit 紀錄太多可能也會需要反覆解衝突就是了，所以最後我整個合併流程大概會變成這樣


1. stash workspace
2. pull remote branch
3. apply stash
4. commit done
5. rebase master/develop branch
6. resolve rebase conflict
7. test
8. resolve merge conflict(通常 rebase 有解過，merge 就不太需要解衝突)
9. merge into master/develop branch
10. test
11. push to remote branch

---

## 退回 Commit

有時候 pull 會發現與 remote branch 的版本對不上，但我已經 commit 要怎麼處理，這時可以使用 `reset` 將 commit 退還回去 workspace 重新整理流程，這樣就可以補救回來

1. commit done
2. pull remote branch -> fast-forward conflict
3. rest commit
4. stash workspace
5. pull remote branch
6. apply stash
7. commit done

不過如果已經同步到 remote branch，就最好不要再使用 `reset`、`rebase` 這種會修改歷史紀錄，退回紀錄的指令，這樣會導致其他人沒有辦法 track 到正確的 remote branch，變成他們要重新 track 一份到 local。所以在做這個決策前，必須和團隊討論後再做重大調整，避免花太多時間在處理 conflict 的事情上。

---

## 壓縮 Commit 內容
在 feature branch 開發時，常會出現這種 commit：

- fix typo
- adjust format
- fix lint
- try again
- update gitlab-ci

這些 commit 對主要分支來說價值不高，但卻會讓 commit 歷史變得很凌亂。
這時就非常適合使用 squash 來整理歷史。

**方法一：rebase interactive**

```bash
git rebase -i HEAD~5
```

<p align="center">
  <img src="/gallery/2026-02-11/rebase-squash-1.png" width="60%">
</p>

將後面的 commit 改成 s（squash）或 f（fixup）

<p align="center">
  <img src="/gallery/2026-02-11/rebase-squash-2.png" width="60%">
</p>

接著 Git 會讓你整理最後的 commit message，完成後就只剩 一筆乾淨的 commit。

<p align="center">
  <img src="/gallery/2026-02-11/rebase-squash-3.png" width="60%">
</p>

**方法二：merge 時使用 squash**

```bash
git merge --squash feature/test101
git commit
```

或者在 fork GUI 上這樣點選

<p align="center">
  <img src="/gallery/2026-02-11/merge-squash.png" width="60%">
</p>

這個方式會把 feature branch 的所有變更壓成一筆，不保留 feature branch 的 commit 歷史，適合用於 release / hotfix 類型分支

<p align="center">
  <img src="/gallery/2026-02-11/merge-squash-result.png" width="60%">
</p>

---

## 資料來源

[Atlassian - git](https://www.atlassian.com/zh/git/tutorials/setting-up-a-repository)