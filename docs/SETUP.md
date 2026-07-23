# WeTravel 保姆級自架教學（零基礎版）

> 這份教學假設你**完全沒碰過 GitHub 和 Firebase**，每一步都會告訴你：畫面上會看到什麼 → 點哪個按鈕 → 應該出現什麼結果。
> 已經熟悉這些工具的人，看 [README 的精簡版五步驟](https://github.com/benson5566/WeTravel-App/blob/main/README.md#-自行架設教學約-10-分鐘全程免費) 就夠了。
>
> 介面按鈕文字以 2026 年的 Google／GitHub 介面為準，日後可能微調，但流程不變。

---

## 第 0 章：開始之前

**你需要準備：**

- 一個 email 信箱（收驗證信用）
- 一台電腦＋瀏覽器（全程不需要安裝任何軟體、不需要打指令）
- 約 30 分鐘

**費用：全程免費、不用綁信用卡。**

**做完之後你會得到：**

- 一個屬於你自己網址的旅遊規劃 App（例如 `https://你的帳號.github.io/WeTravel-App/`）
- 可以「加入主畫面」裝到手機，像原生 App 一樣用
- 把連結傳給旅伴，兩個人就能即時共編行程、記帳、勾行李清單
- 所有資料存在**你自己的**資料庫裡，沒有任何第三方（包括本專案作者）看得到

---

## 第 1 章：註冊兩個帳號

### 1.1 Google 帳號

Firebase（資料庫）是 Google 的服務。**如果你有 Gmail，就已經有 Google 帳號，直接跳到 1.2。**

沒有的話：

1. 開 [accounts.google.com/signup](https://accounts.google.com/signup)
2. 照畫面填姓名、想要的帳號名稱、密碼 → **繼續**
3. 依指示驗證手機號碼，完成註冊

### 1.2 GitHub 帳號

GitHub 負責放程式碼＋免費幫你架網站。

1. 開 [github.com/signup](https://github.com/signup)
2. 輸入 email → 設密碼 → 取一個帳號名稱（**這會出現在你的網址裡**，例如帳號叫 `kitty123`，網址就是 `kitty123.github.io/...`，建議取短一點的英文）
3. 到信箱收驗證碼，填回畫面
4. 之後問你的偏好問題可以一路 **Skip／Continue** 跳過

> 🧱 **卡關**：沒收到驗證信？檢查垃圾郵件夾；或回畫面點 **Resend the code**。

---

## 第 2 章：複製專案（Fork）

「Fork」＝把這個專案完整複製一份到你自己的帳號底下，之後你改的都是自己那份。

1. 登入 GitHub 後，開本專案頁面：[github.com/benson5566/WeTravel-App](https://github.com/benson5566/WeTravel-App)
2. 點右上角的 **Fork** 按鈕（在 Star 旁邊）
3. 進到「Create a new fork」畫面，什麼都不用改，點綠色的 **Create fork**
4. 等幾秒，畫面跳轉——注意看左上角，變成了「**你的帳號** / WeTravel-App」就代表成功了。之後所有操作都在**你自己這份**上進行。

---

## 第 3 章：建立 Firebase 專案（資料庫）

### 3.1 建立專案

1. 開 [console.firebase.google.com](https://console.firebase.google.com)（用第 1 章的 Google 帳號登入）
2. 點 **請設定 Firebase 專案 / 建立新的 Firebase 專案**
3. 專案名稱隨意取（例如 `my-wetravel`）→ **繼續**
4. 問你要不要啟用 Google Analytics：**建議關掉**（用不到）→ **建立專案**
5. 等它轉圈跑完，點 **繼續**，進到專案主控台

### 3.2 啟用匿名登入

App 用「匿名登入」讓使用者免註冊就能用，但資料庫仍然擋掉未經 App 的存取。

1. 左側選單 → **安全性** → **Authentication**
2. 點 **開始使用**（Get started）
3. 在「登入方式」（Sign-in method）分頁的供應商清單裡，點 **匿名**（Anonymous）
4. 把開關切到**啟用** → **儲存**
5. 清單裡「匿名」那列顯示「已啟用」＝完成

### 3.3 建立 Firestore 資料庫

1. 左側選單 → **資料庫和儲存空間** → **Firestore Database**
2. 點 **建立資料庫**（Create database）
3. 位置（Location）：選離你近的，台灣選 `asia-east1`（臺灣）→ **下一步**
4. 安全規則模式：選 **正式版模式**（Production mode）→ **建立**

> ⚠️ 千萬不要選「測試模式」——那會讓網路上任何人都能讀寫你的資料庫。下一步我們會貼上正確的規則。

### 3.4 貼上安全規則

1. 還在 Firestore Database 頁面，切到上方的 **規則**（Rules）分頁
2. 另開一個分頁，打開你 fork 的 repo 裡的 [`firestore.rules`](https://github.com/benson5566/WeTravel-App/blob/main/firestore.rules) 檔案，把整份內容複製起來
3. 回到 Firebase 的規則編輯器，**全選刪掉原本的內容**，貼上剛複製的規則
4. 點 **發布**（Publish）
5. 畫面顯示發布成功＝完成。這份規則的意思是：只有透過 App（匿名登入）的人能讀寫行程資料，其他一律拒絕。

---

## 第 4 章：把你的 Firebase 設定填進 App

### 4.1 取得設定值

1. Firebase 主控台左上角，點 **專案總覽** 下方的**齒輪（設定）** → **一般**
2. 停在 **一般**（General）分頁，往下捲到「你的應用程式」區塊
3. 點 **`</>`**（網頁）圖示新增應用程式
4. 應用程式暱稱隨意填（例如 `wetravel`）；「Firebase 託管」**不用勾** → **註冊應用程式**
5. 畫面出現一段程式碼，中間有一塊長這樣的東西——**這一塊就是你要的**，先把這個分頁留著別關：

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "my-wetravel.firebaseapp.com",
  projectId: "my-wetravel",
  storageBucket: "my-wetravel.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

> 💡 這些值（包括 apiKey）本來就是公開的識別碼、不是密鑰，放在前端是正常設計；真正保護資料的是第 3.4 章的安全規則。

### 4.2 在 GitHub 網頁上直接編輯（不用安裝任何東西）

1. 回到你 fork 的 repo（`github.com/你的帳號/WeTravel-App`）
2. 在檔案列表點進 **`firebase-config.js`**
3. 點檔案內容右上方的**鉛筆圖示**（Edit this file）進入編輯模式
4. 對照 4.1 留著的那個分頁，把每一行的 `YOUR_...` 佔位值換成你自己的值：
   - `YOUR_API_KEY` → 你的 `apiKey`
   - `YOUR_PROJECT_ID.firebaseapp.com` → 你的 `authDomain`
   - `YOUR_PROJECT_ID` → 你的 `projectId`（storageBucket 那行也有一個）
   - `YOUR_SENDER_ID` → 你的 `messagingSenderId`
   - `YOUR_APP_ID` → 你的 `appId`
5. 檢查兩件事：每個值**前後的引號 `"` 都還在**；行尾的**逗號都沒被刪掉**
6. 點右上角綠色 **Commit changes...** → 跳出視窗再點一次 **Commit changes**（＝存檔）

---

## 第 5 章：上線（GitHub Pages）

1. 你的 repo 頁面 → 上方 **Settings** 分頁
2. 左側選單找到 **Pages**
3. 「Build and deployment」的 Source 選 **Deploy from a branch**
4. Branch 選 **`main`**、資料夾選 **`/ (root)`** → **Save**
5. 等 1–2 分鐘，重新整理這個頁面，最上方會出現：
   **Your site is live at `https://你的帳號.github.io/WeTravel-App/`**
6. 點 **Visit site**——看到粉紅色的 WeTravel 畫面就是成功了！🎉

> 🧱 **卡關**：等了很久頁面還是 404？先確認 Branch 真的選了 `main` 並按過 Save；然後到 repo 的 **Actions** 分頁看看「pages build and deployment」是不是綠色勾勾。

---

## 第 6 章：開始使用

1. **建立第一筆旅程**：開啟你的網址，填目的地、出發日、天數 → 出發！
2. **邀請旅伴**：App 右上角的分享按鈕會產生連結，傳給旅伴——**知道連結的人就能共編**這趟旅程（所以只傳給信任的人）
3. **裝到手機**：
   - iPhone：Safari 開你的網址 → 分享按鈕 → **加入主畫面**
   - Android：Chrome 開你的網址 → 右上選單 → **安裝應用程式**
4. 之後有新旅程都在 App 內左上角選單建立；不再用的旅程按封存鈕收起來（資料不會消失，「所有旅程 → 已封存」隨時取回）

---

## 第 7 章：常見問題排錯

**Q1：畫面顯示「尚未設定 Firebase：請編輯 firebase-config.js…」**
→ 第 4 章沒做完或值沒填對。回去檢查 `firebase-config.js`：是不是還留著 `YOUR_` 開頭的佔位值？引號、逗號有沒有少？改完 commit 後等 1–2 分鐘再重新整理。

**Q2：畫面顯示「存取被拒絕」（permission-denied）**
→ 兩個可能：①第 3.2 章的匿名登入沒啟用；②第 3.4 章的安全規則沒發布成功。照章節重做一次。

**Q3：網址打開是 404**
→ 看第 5 章的卡關框。另外注意網址結尾的 `/WeTravel-App/` 大小寫要跟 repo 名稱一致。

**Q4：我改了設定，但 App 看起來沒變**
→ GitHub Pages 每次 commit 後要 1–2 分鐘重新部署；手機上的 App 有快取，等它跳出「有新版本」提示點更新，或先用無痕視窗確認新版已上線。

**Q5：無法連線到伺服器**
→ 檢查網路；如果是公司／學校網路，可能擋了 Google 服務，換個網路試試。

**Q6：「更新上線」之後 App 反而連不上（行程載入失敗／內容空白，重新整理也沒用）**
→ 更新會觸發 App 的快取切換，當時開著 App 的瀏覽器偶爾會被卡住連線（短時間內連續更新多次時特別容易）。**把瀏覽器完全關閉再重開（手機建議直接重開機）就會恢復**——資料都在雲端不會不見，不用清網站資料、不用改任何設定。

---

## 第 8 章：換素材＋更新上線（把預設圖換成你自己的）

預設素材是 Hello Kitty 主題、僅供個人自用示範；想換成自己的圖，照下面做，**全程不用打指令**。

### 8.1 準備：安裝 Node.js（只做一次）

1. 打開 [nodejs.org](https://nodejs.org)，點綠色的 **LTS** 下載鈕
2. 執行下載的安裝檔，一路「下一步」到完成即可（全部用預設值）

### 8.2 把專案下載到電腦

1. 打開**你 fork 的 repo** 頁面（網址是 `github.com/你的帳號/WeTravel-App`）
2. 點綠色 **Code** 鈕 → **Download ZIP**
3. 對下載的 ZIP 按右鍵 → 解壓縮，會得到一個資料夾

### 8.3 換圖

1. 打開解壓出來的資料夾，**雙擊「換素材工具.bat」**（Mac 用戶：終端機執行 `cd tools && node gui.mjs`）
2. 第一次會先自動安裝元件（黑視窗跑約 1 分鐘），然後瀏覽器自動打開「素材牆」——每格是一張可換的圖，寫著用途和尺寸
3. 把你的新圖**拖進想換的格子**（或點「選擇圖片…」）→ 出現編輯視窗：拖動調位置、滾輪縮放、可旋轉 → 按「**確認替換**」
4. 想換幾張就重複幾次；換錯了按格子上的「**還原上一版**」
5. 畫面上方顯示「✅ 24 張全部合格」就代表沒問題

### 8.4 更新上線

1. 按工具右上角「**🚀 上線更新**」（換過圖才會亮起）
2. 第一次會請你貼 repo 網址：把 8.2 第 1 步的網址貼上 → 按「開啟上傳頁」（會記住，之後一鍵直達）
3. 在打開的 GitHub 上傳頁：把解壓資料夾裡的 **`assets` 資料夾**和 **`sw.js`** 一起拖進上傳區（有換 App 圖示再加 `icon-192.png`、`icon-512.png`）
4. 按綠色 **Commit changes** → 等 1–2 分鐘，你的網站就會自動換上新圖（手機 App 等它跳「有新版本」提示，或重新整理）

---

## 附錄

### A. 免費額度夠用嗎？

夠。Firebase Spark 免費方案每天 5 萬次讀取、2 萬次寫入，兩三個人規劃旅程的用量連零頭都用不到；GitHub Pages 對公開 repo 完全免費。整套不綁信用卡，**不可能被扣款**（額度用完只會暫時不能同步，隔天重置）。

### B. 我的資料放在哪？

存在**你自己的** Firebase 專案裡（你的 Google 帳號名下）。本專案作者和其他架設者都碰不到你的資料。要留意的只有一點：旅程連結＝鑰匙，別公開張貼。

### C. 日後怎麼更新到新版？

本專案有更新時，到你 fork 的 repo 首頁，若看到「This branch is N commits behind…」，點旁邊的 **Sync fork** → **Update branch** 即可。你的 `firebase-config.js` 改動會保留。
（若 GitHub 提示有衝突，最簡單的做法：記下你的設定值 → 點 Discard commits → 照第 4.2 章重填一次。）

### D. 想把預設的 Hello Kitty 素材換成自己的圖？

看**第 8 章**——有圖形介面工具，全程不用打指令。每張圖的用途對照表在 [`docs/ASSETS.md`](./ASSETS.md)。零基礎的話可以先不管，不影響使用。
