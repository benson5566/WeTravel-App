// tools/gui.mjs — 素材替換 GUI：後端核心＋本機伺服器（前端在 gui.html）
import sharp from 'sharp';
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, statSync, copyFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS, ICONS, REPLACEABLE } from './assets-spec.mjs';
import { encodeToSpec, bumpSwCache } from './replace.mjs';
import { checkAll } from './check.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKUP_DIR = path.join('tools', 'backup');

export class GuiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// target → 要寫的檔案清單（icon 特例＝192+512 兩檔）
function specsFor(target) {
  if (target === 'icon') return ICONS.map((s) => ({ ...s, dir: '.' }));
  const s = REPLACEABLE.get(target);
  if (!s || target.startsWith('icon-')) throw new GuiError(400, `「${target}」不是可替換素材`);
  return [{ ...s, dir: 'assets' }];
}

export async function buildState(root) {
  const check = await checkAll(root);
  const slots = [
    ...ASSETS.map((s) => ({ ...s, dir: 'assets', icon: false, files: [s.file] })),
    { file: 'icon', use: 'PWA 圖示（192＋512 一次替換）', w: 512, h: 512, alpha: false, dir: '.', icon: true, files: ICONS.map((i) => i.file) },
  ].map((s) => {
    const p = path.join(root, s.dir, s.files[0]);
    return {
      file: s.file, use: s.use, w: s.w, h: s.h, alpha: !!s.alpha, icon: s.icon,
      // shape: null＝禁用形狀裁切；undefined（省略）正規化為 0＝方形
      shape: s.shape === undefined ? 0 : s.shape,
      mtime: existsSync(p) ? Math.round(statSync(p).mtimeMs) : 0,
      hasBackup: s.files.every((f) => existsSync(path.join(root, BACKUP_DIR, f))),
    };
  });
  return { slots, check };
}

export async function replaceAsset(root, target, buffer, opts = {}) {
  const { rotate = 0, rect = null, radius = 0 } = opts;
  if (![0, 90, 180, 270].includes(rotate)) throw new GuiError(400, '旋轉角度必須是 0／90／180／270');
  if (!Number.isInteger(radius) || radius < 0 || radius > 50) {
    throw new GuiError(400, '形狀百分比必須是 0 到 50 的整數');
  }
  const specs = specsFor(target);
  if (radius > 0 && specs[0].shape === null) {
    throw new GuiError(400, '這個素材不支援形狀裁切');
  }

  // 前置管線：EXIF 轉正＋使用者旋轉＋裁切，處理完交給既有 encodeToSpec（壓縮／警告不變）
  let prepared;
  try {
    let img = sharp(buffer, { autoOrient: true });
    if (rotate) img = img.rotate(rotate);
    prepared = await img.png().toBuffer();
  } catch {
    throw new GuiError(400, '這個檔案不是可用的圖片');
  }
  if (rect) {
    const { x, y, w, h } = rect;
    const meta = await sharp(prepared).metadata();
    const inBounds = [x, y, w, h].every(Number.isInteger)
      && w > 0 && h > 0 && x >= 0 && y >= 0 && x + w <= meta.width && y + h <= meta.height;
    if (!inBounds) throw new GuiError(400, '裁切範圍超出圖片，請重新選取');
    const want = specs[0].w / specs[0].h;
    if (Math.abs(w / h - want) / want > 0.01) throw new GuiError(400, '裁切比例不符，請重新選取');
    prepared = await sharp(prepared).extract({ left: x, top: y, width: w, height: h }).toBuffer();
  }

  // 圓角遮罩：套在裁切後、encodeToSpec（縮放＋壓縮）之前。
  // 位置選在這裡的理由：encodeToSpec 超標時會走 palette 量化，其 tRNS 保得住透明角；
  // 反過來若等壓縮完再切，就得重編碼、繞過那套降級邏輯。
  if (radius > 0) {
    const m = await sharp(prepared).metadata();
    const want = specs[0].w / specs[0].h;
    if (Math.abs(m.width / m.height - want) / want > 0.01) {
      // 比例不符時 encodeToSpec 會 cover 裁切，把剛切好的圓角削掉一塊 → 擋掉而非產出歪形狀
      throw new GuiError(400, '要套用圓角必須先選好裁切範圍（比例需符合素材規格）');
    }
    const r = (radius / 100) * Math.min(m.width, m.height); // 50 ⇒ 短邊一半 ⇒ 正圓
    const mask = Buffer.from(
      `<svg width="${m.width}" height="${m.height}">`
      + `<rect x="0" y="0" width="${m.width}" height="${m.height}" rx="${r}" ry="${r}" fill="#fff"/></svg>`,
    );
    prepared = await sharp(prepared)
      .ensureAlpha() // 來源若無 alpha 通道，dest-in 無處寫入透明度
      .composite([{ input: mask, blend: 'dest-in' }])
      .png({ palette: false })
      .toBuffer();
  }

  // 先全部編碼成功，才動任何檔案（備份＝寫檔前原檔 的不變式）
  const jobs = [];
  for (const spec of specs) {
    const { buf, warnings } = await encodeToSpec(prepared, spec);
    jobs.push({ dest: path.join(root, spec.dir, spec.file), file: spec.file, buf, warnings });
  }
  mkdirSync(path.join(root, BACKUP_DIR), { recursive: true });
  for (const j of jobs) {
    if (existsSync(j.dest)) copyFileSync(j.dest, path.join(root, BACKUP_DIR, j.file));
  }
  for (const j of jobs) writeFileSync(j.dest, j.buf);
  bumpSwCache(root);
  return { warnings: [...new Set(jobs.flatMap((j) => j.warnings))], state: await buildState(root) };
}

export async function restoreAsset(root, target) {
  const specs = specsFor(target);
  for (const s of specs) {
    if (!existsSync(path.join(root, BACKUP_DIR, s.file))) throw new GuiError(404, '沒有可還原的備份');
  }
  for (const s of specs) {
    copyFileSync(path.join(root, BACKUP_DIR, s.file), path.join(root, s.dir, s.file));
  }
  bumpSwCache(root);
  return { state: await buildState(root) };
}

// ———— HTTP 層 ————
import http from 'node:http';
import { execFile } from 'node:child_process';

const MAX_BODY = 50 * 1024 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new GuiError(413, '檔案太大（上限 50MB）')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

export function createServer(root) {
  const assetWhitelist = new Map([
    ...ASSETS.map((s) => [s.file, 'assets']),
    ...ICONS.map((s) => [s.file, '.']),
  ]);
  let dirty = false; // session 內成功替換/還原過＝有東西可上線（供「🚀 上線更新」鈕）
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/') {
        return send(res, 200, readFileSync(path.join(root, 'tools', 'gui.html')), 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        return send(res, 200, JSON.stringify({ ...await buildState(root), dirty }));
      }
      if (req.method === 'GET' && url.pathname.startsWith('/asset/')) {
        const name = decodeURIComponent(url.pathname.slice('/asset/'.length));
        const dir = assetWhitelist.get(name);
        if (!dir) return send(res, 404, JSON.stringify({ error: '不明素材' }));
        return send(res, 200, readFileSync(path.join(root, dir, name)), 'image/png');
      }
      if (req.method === 'POST' && url.pathname === '/api/restore') {
        const out = await restoreAsset(root, url.searchParams.get('target'));
        dirty = true;
        out.state.dirty = dirty;
        return send(res, 200, JSON.stringify(out));
      }
      if (req.method === 'POST' && url.pathname === '/api/replace') {
        const body = await readBody(req);
        const p = url.searchParams;
        const rect = ['x', 'y', 'w', 'h'].every((k) => p.has(k))
          ? { x: +p.get('x'), y: +p.get('y'), w: +p.get('w'), h: +p.get('h') }
          : null;
        const out = await replaceAsset(root, p.get('target'), body, {
          rotate: +(p.get('rotate') || 0), rect, radius: +(p.get('radius') || 0),
        });
        dirty = true;
        out.state.dirty = dirty;
        return send(res, 200, JSON.stringify(out));
      }
      send(res, 404, JSON.stringify({ error: '不明路徑' }));
    } catch (e) {
      send(res, e instanceof GuiError ? e.status : 500, JSON.stringify({ error: e.message }));
    }
  });
}

function openBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  execFile(cmd, args, () => {}); // 開不了瀏覽器不算致命，終端機有印網址
}

async function main() {
  const server = createServer(REPO_ROOT);
  let port = null;
  for (let p = 4646; p <= 4656; p++) {
    try {
      await new Promise((ok, bad) => {
        server.once('error', bad);
        server.listen(p, '127.0.0.1', () => { server.removeAllListeners('error'); ok(); });
      });
      port = p;
      break;
    } catch { /* port 被占，試下一個 */ }
  }
  if (!port) {
    // ASCII 先行：cmd 沒切成 UTF-8 時中文會亂碼，關鍵資訊要保證可讀（2026-07-21 真機教訓）
    console.error('[X] Ports 4646-4656 are all in use. Close other apps and retry.');
    console.error('    4646-4656 都被占用，關掉其他程式再試');
    process.exit(1);
  }
  const url = `http://localhost:${port}`;
  console.log(`[OK] Asset tool running at: ${url}`);
  console.log(`     (If no browser opened, paste that address into Chrome/Edge.)`);
  console.log(`     素材替換工具已啟動：${url}（關閉此視窗即停止）`);
  openBrowser(url);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
