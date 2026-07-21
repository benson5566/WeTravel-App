// tools/backup.test.mjs — 備份腳本純函式測試（網路層不在此測，由每日實跑＋死人開關把關）
import assert from 'node:assert';
import { extractApiKey, buildBackupPayload, pickPruneTargets } from './backup-trips.mjs';

// ① 金鑰抽取：私有版（app.js 內嵌）與 oss 版（firebase-config.js）兩種樣式都要吃
{
  assert.strictEqual(
    extractApiKey('const x = { apiKey: "AIzaSyFAKE-KEY-123", authDomain: "a" };'),
    'AIzaSyFAKE-KEY-123', '雙引號樣式',
  );
  assert.strictEqual(
    extractApiKey("export const firebaseConfig = {\n  apiKey: 'AIzaSyFAKE2',\n};"),
    'AIzaSyFAKE2', '單引號樣式',
  );
  assert.strictEqual(extractApiKey('apiKey: "YOUR_API_KEY"'), null, '佔位值應回 null（oss 未設定）');
  assert.strictEqual(extractApiKey('no key here'), null, '無金鑰應回 null');
  console.log('PASS extractApiKey');
}

// ② payload：帶數量與時間戳；空文件清單必須丟錯（防 API 變動後靜默寫出空備份）
{
  const docs = [{ name: 'projects/p/databases/(default)/documents/trips/t1', fields: {} }];
  const p = buildBackupPayload(docs);
  assert.strictEqual(p.count, 1);
  assert.ok(p.exportedAt && p.documents === docs);
  assert.throws(() => buildBackupPayload([]), /空/, '空清單應丟錯');
  console.log('PASS buildBackupPayload');
}

// ③ 保留期修剪：只留最新 keep 份，回傳該刪的舊檔；不足 keep 份不刪
{
  const names = ['trips-2026-07-01.json', 'trips-2026-07-03.json', 'trips-2026-07-02.json', 'other.txt'];
  assert.deepStrictEqual(pickPruneTargets(names, 2), ['trips-2026-07-01.json'], '超額的最舊者該刪、非備份檔不動');
  assert.deepStrictEqual(pickPruneTargets(names, 30), [], '不足 keep 份不刪');
  console.log('PASS pickPruneTargets');
}

console.log('PASS backup.test.mjs');
