# DEVLOG — WeTravel-App（開源版）

## 檔頭常駐區（覆寫式）
- **專案簡介**：WeTravel 的開源發行版（GitHub: benson5566/WeTravel-App）——使用者 fork 後自帶 Firebase 免費自架；MIT 授權。
- **上游**：`../wetravel`（私有版）為功能開發主場，本 repo 為去敏化鏡像，改動採手動同步。
- **長效決策**：
  - `firebase-config.js` 只放 `YOUR_...` 佔位值；**真實金鑰嚴禁 commit**。
  - 安全模型：匿名 Auth＋firestore.rules（僅 trips 路徑可讀寫）；README 明示勿用測試模式規則。
  - CDN 依賴一律 pin 版本（tailwind 3.4.16／phosphor 2.1.1／sortablejs 1.15.6）——比私有版嚴格，同步時勿被 latest 蓋回。
- **素材政策（2026-07-18 定案）**：assets/ 維持 Hello Kitty／Sanrio 素材不換（Benson 拍板；IP 風險已知悉並接受，README 有「僅供個人自用示範、公開部署請自行換圖」聲明）。**替換機制已交付**（README「更換素材」章節＋`docs/ASSETS.md`＋`tools/replace.mjs`），要不要換、換成什麼＝使用者自己的事。此項結案，勿再列待辦。
- **DEVLOG 撰寫禁令**：本 repo 為公開 repo，**DEVLOG／README 等文件內文一律不得寫出上游真實專案識別字串**（api key、專案 id、sender id、app id 的實際值），描述掃描或設定時只寫樣式名稱。2026-07-16 曾在同步條目內文寫出真實專案 id 並 push（已於後續 commit 改寫為樣式名稱）。

---

## 2026-07-21（同步上游：素材替換 GUI＋「🚀 上線更新」鈕＋Windows 雙擊入口 ✅）
- 上游 GUI 輪真機驗收通過後同步。新增：`tools/gui.mjs`（本機伺服器，只綁 127.0.0.1）＋`tools/gui.html`（素材牆＋裁切/旋轉編輯＋還原＋狀態列＋上線更新步驟卡）＋`tools/gui.test.mjs`＋根目錄`換素材工具.bat`（純 ASCII＋CRLF，`.gitattributes` 以 `*.bat -text` 鎖定）；覆蓋：`tools/replace.mjs`（拆出 encodeToSpec 核心）＋`tools/package.json`（test 加 gui）＋`docs/ASSETS.md`（GUI 優先＋上線更新段）。
- 「🚀 上線更新」＝oss 用戶免指令部署：換完圖按鈕亮起，照步驟卡把 assets＋sw.js 拖回自己 repo 的 GitHub 上傳頁，Pages 自動重佈。repo 網址存瀏覽器 localStorage，不進檔案。
- 文件：SETUP.md 新增**第 8 章「換素材＋更新上線」**（裝 Node→載 ZIP→雙擊工具→換圖→拖回 GitHub 全圖解）、附錄 D 改指向第 8 章；README「更換素材」改 GUI 為主、CLI 收進 details。`.gitignore` 加 `tools/backup/`。
- 驗證：oss 內 `npm test` **13 測全綠**（含 .bat ASCII＋CRLF 位元組不變式）；密鑰掃描（三組樣式）零殘留；bat hexdump 確認 CRLF 完好。

## 2026-07-21（還原素材上傳測試 ✅——維持「素材不換」定案）
- Benson 真機測試上游 GUI 工具的「上線更新」流程時，把 5 張測試圖＋sw.js 拖上了本 repo（`8d4aa96`）——流程驗證成功，但測試圖蓋掉 Sanrio 素材與檔頭素材政策不符。
- Benson 拍板：revert 還原原素材（`git revert 8d4aa96`，5 圖＋sw 版本全部復原）；GitHub Pages 維持不開（本 repo 是程式碼鏡像，非 hosted demo）。

## 2026-07-18（零基礎保姆級自架教學 `docs/SETUP.md` ✅）
- Benson 拍板：受眾＝零基礎網友（從註冊 Google/GitHub 帳號教起）、載體＝獨立 docs/SETUP.md（README 精簡版保留＋開頭導流一行）。
- 內容八章：開始之前／註冊帳號／Fork／Firebase（建專案+匿名登入+Firestore+規則）／填設定（GitHub 網頁鉛筆編輯，零指令）／GitHub Pages 上線／開始使用（含 PWA 安裝）／排錯 Q&A＋附錄（免費額度、隱私、Sync fork 更新、換素材連 ASSETS.md）。
- 寫作原則：每步「看到什麼→點什麼→應出現什麼」三段式；errorMap 錯誤文案（尚未設定 Firebase／存取被拒絕）與排錯 Q 對齊；rules/config 引用路徑已核實。

## 2026-07-18（同步上游：echo 修復＋「所有旅程」＋封存制 ✅ v41）
- 上游真機驗收通過（至 9ec957a／sw v41）後同步，三檔整檔覆蓋（index.html／sw.js／app.js），app.js 覆蓋後重做去敏化三件套（vue pin 3.5.13、config 改 import './firebase-config.js'、errorMap not-configured＋onMounted 守衛）。
- 內容：①**echo 資料遺失修復**——onSnapshot handler 本地有待存變更即跳過遠端快照（`if (timeout) return`）＋debouncedSave 進入存檔即 `timeout = null`，自己存檔的 ACK 不再吃掉 debounce 窗內新變更；②**「所有旅程」區塊**——旅程抽屜下方一次列出 Firestore 全部旅程（首開 getDocs、session 快取、手動重新整理），點卡加入我的清單；③**封存制**——「刪除旅程」全面改封存（`archived:true` merge，無真刪路徑），即點即封存＋undo toast，所有旅程卡片可直接封存，「已封存 (N)」收合列可取回；④全新用戶 setup modal 有「先看看現有旅程」入口。
- 驗證：`node --check` 過；密鑰掃描（三組樣式）零殘留；與上游 diff 僅 22 行＝去敏化足跡；CDN pin 全保留。
- oss 用戶影響：升級後既有「刪除」語意變成封存（資料保留在自己的 Firebase 裡）；新欄位 `archived` 免遷移（缺欄位＝正常）。

## 2026-07-18（同步上游：素材替換工具包＋壓縮素材＋清單重置改單人 ✅ v38）
- 上游真機驗收通過（至 ac1f636／sw v38）後同步。
- **素材替換工具包**：新增 `tools/`（`assets-spec.mjs` 24 檔單一真相源＋`check.mjs` 全量驗收含孤兒檔偵測＋`replace.mjs` 吃新圖壓規格覆蓋原檔並自動 bump sw、icon 特例產 192/512；三個 .test.mjs）＋`docs/ASSETS.md` 人讀對照表；README 加「🎨 更換素材」章節——**這就是換掉 Sanrio 素材的正式機制**。既有 `.gitignore` 的 `node_modules/` 已涵蓋 tools/node_modules，未另加規則。
- **素材全量更新**：22 檔壓縮版覆蓋（assets/ 6.4MB→1.7MB）、刪死檔 `icn_bear.png`／`kitty2.png`、PWA icon 改真尺寸 `icon-192/512.png`（manifest icons＋index favicon 同步修、刪謊報尺寸的 `icon.png`）。
- **功能同步**：清單重置鈕改**單人重置**（只清目前操作角色的勾選，confirm 文案帶成員名）；?v=32。本次採手術式套 diff 而非整檔覆蓋 app.js——去敏化三件套（vue pin 3.5.13／config import／not-configured 守衛）原樣保留，零重做風險。
- 驗證：`cd tools && npm test` 四測全過、`node check.mjs` 24 張全綠無孤兒；`node --check` app.js 過；密鑰掃描（三組樣式）零殘留；CDN pin 全保留。
- 素材去留定案：Benson 拍板**不換**預設素材——工具包本身就是交付終點，換圖是使用者自己的事（見檔頭素材政策）。

## 2026-07-16（同步上游：旅遊清單功能＋角色選單＋成員欄 ✅ v36）
- 上游 wetravel 真機驗收通過（至 fd86739／sw v36），同步：index.html＋sw.js 整檔覆蓋（先比對確認兩邊 CDN pin 已一致、無 oss 專屬差異）；**新檔 checklist-data.js＋tests/checklist-data.test.mjs**；app.js 覆蓋後重做去敏化三件套（vue pin 回 3.5.13、config 改 import './firebase-config.js'、errorMap 補 not-configured＋onMounted 佔位守衛）。
- 內容含：**旅遊清單分頁**（75 項模板／8 類收合／每人各勾各的，checkedBy keyed by 成員名，成員空退化 `__shared__`）、**清單角色 select**（標題旁，切換即切「目前幫誰勾」，選擇存 localStorage 屬裝置本地）、**setup modal 成員欄**（Destination 後，選填）、分類進度與項目劃線跟隨目前角色、換頁 transition 凍結自癒（`.view-pane` watchdog）。
- 驗證：`node --check` app.js／sw.js 過；checklist-data.js 模組載入 75 項；真金鑰值全 repo 掃描零殘留；CDN pin 全保留。
- 順手修：檔頭新增「DEVLOG 撰寫禁令」；7/16 前一筆同步條目內文誤寫真實專案 id，已改寫為樣式名稱（Firebase web config 本就隨前端出貨、非機密，實質曝險為零，屬衛生問題）。
- 待辦：替換 Sanrio 素材為中性素材（IP 風險，未解；上游已議定要先出「可更換圖片規格書＋機制」）。

## 2026-07-16（同步上游 UX 全量改動 ✅）
- 上游 wetravel 真機驗收通過（至 7cbabab／sw v32），全量同步：index.html＋sw.js 整檔覆蓋；app.js 覆蓋後重做去敏化三件套（vue pin 回 3.5.13、config 改 import './firebase-config.js'、errorMap 補 not-configured＋onMounted 佔位守衛）。
- 內容含：原生對話框退場（sheet/undo toast）、編輯全面彈窗化（draft 制）、iOS 鍵盤 visualViewport 修正、口袋類型＋⠿ 把手拖曳（真根因：transition out-in 使 Sortable 從未初始化，改輪詢掛載）、記帳簡化＋成員預設清空、對比 AA。
- 驗證：`node --check` 過；密鑰掃描零殘留（api key／專案 id／sender id 三組樣式）；CDN pin 全保留（tailwind 3.4.16／phosphor 2.1.1／sortablejs 1.15.6）；無頭實測佔位 config 正常顯示 not-configured 指引。
- README 功能描述更新（行程自動排序／記帳無結算／口袋分類＋拖曳）。
- 待辦：替換 Sanrio 素材為中性素材（IP 風險，未解）。

## 2026-07-15
- 補建 DEVLOG（依全域規則）。
- 上游（wetravel）啟動 UX 審視；優化定案後由私有版實作再同步過來。
- 待辦：①同步上游 UX 優化 ②替換 Sanrio 素材為中性素材（IP 風險）。

## 2026-07-05（歷史回填）
- 開源初版發佈 (89344c3)：config 抽離＋firestore.rules＋MIT＋自架教學 README；CDN pin 版本；app.js?v=20。
