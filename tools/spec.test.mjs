import assert from 'node:assert';
import { ASSETS, ICONS, REPLACEABLE } from './assets-spec.mjs';

// 筆數
assert.strictEqual(ASSETS.length, 22, 'ASSETS 應 22 筆');
assert.strictEqual(ICONS.length, 2, 'ICONS 應 2 筆');
assert.strictEqual(REPLACEABLE.size, 24, 'REPLACEABLE 應 24 筆');

// 每筆欄位齊全且型別正確
for (const s of [...ASSETS, ...ICONS]) {
  for (const k of ['file', 'w', 'h', 'alpha', 'maxBytes', 'use']) {
    assert.ok(k in s, `${s.file} 缺欄位 ${k}`);
  }
  assert.ok(s.file.endsWith('.png'), `${s.file} 應為 .png`);
  assert.ok(Number.isInteger(s.w) && s.w > 0, `${s.file} w 非正整數`);
  assert.ok(Number.isInteger(s.h) && s.h > 0, `${s.file} h 非正整數`);
  assert.strictEqual(typeof s.alpha, 'boolean', `${s.file} alpha 非布林`);
  assert.ok(Number.isInteger(s.maxBytes) && s.maxBytes > 0, `${s.file} maxBytes 非正整數`);
}

// 檔名唯一
const files = [...ASSETS, ...ICONS].map((s) => s.file);
assert.strictEqual(new Set(files).size, files.length, '檔名有重複');

console.log('PASS spec.test.mjs');

// —— shape 欄位（形狀裁切預設半徑，選填）——
// 合法值：0–50 整數 ／ null（禁用） ／ 省略（＝0）
for (const s of REPLACEABLE.values()) {
  if (!('shape' in s)) continue;
  if (s.shape === null) continue;
  assert.ok(
    Number.isInteger(s.shape) && s.shape >= 0 && s.shape <= 50,
    `${s.file} shape 必須是 0–50 整數或 null，實際為 ${s.shape}`,
  );
}

// app 已會切形狀的格子必須帶 shape，避免日後新增素材忘了填
for (const f of ['icn_head.png', 'icn_danial.png', 'icn_kitty.png']) {
  assert.strictEqual(REPLACEABLE.get(f).shape, 50, `${f} 應預設正圓（shape:50）`);
}
assert.strictEqual(REPLACEABLE.get('kitty_money.png').shape, 17, 'kitty_money 應 shape:17');
assert.strictEqual(REPLACEABLE.get('kitty_pilot.png').shape, 20, 'kitty_pilot 應 shape:20');
assert.strictEqual(REPLACEABLE.get('kitty_face_pink.png').shape, 14, 'kitty_face_pink 應 shape:14');
assert.strictEqual(REPLACEABLE.get('BG_Loading.png').shape, null, 'BG_Loading 應禁用形狀裁切');

console.log('PASS shape 欄位');
