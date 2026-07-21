// tools/replace.mjs
import sharp from 'sharp';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPLACEABLE, ICONS } from './assets-spec.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 純轉換：把來源圖 cover 縮放到 spec 尺寸，回傳 PNG buffer ＋警告清單（不寫檔）
export async function encodeToSpec(srcPath, spec) {
  const warnings = [];
  const meta = await sharp(srcPath).metadata();
  const srcAR = meta.width / meta.height;
  const dstAR = spec.w / spec.h;
  if (Math.abs(srcAR - dstAR) / dstAR > 0.05) {
    warnings.push(`來源長寬比 ${srcAR.toFixed(2)} ≠ 目標 ${dstAR.toFixed(2)}，將置中裁切（cover）`);
  }
  if (spec.alpha) {
    // 只看 hasAlpha 會漏：一般照片／截圖多半是 RGBA 但 alpha 全 255，
    // 換進來 app 裡就是一塊實心方形。用 stats().isOpaque 驗有沒有真的透明像素。
    if (!meta.hasAlpha) {
      warnings.push('規格需透明背景，但來源無 alpha 通道');
    } else if ((await sharp(srcPath).stats()).isOpaque) {
      warnings.push('規格需透明背景，但來源整張不透明（有 alpha 通道卻無透明像素）');
    }
  }
  const base = sharp(srcPath).resize(spec.w, spec.h, { fit: 'cover', position: 'centre' });
  let buf = await base
    .clone()
    .png({ palette: false, compressionLevel: 9 }) // 明講關 palette：sharp 0.35 隱性規則
    .toBuffer();
  if (buf.length > spec.maxBytes) {
    // 照片類來源存全彩 PNG 常直接爆上限（BG_Loading 實測 4988KB/1536KB）。
    // 自動降級 palette 量化（tRNS 保透明，check 端認得 colorType 3），
    // 由高到低試品質，壓進上限就收；全試完仍超標才維持警告、寫最小的那版。
    for (const quality of [90, 70, 50]) {
      const candidate = await base
        .clone()
        .png({ palette: true, quality, compressionLevel: 9 })
        .toBuffer();
      if (candidate.length < buf.length) buf = candidate;
      if (candidate.length <= spec.maxBytes) {
        warnings.push(
          `全彩 PNG 過大，已自動壓縮（palette 量化 q${quality}）→ ${(candidate.length / 1024).toFixed(0)}KB`,
        );
        break;
      }
    }
  }
  if (buf.length > spec.maxBytes) {
    warnings.push(`輸出 ${(buf.length / 1024).toFixed(0)}KB 超過上限 ${(spec.maxBytes / 1024).toFixed(0)}KB`);
  }
  return { buf, warnings };
}

export function bumpSwCache(root = REPO_ROOT) {
  const swPath = path.join(root, 'sw.js');
  const sw = readFileSync(swPath, 'utf8');
  const m = sw.match(/const CACHE_NAME = 'wetravel-v(\d+)';/);
  if (!m) {
    console.warn('⚠ 找不到 CACHE_NAME，未 bump——請手動 bump sw.js');
    return;
  }
  const next = Number(m[1]) + 1;
  writeFileSync(swPath, sw.replace(m[0], `const CACHE_NAME = 'wetravel-v${next}';`));
  console.log(`✓ sw.js CACHE_NAME → wetravel-v${next}`);
}

async function writeOne(srcPath, spec, destPath) {
  const { buf, warnings } = await encodeToSpec(srcPath, spec);
  warnings.forEach((w) => console.warn(`⚠ ${w}`));
  writeFileSync(destPath, buf);
  console.log(`✓ ${path.basename(destPath)} ${spec.w}x${spec.h} ${(buf.length / 1024).toFixed(0)}KB`);
}

function listReplaceable() {
  console.error('  icon（PWA 圖示，一次產出 icon-192 + icon-512）');
  for (const s of REPLACEABLE.values()) {
    if (s.file.startsWith('icon-')) continue;
    console.error(`  ${s.file}  (${s.w}x${s.h})  ${s.use}`);
  }
}

async function main() {
  const [target, src] = process.argv.slice(2);
  if (!target || !src) {
    console.error('用法：node tools/replace.mjs <目標檔名|icon> <新圖路徑>');
    process.exit(1);
  }
  if (!existsSync(src)) {
    console.error(`✗ 找不到來源圖：${src}`);
    console.error('  提示：Windows 檔案總管預設隱藏副檔名，實際檔名可能是 xxx.jpg／xxx.png——');
    console.error('  補上副檔名，或把檔案直接拖進終端機視窗讓路徑自動帶入。');
    process.exit(1);
  }
  if (target === 'icon') {
    for (const spec of ICONS) {
      await writeOne(src, spec, path.join(REPO_ROOT, spec.file));
    }
    bumpSwCache();
    return;
  }
  const spec = REPLACEABLE.get(target);
  if (!spec || target.startsWith('icon-')) {
    console.error(`✗ 「${target}」不是可替換素材。可換清單：`);
    listReplaceable();
    process.exit(1);
  }
  await writeOne(src, spec, path.join(REPO_ROOT, 'assets', spec.file));
  bumpSwCache();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
