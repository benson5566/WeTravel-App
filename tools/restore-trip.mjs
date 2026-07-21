// tools/restore-trip.mjs — 從備份 JSON 還原單筆旅程（整份文件覆蓋回 Firestore）
// 用法：node restore-trip.mjs <備份檔.json> <tripId>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findConfig, anonToken } from './backup-trips.mjs';

async function main() {
  const [file, tripId] = process.argv.slice(2);
  if (!file || !tripId) { console.error('[X] usage: node restore-trip.mjs <backup.json> <tripId>'); process.exit(2); }
  const { documents } = JSON.parse(readFileSync(file, 'utf8'));
  const doc = documents.find((d) => d.name.endsWith(`/trips/${tripId}`));
  if (!doc) { console.error(`[X] 備份裡沒有 trips/${tripId}`); process.exit(1); }

  const { key, projectId } = findConfig();
  const idToken = await anonToken(key);
  // PATCH 不帶 updateMask＝整份文件以 fields 取代（含刪掉備份後新增的欄位）＝真正的還原語意
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/trips/${encodeURIComponent(tripId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: doc.fields }),
  });
  if (!res.ok) { console.error(`[X] 還原失敗 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`); process.exit(1); }
  console.log(`[OK] trips/${tripId} 已還原成備份版本（${file}）`);
}

main().catch((e) => { console.error(`[X] ${e.message}`); process.exit(1); });
