// tools/assets-spec.mjs
// 素材規格單一真相源。docs/ASSETS.md（人讀）與 check.mjs／replace.mjs（機器）共用同一份資料。
// w/h ＝ 現行壓縮素材實測尺寸（Task 1 已把原圖裁到內容長寬比並壓縮，Benson 拍板沿用）。
// alpha: true = 必須帶透明通道；false = 不檢查（滿版啟動圖／PWA icon）。
// maxBytes: check.mjs 單檔大小上限（約現值 x2 取整，防超規回歸）。
// shape: 形狀裁切的預設半徑（半徑佔短邊的百分比，0–50 整數）。省略＝0（方形）；
//        null＝禁用形狀裁切。50 ⇒ 半徑＝短邊一半 ⇒ 正方形素材切出正圓。
//        依 2026-07-21 形狀稽核：app 只幫 5 格切形狀，其餘交使用者決定。

export const ASSETS = [
  { file: 'BG_Loading.png',         w: 1059, h: 1920, alpha: false, maxBytes: 1572864, use: '啟動畫面滿版背景', shape: null },
  { file: 'kitty_face_classic.png', w: 512,  h: 412,  alpha: true,  maxBytes: 256000,  use: '「今日主題」卡片主視覺' },
  { file: 'kitty_face_pink.png',    w: 512,  h: 227,  alpha: true,  maxBytes: 256000,  use: '全站浮水印（CSS）＋行程卡片背景', shape: 14 },
  { file: 'kitty_money.png',        w: 720,  h: 410,  alpha: true,  maxBytes: 204800,  use: '記帳頁總額卡片背景', shape: 17 },
  { file: 'kitty1.png',             w: 360,  h: 238,  alpha: true,  maxBytes: 102400,  use: '口袋名單卡片背景' },
  { file: 'kitty_pilot.png',        w: 270,  h: 113,  alpha: true,  maxBytes: 102400,  use: '側邊選單「目前旅程」卡片', shape: 20 },
  { file: 'kitty3.png',             w: 144,  h: 144,  alpha: true,  maxBytes: 51200,   use: '設定視窗 Destination 旁' },
  { file: 'bow_pink.png',           w: 96,   h: 83,   alpha: true,  maxBytes: 30720,   use: '蝴蝶結裝飾（.with-bow＋口袋標題＋新增行程鈕）' },
  { file: 'bow_red.png',            w: 96,   h: 96,   alpha: true,  maxBytes: 30720,   use: '蝴蝶結裝飾（.kitty-logo＋清單標題）' },
  { file: 'icn_date.png',           w: 96,   h: 96,   alpha: true,  maxBytes: 30720,   use: '底部導覽「行程」' },
  { file: 'icn_pocket.png',         w: 96,   h: 96,   alpha: true,  maxBytes: 30720,   use: '底部導覽「口袋」' },
  { file: 'icn_money.png',          w: 96,   h: 96,   alpha: true,  maxBytes: 30720,   use: '底部導覽「記帳」' },
  { file: 'icn_trans.png',          w: 96,   h: 96,   alpha: true,  maxBytes: 30720,   use: '底部導覽「小幫手」' },
  { file: 'icn_home.png',           w: 108,  h: 108,  alpha: true,  maxBytes: 30720,   use: '頂部選單按鈕' },
  { file: 'icn_share.png',          w: 144,  h: 144,  alpha: true,  maxBytes: 51200,   use: '頂部分享按鈕' },
  { file: 'icn_head.png',           w: 240,  h: 240,  alpha: true,  maxBytes: 102400,  use: '小幫手頁頭像', shape: 50 },
  { file: 'icn_agent.png',          w: 96,   h: 96,   alpha: true,  maxBytes: 30720,   use: '小幫手「旅遊助理」卡片' },
  { file: 'icn_camera.png',         w: 96,   h: 96,   alpha: true,  maxBytes: 30720,   use: '小幫手「拍照翻譯」卡片' },
  { file: 'icn_speak.png',          w: 96,   h: 96,   alpha: true,  maxBytes: 30720,   use: '小幫手「中文→外語」卡片' },
  { file: 'icn_listen.png',         w: 96,   h: 96,   alpha: true,  maxBytes: 30720,   use: '小幫手「外語→中文」卡片' },
  { file: 'icn_danial.png',         w: 120,  h: 120,  alpha: true,  maxBytes: 51200,   use: '記帳付款人頭像 1', shape: 50 },
  { file: 'icn_kitty.png',          w: 120,  h: 120,  alpha: true,  maxBytes: 51200,   use: '記帳付款人頭像 2', shape: 50 },
];

export const ICONS = [
  { file: 'icon-192.png', w: 192, h: 192, alpha: false, maxBytes: 61440,  use: 'PWA icon／favicon' },
  { file: 'icon-512.png', w: 512, h: 512, alpha: false, maxBytes: 256000, use: 'PWA icon' },
];

// file → spec；含 24 筆（22 素材 + 2 icon）
export const REPLACEABLE = new Map([...ASSETS, ...ICONS].map((s) => [s.file, s]));
