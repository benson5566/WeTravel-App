// tools/backup-trips.mjs — 每日旅程備份：REST 匿名讀全量 trips 存 JSON（原始 Firestore 格式，可直接還原）
// 用法：node backup-trips.mjs <備份資料夾>
// 金鑰來源：../app.js 的 apiKey（oss 自架者為 ../firebase-config.js）；佔位值視同未設定。
import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEEP = 30;

export function extractApiKey(source) {
  const m = source.match(/apiKey:\s*["']([^"']+)["']/);
  if (!m || m[1].startsWith('YOUR_')) return null;
  return m[1];
}

export function buildBackupPayload(documents) {
  if (!documents.length) throw new Error('備份中止：讀到空的旅程清單（API 格式變動或資料庫異常，不寫檔以免輪掉舊備份）');
  return { exportedAt: new Date().toISOString(), count: documents.length, documents };
}

export function pickPruneTargets(names, keep = KEEP) {
  const backups = names.filter((n) => /^trips-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().reverse();
  return backups.slice(keep).sort();
}

export function findConfig() {
  for (const f of ['app.js', 'firebase-config.js']) {
    const p = path.join(REPO_ROOT, f);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    const key = extractApiKey(src);
    const pid = src.match(/projectId:\s*["']([^"']+)["']/);
    if (key && pid) return { key, projectId: pid[1] };
  }
  throw new Error('找不到 Firebase 設定（app.js／firebase-config.js 皆無或為佔位值）');
}

export async function anonToken(key) {
  const auth = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}',
  });
  if (!auth.ok) throw new Error(`匿名登入失敗 HTTP ${auth.status}`);
  return (await auth.json()).idToken;
}

async function listAllTrips(projectId, idToken) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/trips`;
  const docs = [];
  let pageToken = '';
  do {
    const url = `${base}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) throw new Error(`Firestore list 失敗 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    docs.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function main() {
  const outDir = process.argv[2];
  if (!outDir) { console.error('[X] usage: node backup-trips.mjs <backup-dir>'); process.exit(2); }
  const { key, projectId } = findConfig();
  const idToken = await anonToken(key);
  const docs = await listAllTrips(projectId, idToken);
  const payload = buildBackupPayload(docs);
  const file = path.join(outDir, `trips-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(file, JSON.stringify(payload));
  for (const old of pickPruneTargets(readdirSync(outDir))) unlinkSync(path.join(outDir, old));
  console.log(`[OK] backup ${payload.count} trips -> ${file}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`[X] ${e.message}`); process.exit(1); });
}
