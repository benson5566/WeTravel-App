// tools/gui.test.mjs — GUI 後端測試
import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { bumpSwCache } from './replace.mjs';

// —— bumpSwCache 注入 root ——
const tmpSw = mkdtempSync(path.join(os.tmpdir(), 'wt-gui-sw-'));
writeFileSync(path.join(tmpSw, 'sw.js'), "const CACHE_NAME = 'wetravel-v7';\n");
bumpSwCache(tmpSw);
assert.ok(
  readFileSync(path.join(tmpSw, 'sw.js'), 'utf8').includes("'wetravel-v8'"),
  'bumpSwCache(root) 應 bump 指定 root 的 sw.js',
);
console.log('PASS bumpSwCache(root)');

import sharp from 'sharp';
import { existsSync, copyFileSync } from 'node:fs';
import { replaceAsset, restoreAsset, buildState, GuiError } from './gui.mjs';

// —— 測試用暫存 repo：sw.js ＋ assets/bow_pink.png（96x83 紅、帶透明）——
async function makeRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'wt-gui-'));
  mkdirSync(path.join(root, 'assets'));
  writeFileSync(path.join(root, 'sw.js'), "const CACHE_NAME = 'wetravel-v1';\n");
  const orig = await sharp({
    create: { width: 96, height: 83, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } },
  }).png().toBuffer();
  writeFileSync(path.join(root, 'assets', 'bow_pink.png'), orig);
  return { root, orig };
}

// 來源圖：400x400 不透明藍（照片樣態）
const srcBlue = await sharp({
  create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 128, b: 255, alpha: 1 } },
}).png().toBuffer();

// ① 正常替換：裁切 rect（200x173 ≈ 96/83 比例）→ 檔案 96x83、備份=原檔、sw bump、不透明警告
{
  const { root, orig } = await makeRoot();
  const out = await replaceAsset(root, 'bow_pink.png', srcBlue, {
    rotate: 0, rect: { x: 10, y: 10, w: 200, h: 173 },
  });
  const meta = await sharp(path.join(root, 'assets', 'bow_pink.png')).metadata();
  assert.strictEqual(`${meta.width}x${meta.height}`, '96x83', '輸出應為規格尺寸');
  assert.deepStrictEqual(
    readFileSync(path.join(root, 'tools', 'backup', 'bow_pink.png')),
    orig, '備份應等於替換前原檔',
  );
  assert.ok(readFileSync(path.join(root, 'sw.js'), 'utf8').includes('v2'), 'sw 應 bump');
  assert.ok(out.warnings.some((w) => w.includes('不透明')), '不透明來源應有警告');
  assert.ok(out.state.slots.length === 23, 'state 應回 23 格');

  // ② 還原：檔案 bytes 回到原檔、sw 再 bump、備份保留
  await restoreAsset(root, 'bow_pink.png');
  assert.deepStrictEqual(readFileSync(path.join(root, 'assets', 'bow_pink.png')), orig, '還原後應等於原檔');
  assert.ok(readFileSync(path.join(root, 'sw.js'), 'utf8').includes('v3'), '還原也應 bump sw');
  assert.ok(existsSync(path.join(root, 'tools', 'backup', 'bow_pink.png')), '備份應保留');
}

// ③ rect 超界／比例不符／旋轉座標系
{
  const { root } = await makeRoot();
  await assert.rejects(
    replaceAsset(root, 'bow_pink.png', srcBlue, { rect: { x: 300, y: 0, w: 200, h: 173 } }),
    (e) => e instanceof GuiError && e.status === 400, '超界應 400',
  );
  await assert.rejects(
    replaceAsset(root, 'bow_pink.png', srcBlue, { rect: { x: 0, y: 0, w: 200, h: 100 } }),
    (e) => e instanceof GuiError && e.status === 400, '比例不符應 400',
  );
  // 200x100 的圖轉 90° 後是 100x200：rect y=100 只有在旋轉後座標系才合法
  const tall = await sharp({
    create: { width: 200, height: 100, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } },
  }).png().toBuffer();
  await replaceAsset(root, 'bow_pink.png', tall, { rotate: 90, rect: { x: 0, y: 100, w: 96, h: 83 } });
  console.log('PASS 旋轉後座標系');
}

// ④ 非圖片 → 400；不明 target → 400；無備份還原 → 404
{
  const { root } = await makeRoot();
  await assert.rejects(
    replaceAsset(root, 'bow_pink.png', Buffer.from('not an image')),
    (e) => e instanceof GuiError && e.status === 400 && e.message.includes('不是可用的圖片'),
  );
  await assert.rejects(
    replaceAsset(root, 'nope.png', srcBlue),
    (e) => e instanceof GuiError && e.status === 400,
  );
  await assert.rejects(
    restoreAsset(root, 'bow_pink.png'),
    (e) => e instanceof GuiError && e.status === 404, '無備份還原應 404',
  );
}

// ⑤ icon 特例：一次寫 192+512、兩檔一起備份
{
  const { root } = await makeRoot();
  for (const f of ['icon-192.png', 'icon-512.png']) {
    copyFileSync(path.join(root, 'assets', 'bow_pink.png'), path.join(root, f));
  }
  await replaceAsset(root, 'icon', srcBlue, { rect: { x: 0, y: 0, w: 300, h: 300 } });
  for (const [f, size] of [['icon-192.png', 192], ['icon-512.png', 512]]) {
    const m = await sharp(path.join(root, f)).metadata();
    assert.strictEqual(m.width, size, `${f} 應為 ${size}`);
    assert.ok(existsSync(path.join(root, 'tools', 'backup', f)), `${f} 應有備份`);
  }
  await restoreAsset(root, 'icon');
}

console.log('PASS gui 核心（replace/restore/state）');

// —— server 煙霧：state / asset 白名單 / replace / restore roundtrip ——
import { createServer } from './gui.mjs';

{
  const { root } = await makeRoot();
  for (const f of ['icon-192.png', 'icon-512.png']) {
    copyFileSync(path.join(root, 'assets', 'bow_pink.png'), path.join(root, f));
  }
  const server = createServer(root);
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;

  const state = await (await fetch(`${base}/api/state`)).json();
  assert.strictEqual(state.slots.length, 23, '/api/state 應回 23 格');

  const img = await fetch(`${base}/asset/bow_pink.png`);
  assert.strictEqual(img.status, 200, '/asset 白名單內應 200');
  assert.strictEqual((await fetch(`${base}/asset/..%2Fapp.js`)).status, 404, '白名單外應 404（防路徑跳脫）');

  const rep = await fetch(`${base}/api/replace?target=bow_pink.png&rotate=0&x=0&y=0&w=200&h=173`, {
    method: 'POST', body: srcBlue,
  });
  assert.strictEqual(rep.status, 200, 'replace 應 200');
  assert.ok((await rep.json()).warnings.some((w) => w.includes('不透明')));

  const bad = await fetch(`${base}/api/replace?target=nope.png`, { method: 'POST', body: srcBlue });
  assert.strictEqual(bad.status, 400, '不明 target 應 400');
  assert.ok((await bad.json()).error.includes('不是可替換素材'), '錯誤要人話');

  const rest = await fetch(`${base}/api/restore?target=bow_pink.png`, { method: 'POST' });
  assert.strictEqual(rest.status, 200, 'restore 應 200');

  server.close();
  console.log('PASS server 煙霧');
}

// —— 🚀 上線更新：server 端 dirty 旗標（session 內有替換/還原過才亮） ——
{
  const { root } = await makeRoot();
  const server = createServer(root);
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;

  const s0 = await (await fetch(`${base}/api/state`)).json();
  assert.strictEqual(s0.dirty, false, '開機 state 應 dirty:false');

  await fetch(`${base}/api/replace?target=nope.png`, { method: 'POST', body: srcBlue });
  const s1 = await (await fetch(`${base}/api/state`)).json();
  assert.strictEqual(s1.dirty, false, '失敗的替換不應弄髒');

  const rep = await (await fetch(`${base}/api/replace?target=bow_pink.png&rotate=0&x=0&y=0&w=200&h=173`, {
    method: 'POST', body: srcBlue,
  })).json();
  assert.strictEqual(rep.state.dirty, true, '成功替換的回應應帶 dirty:true');
  const s2 = await (await fetch(`${base}/api/state`)).json();
  assert.strictEqual(s2.dirty, true, '替換後 state 應 dirty:true');
  server.close();

  // 新 server＝新 session：dirty 歸零；單獨 restore 也算變更
  const server2 = createServer(root);
  await new Promise((ok) => server2.listen(0, '127.0.0.1', ok));
  const base2 = `http://127.0.0.1:${server2.address().port}`;
  const s3 = await (await fetch(`${base2}/api/state`)).json();
  assert.strictEqual(s3.dirty, false, '新 session 應重新 dirty:false');
  const rest2 = await (await fetch(`${base2}/api/restore?target=bow_pink.png`, { method: 'POST' })).json();
  assert.strictEqual(rest2.state.dirty, true, '還原也應 dirty:true');
  server2.close();
  console.log('PASS 上線更新 dirty 旗標');
}

// —— 形狀裁切（radius）——
// 半徑公式：r = radius/100 * min(w,h)。50 ⇒ 短邊一半 ⇒ 正方形切出正圓。
async function alphaAt(file, x, y) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * 4 + 3];
}

// 準備 icon 兩檔（192／512 皆正方形，方便驗正圓）
async function makeIconRoot() {
  const { root } = await makeRoot();
  for (const f of ['icon-192.png', 'icon-512.png']) {
    copyFileSync(path.join(root, 'assets', 'bow_pink.png'), path.join(root, f));
  }
  return root;
}

// ⑥ radius:0 與不帶 radius 的輸出必須位元組相同（迴歸保護：關閉狀態零行為改變）
{
  const a = await makeRoot();
  await replaceAsset(a.root, 'bow_pink.png', srcBlue, { rect: { x: 0, y: 0, w: 200, h: 173 } });
  const b = await makeRoot();
  await replaceAsset(b.root, 'bow_pink.png', srcBlue, { rect: { x: 0, y: 0, w: 200, h: 173 }, radius: 0 });
  assert.deepStrictEqual(
    readFileSync(path.join(a.root, 'assets', 'bow_pink.png')),
    readFileSync(path.join(b.root, 'assets', 'bow_pink.png')),
    'radius:0 應與不帶 radius 位元組完全相同',
  );
  console.log('PASS radius:0 零行為改變');
}

// ⑦ radius:50 於正方形素材 → 正圓（角落透明、上緣中點保留、中心保留）
{
  const root = await makeIconRoot();
  await replaceAsset(root, 'icon', srcBlue, { rect: { x: 0, y: 0, w: 300, h: 300 }, radius: 50 });
  const f = path.join(root, 'icon-192.png');
  assert.strictEqual(await alphaAt(f, 10, 10), 0, '正圓的角落應完全透明');
  assert.ok(await alphaAt(f, 96, 1) > 0, '正圓的上緣中點應保留（沒切過頭）');
  assert.strictEqual(await alphaAt(f, 96, 96), 255, '正圓的中心應不透明');
  console.log('PASS radius:50 正圓');
}

// ⑧ radius:20 → 圓角矩形（角落透明但上緣中點附近仍是直邊）
{
  const root = await makeIconRoot();
  await replaceAsset(root, 'icon', srcBlue, { rect: { x: 0, y: 0, w: 300, h: 300 }, radius: 20 });
  const f = path.join(root, 'icon-192.png');
  assert.strictEqual(await alphaAt(f, 2, 2), 0, '圓角矩形的角落應透明');
  assert.strictEqual(await alphaAt(f, 96, 2), 255, '圓角矩形的上緣中點應完全不透明（直邊）');
  console.log('PASS radius:20 圓角矩形');
}

// ⑨ radius:50 於長方形素材 → 膠囊（短邊兩端半圓；96x83 的 r=41.5）
{
  const { root } = await makeRoot();
  await replaceAsset(root, 'bow_pink.png', srcBlue, { rect: { x: 0, y: 0, w: 200, h: 173 }, radius: 50 });
  const f = path.join(root, 'assets', 'bow_pink.png');
  assert.strictEqual(await alphaAt(f, 2, 2), 0, '膠囊的角落應透明');
  assert.ok(await alphaAt(f, 1, 41) > 0, '膠囊左緣最寬處（短邊中線）應保留');
  console.log('PASS radius:50 膠囊');
}

// ⑩ 參數驗證：範圍外／非整數／非數字一律 400
{
  const { root } = await makeRoot();
  for (const bad of [-1, 51, 12.5, NaN]) {
    await assert.rejects(
      replaceAsset(root, 'bow_pink.png', srcBlue, { rect: { x: 0, y: 0, w: 200, h: 173 }, radius: bad }),
      (e) => e instanceof GuiError && e.status === 400 && e.message.includes('0 到 50'),
      `radius=${bad} 應 400`,
    );
  }
  console.log('PASS radius 參數驗證');
}

// ⑪ shape:null 的素材（BG_Loading）禁用形狀裁切
{
  const { root } = await makeRoot();
  await assert.rejects(
    replaceAsset(root, 'BG_Loading.png', srcBlue, { radius: 30 }),
    (e) => e instanceof GuiError && e.status === 400 && e.message.includes('不支援形狀裁切'),
    'BG_Loading 帶 radius 應 400',
  );
  console.log('PASS shape:null 禁用');
}

// ⑫ 比例守衛：radius>0 但來源比例不符規格（且沒給 rect）→ 400，不靜默產出歪形狀
{
  const { root } = await makeRoot();
  await assert.rejects(
    // srcBlue 是 400x400（比例 1.0），bow_pink 規格 96x83（比例 1.157）
    replaceAsset(root, 'bow_pink.png', srcBlue, { radius: 50 }),
    (e) => e instanceof GuiError && e.status === 400 && e.message.includes('裁切範圍'),
    '比例不符時套圓角應 400',
  );
  console.log('PASS 圓角比例守衛');
}

// ⑬ palette 量化降級後圓角仍透明（守 tRNS 路徑）
{
  const root = await makeIconRoot();
  const noise = Buffer.alloc(512 * 512 * 3);
  for (let i = 0; i < noise.length; i += 1) noise[i] = Math.floor(Math.random() * 256);
  const srcNoise = await sharp(noise, { raw: { width: 512, height: 512, channels: 3 } })
    .png({ palette: false }).toBuffer();
  const out = await replaceAsset(root, 'icon', srcNoise, { radius: 50 });
  assert.ok(
    out.warnings.some((w) => w.includes('自動壓縮')),
    '雜訊圖應觸發 palette 量化降級（否則本測試沒驗到 tRNS 路徑）',
  );
  assert.strictEqual(await alphaAt(path.join(root, 'icon-512.png'), 20, 20), 0, '量化後角落仍應透明');
  console.log('PASS 量化後圓角保留');
}

// ⑭ buildState 透出 shape，且 undefined 正規化為 0
{
  const { root } = await makeRoot();
  const st = await buildState(root);
  const byFile = Object.fromEntries(st.slots.map((s) => [s.file, s]));
  assert.strictEqual(byFile['icn_head.png'].shape, 50, 'buildState 應透出 shape');
  assert.strictEqual(byFile['BG_Loading.png'].shape, null, 'null 應原樣透出');
  assert.strictEqual(byFile['bow_pink.png'].shape, 0, '省略的 shape 應正規化為 0');
  assert.strictEqual(byFile.icon.shape, 0, 'icon 應可切（預設 0）');
  console.log('PASS buildState 透出 shape');
}

// ⑮ HTTP 層傳遞 radius
{
  const root = await makeIconRoot();
  const server = createServer(root);
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}`;

  const ok200 = await fetch(`${base}/api/replace?target=icon&rotate=0&x=0&y=0&w=300&h=300&radius=50`, {
    method: 'POST', body: srcBlue,
  });
  assert.strictEqual(ok200.status, 200, '帶 radius 的 replace 應 200');
  assert.strictEqual(await alphaAt(path.join(root, 'icon-192.png'), 10, 10), 0, 'HTTP 路徑也應切出圓角');

  const bad = await fetch(`${base}/api/replace?target=icon&rotate=0&x=0&y=0&w=300&h=300&radius=99`, {
    method: 'POST', body: srcBlue,
  });
  assert.strictEqual(bad.status, 400, 'radius 超範圍應 400');
  assert.ok((await bad.json()).error.includes('0 到 50'), '錯誤要人話');

  server.close();
  console.log('PASS HTTP radius 傳遞');
}

// —— Windows 入口不變式：.bat 必須純 ASCII＋CRLF ——
// cmd 對 UTF-8 中文＋LF-only 批次檔會亂碼＋解析錯位（2026-07-21 Benson 真機實證），
// 中文指引一律放瀏覽器端（gui.html）與文件，bat 只准 ASCII。
{
  const { fileURLToPath: f2p } = await import('node:url');
  const repoRoot = path.resolve(path.dirname(f2p(import.meta.url)), '..');
  const bat = readFileSync(path.join(repoRoot, '換素材工具.bat'));
  assert.ok([...bat].every((b) => b <= 0x7f), '.bat 只准純 ASCII（cmd 各 code page 才不亂碼）');
  const text = bat.toString('ascii');
  assert.ok(!/(^|[^\r])\n/.test(text), '.bat 行尾必須全 CRLF（cmd 解析是 CRLF 原生）');
  console.log('PASS .bat ASCII＋CRLF 不變式');
}
