---
title:       "Forensics Beginner"
subtitle:    "從 picoCTF 學習 Forensics 基本能力"
excerpt: "如題，本篇記錄透過 picoCTF 學習 forensics 基本能力，可以大致分為 image、flow、general、disk 等常見種類，當然現實情況一定更為複雜，而這些也只是我敲 pico 過程遇到的類型而已，整篇將先以認識到的工具說明，然後抓幾道有趣的題目來做說明"
date:        2024-05-06
categories:  ["Security", "Forensics"]
cover:       /gallery/covers/default.jpg
toc:         true
---
## 工具列表

### 資訊提取

- **strings**：Linux 系統的原生命令列工具，可以用來將二進位檔案的可閱讀部分取出
- **exiftool**：用於讀寫、檢視圖片、音訊、PDF等檔案格式的 metadata
- **binwalk**：用於分析二進位檔案的工具，可提取出嵌入的檔案系統、壓縮資料、暗藏的程式碼，此外還提供數位簽名檢查、自定義模式匹配特定內容等功能
- **pngcheck**：可用於檢查每個 chunk（數據塊）是否符合 PNG 格式，為修復 PNG 的一大利器

### 隱寫

- **steghide**：可以用來處理圖片和音頻的隱寫工具
- **zsteg**：用於檢測 PNG、BMP 圖片格式的隱寫數據，主要支援以下隱寫類型
  - LSB steganography in PNG & BMP
  - zlib-compressed data
  - OpenStego
  - Camouflage 1.2.1
  - LSB with The Eratosthenes set
- **StegSolve**：基於 Java 開發的圖片隱寫檢視器，也支援多種圖片格式，可以查看圖片的具體資訊、提取檔案的 RGB 資訊、進行立體試圖分析、瀏覽動圖的幀資訊以及進行圖片拼接等操作

### 位元處理

- **xxd**：Linux 系統的原生命令列工具，可用於將檔案轉換為十六進位、二進位的表示方式並對位元編輯，也能將編輯後檔案進行反轉
- **VsCode hex editor plugin**：VsCode 編輯器的插件，可將檔案以十六進位方式表示 bytes，並對此進行編輯（習慣用 GUI 很推這個編輯器）

### 封包分析

- **WireShark**：網路封包分析軟體，可以用來截取網路封包，顯示網路封包資料

### 磁碟分析

- **sleuthkit**：電子取證調查工具，可以使用 CLI 的方式於磁碟恢復丟失的文件、並對磁碟進行映像分析
- **autopsy**：sleuthkit 的網頁接口，基本上支援 sleuthkit 的所有功能，以 GUI 方式進行

### 實用網站

- **CyberChef**：一個圖形化介面的網站，提供加解密、加解碼、資料格式轉換、哈希計算、文本處理、網絡流量分析的超級瑞士刀
- **decodeUnicode.org**：一個網站記載 unicode 的編碼，包含 UTF-8、UTF-16 等表示方式

## 重要知識

### 常見檔案格式

圖片格式被程式讀取時，通常都是倒過來讀取的，所以將 bytes 轉換回 decimal 需要倒著計算，如下：  
> 00 04 00 00 的 4 個 bytes，應該要被解讀成 0x400(0x00000400)，也就是 1024 bytes  
注意不要算成 0x40000，這樣數字會超大

#### png format

PNG 圖像格式由一個 8 bytes 的檔案辨識標頭 + 3 個以上的資料塊（chunk）組成，即 file header + 3 chunks

File Header：89 50 4E 47 0D 0A 1A 0A

| hex bytesCode | description |
|  ----  | ----  |
| 89 | 檢測傳輸系統是否支援 8 位元的字元編碼，減少將文字檔案被錯誤的辨識成 PNG 檔案的機會。 |
| 50 4E 47 | 分別對應 PNG 的 ASCII，讓使用者方便辨識。 |
| 0D 0A | DOS 風格的換行符，也就是所謂的 CRLF。用於 DOS-Unix 資料的換行符轉換。 |
| 1A | 在 DOS 命令列下，用於阻止檔案顯示的檔案結束符。 |
| 0A | Unix 風格的換行符（LF）。用於 Unix-DOS 換行符的轉換。 |

***

Chunk：又可分為關鍵資料塊和輔助資料塊，每個資料塊的組成如下

| name | bytes count | description |
|  ----  | ----  |  ----  |
| Length | 4 bytes | 指定資料塊中資料區域的長度，長度不可超過(2^31-1)個位元組 |
| Chunk Type Code | 4 bytes | 由 ASCII 字母(A-Z和a-z) 組成 |
| Chunk Data | 可變長度 | 儲存指定的數據 |
| CRC | 4 bytes | 儲存用來檢測是否檔案傳輸有誤的循環冗餘碼 |

關鍵資料塊（critical chunk）:

- IHDR（header chunk）：包含圖像基本資訊，作為第一個資料塊出現並只出現一次。
- PLTE（palette chunk）：必須放在 IDAT 之前。
- IDAT（image data chunk）：儲存實際圖像資料。PNG 資料允許包含多個連續的 IDAT。
- IEND（image trailer chunk）：放在檔案尾部，表示 PNG 資料流結束。

輔助資料塊（ancillary chunks）：

| Chunk Type Code | description | position limit |
| --- | --- | --- |
| cHRM | 基色和白色點資料塊 | 放在 PLTE 和 IDAT 之前 |
| gAMA | 圖像 γ 資料塊 | 放在 PLTE 和 IDAT 之前 |
| sBIT | 樣本有效位資料塊 | 放在 PLTE 和 IDAT 之前 |
| bKGD | 背景顏色資料塊 | 放在 PLTE 之後 IDAT 之前 |
| hIST | 圖像直方圖資料塊 | 放在 PLTE 之後 IDAT 之前 |
| tRNS | 圖像透明資料塊 | 放在 PLTE 之後 IDAT 之前 |
| pHYs | 物理像素尺寸資料塊 | 放在 IDAT 之前 |
| tIME | 圖像最後修改時間資料塊 | 無限制 |
| tEXt | 檔案基本訊息資料塊 | 無限制 |
| zTXt | 壓縮文字資料塊 | 無限制 |
| eXIf | 可交換圖像文件格式 (Exif) 資料塊 | 放在 IHDR 和 IEND 之間，但不能在 IDAT 之間 |
| sCAL | (專用公共數據塊) | 放在 IDAT 之前 |
| oFFs | (專用公共數據塊) | 放在 IDAT 之前 |
| fRAc | (專用公共數據塊) | 無限制 |
| gIFg | (專用公共數據塊) | 無限制 |
| gIFt | (專用公共數據塊) | 無限制 |
| gIFx | (專用公共數據塊) | 無限制 |

#### bmp format

BMP 格式由 File Header + Info Header + (optional palette) + Raw Data 組成  
不過通常 optional palette 不會出現，所以也可以將其省略

File Header：用於辨識 BMP 格式，總共佔 14 bytes，組成如下

| name | bytes count | description |
| --- | --- | --- |
| type | 2 bytes | 剛好對應 BM 的 ASCII，也就是 0x42、0x4D |
| size | 4 bytes | 紀錄 BMP 檔案的大小 |
| reserved 1 | 2 bytes | 保留欄位 |
| reserved 2 | 2 bytes | 保留欄位 |
| offset | 4 bytes | 具體圖片資料離檔案開頭的偏移量 |

Info Header：BMP 圖片的 meta data，組成如下

| name | bytes count | description |
| --- | --- | --- |
| size | 4 bytes | 表示 Info Header 的長度 |
| width | 4 bytes | 圖檔寬度為多少 pixel |
| height | 4 bytes | 圖檔高度為多少 pixel |
| planes | 2 bytes | 位元圖層數 |
| bits | 2 bytes | 每個 pixel 需要多少 bits |
| compression | 4 bytes | 0，代表不壓縮；1，代表壓縮 |
| imagesize | 4 bytes | 點陣圖的資料大小 |
| xresolution | 4 bytes | 水平解析度 |
| yresolution | 4 bytes | 垂直解析度 |
| ncolours | 4 bytes | 點陣圖使用的調色盤顏色數 |
| importantcolours | 4 bytes | 重要的顏色數 |

Raw Data：剩下的就是點陣圖的檔案資料，需要注意幾點

1. 按照 info header 的 bits 決定每幾個 bytes 一組。如 bits 為 0x20，就代表每四個 bytes 一組
2. 若圖片的長寬都是 16 pixels，就代表圖片的每一列需要 16 x 4 = 64 bytes，整張圖需要 64 * 16 = 1024 bytes，而這也就是 Raw Data 的長度

#### zip format

Zip 格式由 Local file header + Central directory file header + End of central directory record 組成

Local file header signature：主要查看是否有 PK 標頭，即 0x04034b50
Central directory file header signature： 0x02014b50
End of central directory signature： 0x06054b50

除了這些標頭，其他每個 bytes 也都有特別意義，但在打 picoCTF 時沒有使用到，就暫先不提

### 一些特別的 Protocol

- TFTP：為 TCP/IP 協定中一種簡單的檔案傳輸協定，基於 UDP 協定傳送檔案，只能從檔案伺服器下載或上傳檔案，並不能列出目錄
- UPnP：一種通訊協定，提供家中的設備可以輕易的自動連結到網路並完成相關設定。也就是說如果作業系統有開啟這項協定，就會自動新增設備於電腦上
- SSDP：在 UPnP 的環境中，提供了一個網路用戶端可以用來發現網路服務的機制，使用 1900 Port
- ARP（位址解析協定）：一種網路協議，用於將 IP 位址對應到 MAC 位址
- DNS：一套用於將容易記憶的域名轉換為對應的 IP 地址的系統

## 題目紀錄

### Simple Recon

遇到未知的檔案可以先用以下工具、命令先蒐集資訊

- `file [file name]`：確認檔案類型
- 拿 zsteg（只有 PNG、BMP 才有用）、binwalk、exiftool 解析檔案
- 如果是圖片嘗試把圖片打開 => 檔案修復、找線上工具
- 打開 hex Editor 看 hex bytes 或 strings 抓取可閱讀部分
- 資訊蒐集完，進一步猜測要做**隱寫解析**、**隱藏檔案提取**、**檔案修復處理**等經典題目操作
- 以上都沒有的話就可以開始通靈了

如果很明確的是 pcap、pcapng 這種網路封包的檔案，那就是開 wireshark 去解析，以下為常見操作

- Dump files
- String search
- Follow tcp or udp
- IO Graphs
- Statistic Analyize
- Extract Protocol File

如果是 disk img ，那就是要作磁碟映像分析，通常用到 Sleuthkit（CLI）、Autopsy（GUI）分析  
常見的 SleuthKit 命令：

- `mmls`：將磁碟的每一層資訊列出
- `fls`：將磁碟檔案列出，通常會搭配偏移量 `-o`
- `icat`：抓取磁碟檔案的內容，通常會搭配偏移量 `-o`

### General

#### [information](https://play.picoctf.org/practice/challenge/186?category=4&originalEvent=34&page=1)

照著 Simple Recon 走一遍，可以發現在 exiftool 解析時發現奇怪的資訊
![challenge1](/gallery/2024-05-06/challenge1.png)
把這兩段亂碼拿去 base64 decode 看看

```bash
echo "7a78f3d9cfb1ce42ab5a3aa30573d617" | bas64 -d
echo "cGljb0NURnt0aGVfbTN0YWRhdGFfMXNfbW9kaWZpZWR9" | base64 -d
```

![challenge1-2](/gallery/2024-05-06/challenge1-2.png)

#### [Matryoshka doll](https://play.picoctf.org/practice/challenge/129?category=4&originalEvent=34&page=1)

發現在 binwalk 解析時，有隱藏的圖片，也就是圖中圖

> Zip archive data, at least v2.0 to extract, compressed size: 378952, uncompressed size: 383937, name: base_images/2_c.jpg

![challenge2](/gallery/2024-05-06/challenge2.png)

所以把圖片擷取出來吧，節取出來的資料夾會以 `_extract` 開頭

```bash
binwalk -e dolls.jpg
```

然後照著做下去到第四層時，就會找到 FLAG 了，套的真深
![challenge2-2](/gallery/2024-05-06/challenge2-2.png)

### Format Restore

#### [tunn3l v1s10n](https://play.picoctf.org/practice/challenge/112?category=4&originalEvent=34&page=1)

先用 exiftool 解析，在 File Type 資訊可以知道這是一張 BMP  

![challenge3-3](/gallery/2024-05-06/challenge3-3.png)

接著打開 Hex Editor，查看 Hex Bytes 有沒有錯誤才會導致程式解析失敗

![challenge3](/gallery/2024-05-06/challenge3.png)

File Header

- type：符合 42、4D => 不用修改
- size：8E 26 2C 00，表示 0x2C268E（2893454 bytes），也符合資訊 => 不用修改
![challenge3-2](/gallery/2024-05-06/challenge3-2.png)
- reserved：00 00 00 00，兩個保留區 => 不用修改
- **offset**：偏移量不符合 => BA D0 00 00 應該要設置為 36 00 00 00
  
Info Header

- size：長度不符合 => BA D0 00 00 應該要設置為 28 00 00 00

接著要計算圖片大小是不是 2893454 bytes

- 圖片的寬：6E 04 00 00 => 0x46E（1134 pixels）
- 圖片的高：32 01 00 00 => 0x132（306 pixels）
- 圖層數：01 00 => 0x1（1 層）
- 每個 pixels 需要多少 bits：18 00 => 0x18（24 bits）

計算結果：1134 x 306 x 1 x 24 / 8 = 1041012 bytes => 不符合，所以要通靈修改哪一個資訊  
修改過程：2893454 * 8 / 24 / 1134 = 850.5（0x352） => 將圖片的高改成 52 03 00 00

最後將副檔名改成 .bmp 就可以把圖片解析出來了

#### [c0rrupt](https://play.picoctf.org/practice/challenge/53?category=4&originalEvent=1&page=1)

先用 exiftool 解析檔案，但很可惜推測不出檔案類型

![challenge5-8](/gallery/2024-05-06/challenge5-8.png)

那就直接打開 Hex Editor 通靈檔案格式，可以看到以 89 開頭，又有 N 的 ASCII，此外又出現 pHYs 的 chunk name，所以應該是 PNG。

![challenge5](/gallery/2024-05-06/challenge5.png)

那就開始修復 PNG 吧，這邊可以搭配 pngcheck，會幫助我們偵測這張 PNG 哪裡有錯

File Header 修復：89 50 4E 47 0D 0A 1A 0A
![challenge5-2](/gallery/2024-05-06/challenge5-2.png)

Chunks 修復

pngcheck 提示 1： 修復 IHDR
![challenge5-3](/gallery/2024-05-06/challenge5-3.png)
![challenge5-10](/gallery/2024-05-06/challenge5-10.png)
pngcheck 提示 2： 修復 pHYS 的 CRC 部分
![challenge5-4](/gallery/2024-05-06/challenge5-5.png)
![challenge5-11](/gallery/2024-05-06/challenge5-11.png)
pngcheck 提示 3： 修復無效的 chunk 長度，將 AA AA FF A5 改成 00 00 FF A5
![challenge5-5](/gallery/2024-05-06/challenge5-6.png)
![challenge5-12](/gallery/2024-05-06/challenge5-12.png)
pngcheck 提示 4： 修復 IDAT
![challenge5-6](/gallery/2024-05-06/challenge5-7.png)
![challenge5-13](/gallery/2024-05-06/challenge5-13.png)

這樣就完成 PNG 修復了
![challenge5-7](/gallery/2024-05-06/challenge5-9.png)

### Flow Analyize

#### [shark on wire 1](https://play.picoctf.org/practice/challenge/30?category=4&originalEvent=1&page=1)

用 wireshark 打開檔案後，快速翻閱一下 Protocol，可以看到很多 UDP，猜測 FLAG 應該藏在 UDP 內
> 可以點擊中間畫面的 Protocol Column，就會以 Protocol Name 的方式排序，這樣就能把相同的 Protocol 聚集起來

![challenge4](/gallery/2024-05-06/challenge4.png)

要檢視 udp Protocol，可以對想要檢視的 Protocol 點右鍵後就會有一個 Follow > UDP Stream 的功能，這樣就能去分析這份 protocol stream 的內容，要切換 stream 只要點擊右下角

![challenge4-3](/gallery/2024-05-06/challenge4-3.png)

翻著翻著就會找到 FLAG 了，可以知道是在 udp stream 6

![challenge4-2](/gallery/2024-05-06/challenge4-2.png)

#### [Eavesdrop](https://play.picoctf.org/practice/challenge/264?category=4&originalEvent=70&page=1)

打開 wireshark 查看 pcap，從 tcp stream 0 可以看出以下的聊天紀錄
![challenge6](/gallery/2024-05-06/challenge6.png)

從聊天紀錄可以知道用 openssl 來解碼，所以我們還需要在找到被加碼的檔案，在 packet 61，發現這一個被加鹽過的檔案內容，所以我們可以合理懷疑就是這份檔案
![challenge6-2](/gallery/2024-05-06/challenge6-2.png)

所以把這個檔案抓出來，可以使用 pyshark 來抓取，或者將內容以 Hex Bytes 的方式呈現再手動填入。以下為參考腳本

```python
import subprocess

data = b"\x53\x61\x6c\x74\x65\x64\x5f\x5f\x3c\x4b\x26\xe8\xb8\xf9\x1e\x2c\x4a\xf8\x03\x1c\xfa\xf5\xf8\xf1\x6f\xd4\x0c\x25\xd4\x03\x14\xe6\x49\x7b\x39\x37\x58\x08\xab\xa1\x86\xf4\x8d\xa4\x2e\xef\xa8\x95"
with open ("file.des3", "wb") as f:
    f.write(data)

openssl_cmd = [
    'openssl',
    'des3',
    '-d',
    '-salt',        
    '-in', 'file.des3',
    '-out', 'file.txt',
    '-k', 'supersecretpassword123'
]

subprocess.run(openssl_cmd, check=True)
with open('file.txt', 'r') as f:
    print(f.read())
```

### Disk Analyize

#### [Sleuthkit Apprentice](https://play.picoctf.org/practice/challenge/300?category=4&originalEvent=70&page=1)

這一題要用 Sleuthkit 的命令列工具來對磁碟映像解析，按照 Simple Reconn 實作一遍  
先用 `mmls` 把磁碟的每一層資訊列出來
```bash
mmls disk.flag.img
```
![challenge7](/gallery/2024-05-06/challenge7.png)

接著用 `fls` 列出資料夾，這裡要搭配 `-o` 參數，可以看到第一個 Linux 的開始位元組是在 2048，所以先把他列出來

```bash
fls -o 2048 disk.flag.img
```

![challenge7-2](/gallery/2024-05-06/challenge7-2.png)

可以看到這些資料夾沒有熟悉的部分，所以繼續往下找

```bash
fls -o 360448 disk.flag.img
```

![challenge7-3](/gallery/2024-05-06/challenge7-3.png)

可以看到有一個 root 資料夾，所以繼續往下找

```bash
fls -o 360448 disk.flag.img 1995
```

![challenge7-4](/gallery/2024-05-06/challenge7-4.png)

可以看到裡面有個 my_folder 資料夾，繼續往下找

```bash
fls -o 360448 disk.flag.img 3981
```

![challeneg7-5](/gallery/2024-05-06/challenge7-5.png)

接著將 flag.uni.txt 抓取內容出來

```bash
icat -o 360448 disk.flag.img 2371
```

![challeneg7-6](/gallery/2024-05-06/challenge7-6.png)

> d/d：是資料夾  
> r/r：是檔案，有些檔案會標註 realloc，代表以前有配置這份檔案

至於其他 picoCTF 的題目，另作一份[**筆記**](https://kevins-organization-14.gitbook.io/picoctf-writeup/)詳閱

## 參考資料

- [Sleuthkit TSK Tool](https://wiki.sleuthkit.org/index.php?title=TSK_Tool_Overview#File_System_Tools)
- [zip format](https://en.wikipedia.org/wiki/ZIP_(file_format))
- [bmp format](https://blog.csdn.net/qq_41137110/article/details/119893817)
- [png format](http://www.libpng.org/pub/png/spec/1.2/PNG-Structure.html)