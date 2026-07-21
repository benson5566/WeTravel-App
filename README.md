# WeTravel ✈️

專為**雙人／小團體**設計的開源旅遊規劃 PWA：即時協作、離線瀏覽、記帳分帳。
純靜態網頁 + 你自己的 Firebase，**免費自行架設**，資料完全在你自己手上。

## ✨ 主要功能

- 📅 **行程規劃**：每日時間軸安排景點與交通、航班資訊，依時間自動排序
- ☁️ **即時協作**：透過 Firebase Firestore，一人修改、旅伴秒同步
- 🔗 **分享行程**：一條連結即可邀請旅伴加入共編
- 💰 **記帳**：總花費與每人各付小計、成員可自訂增刪，支援多國貨幣、自動抓匯率
- 📍 **口袋名單**：蒐集想去的地點（可分類、拖曳排序），支援 Google Maps / Naver Map / 高德地圖導航
- 🌤️ **天氣預報**：目的地 16 天預報（open-meteo）
- 📱 **PWA**：可安裝到手機主畫面、離線查看行程

## 🚀 自行架設教學（約 10 分鐘，全程免費）

> 🐣 **完全沒碰過 GitHub／Firebase？** 請看零基礎保姆級完整教學 → [`docs/SETUP.md`](./docs/SETUP.md)（從註冊帳號開始、每個按鈕都寫給你）。以下是給熟手的精簡版。

### 步驟 1：Fork 本專案
點右上角 **Fork**，把專案複製到你自己的 GitHub 帳號。

### 步驟 2：建立自己的 Firebase 專案
1. 到 [Firebase Console](https://console.firebase.google.com) → **建立專案**（免費 Spark 方案即可，不需綁信用卡）
2. 專案建好後：**建構 → Authentication → 開始使用 → 登入方式** 啟用「**匿名**」
3. **建構 → Firestore Database → 建立資料庫**：選「正式版模式」、區域選離你近的（如 `asia-east1`）

### 步驟 3：設定安全規則
Firestore Database → **規則** → 貼上本專案 [`firestore.rules`](./firestore.rules) 的內容 → **發布**。

> ⚠️ 請勿使用「測試模式」規則上線，那會讓任何人都能讀寫你的資料庫。

### 步驟 4：填入你的 Firebase 設定
1. Firebase Console → 專案設定（齒輪）→ **一般** → 你的應用程式 → **新增應用程式**（選網頁 `</>`）
2. 複製顯示的 `firebaseConfig` 各欄位值
3. 編輯你 repo 裡的 [`firebase-config.js`](./firebase-config.js)，把 `YOUR_...` 佔位值全部換成你自己的值，commit

> 💡 網頁版 Firebase `apiKey` 本來就是公開的識別碼、不是密鑰，放在前端是正常的；真正保護資料的是步驟 3 的安全規則。

### 步驟 5：開啟 GitHub Pages
1. 你的 repo → **Settings → Pages**
2. Source 選 **Deploy from a branch**，選 `main`、資料夾 `/ (root)` → Save
3. 等 1–2 分鐘，取得網址（如 `https://你的帳號.github.io/wetravel/`）
4. 把網址分享給旅伴，開始協作！

### 本機測試
```bash
# 任一靜態伺服器即可，例如：
python3 -m http.server 8000
# 開 http://localhost:8000
```
直接雙擊 `index.html` 也能看，但 PWA / 模組載入功能需經由 http 伺服器。

## 🛠️ 技術架構

| 層 | 技術 |
|---|---|
| 前端 | Vue 3 (Composition API, CDN ESM) |
| 樣式 | Tailwind CSS (CDN) + Phosphor Icons |
| 後端 | Firebase 10.7.1（Firestore + 匿名 Auth）|
| 拖拉排序 | SortableJS |
| 外部 API | open-meteo（天氣）、exchangerate-api（匯率）、Nominatim（地理編碼）|
| 部署 | 純靜態，GitHub Pages / Firebase Hosting / 任意靜態主機 |

**資料模型**：所有行程存於 Firestore `trips/{tripId}`；行程清單索引存在瀏覽器 localStorage。協作模型為「知道連結即可共編」——請只把分享連結給你信任的旅伴。

## 🎨 更換素材（把預設圖換成你自己的）

所有 UI 圖片（splash、吉祥物、導覽列圖示、頭像、PWA icon…共 24 檔）都可以直接替換，**不用改任何程式碼、不用打指令**：

**圖形介面（推薦）**——需先安裝 [Node.js](https://nodejs.org)（LTS 版）：
- **Windows**：把專案下載到電腦（Code → Download ZIP → 解壓），雙擊「`換素材工具.bat`」，瀏覽器會自動打開素材牆——拖圖進格子、調裁切、按「確認替換」即完成；換錯按「還原上一版」。
- **Mac／Linux**：`cd tools && npm install`（第一次）後 `node gui.mjs`。
- 換完按工具右上角「🚀 上線更新」，照步驟卡把 `assets` 資料夾＋`sw.js` 拖回 GitHub 上傳頁，1–2 分鐘後你的網站自動更新。零基礎完整教學見 [`docs/SETUP.md`](./docs/SETUP.md) 第 8 章。

<details><summary>進階：指令列換圖</summary>

1. 查 [`docs/ASSETS.md`](./docs/ASSETS.md) 對照表，找到你要換的檔名與建議尺寸
2. 執行替換工具（自動裁切壓縮成規格、自動 bump Service Worker 版本）：
   ```bash
   cd tools && npm install
   node replace.mjs <檔名> <你的新圖路徑>   # 例：node replace.mjs bow_pink.png ~/my-logo.png
   node replace.mjs icon <你的新圖路徑>     # PWA icon 特例，一次產出 192/512 兩檔
   ```
3. 全量驗收：`node check.mjs`（24 檔規格全綠即可部署）
</details>

> 注意：預設素材含 Hello Kitty／Sanrio 圖像，僅供個人自用示範；公開部署請務必換成你自己的素材。

## 📱 安裝到手機 (PWA)
1. 手機瀏覽器開啟你部署的網址
2. iOS Safari：分享 → 「加入主畫面」；Android Chrome：選單 → 「安裝應用程式」

## 🔒 隱私與安全須知
- 資料存在**你自己的** Firebase 專案，專案作者無法存取
- 匿名登入 + 安全規則：未登入者無法讀寫；非 `trips` 路徑一律拒絕
- 分享連結（含 tripId）等同行程的鑰匙，請勿公開張貼

## 📄 授權
[MIT](./LICENSE)
