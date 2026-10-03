#!/usr/bin/env node
/* ============================================================================
 * validate_palette.js · 星图馆分类调色板机检（零依赖，随包自带）
 *
 * 星图馆的分类色是"机检跑出来的"，不是目测挑的。四项检查针对暗色深空底：
 *   ① 亮度带     CIELAB L* 落在暗色模式合理区间（过亮=霓虹过曝，过暗=底色吞没）
 *   ② 色度下限   CIELAB C* 不低于阈值（防灰泥/浊色，分类色必须够饱和才分得开）
 *   ③ CVD 分离   相邻色经色盲模拟后两两 ΔE ≥ 阈值（红绿色盲用户也能分辨）
 *   ④ 底色对比   与 surface 的 WCAG 相对亮度对比比 ≥ 阈值（暗底上读得清）
 *
 * 用法:
 *   node validate_palette.js "#0891b2,#d97706,..." --mode dark [--surface "#04060d"]
 *   node validate_palette.js --selftest      # 内置绿例(全过) + 红例(超亮度带) 双向自测
 *
 * 退出码: 0 = 全过 / 自测双向都对；1 = 有不合格项 / 自测失败 / 输入非法。
 *
 * 色度学出处:
 *   - sRGB↔linear、XYZ、CIELAB(D65)：IEC 61966-2-1 / CIE 15。
 *   - 色盲模拟矩阵：Viénot, Brettel & Mollon (1999) LMS 二色觉投影法。
 *   - ΔE：CIE76（Lab 欧氏距离），阈值按暗底分类色实测标定。
 * ========================================================================== */

'use strict';

/* ---- 阈值常量（暗色模式，surface≈#04060d 标定；改动需重跑 --selftest） ---- */
// 亮度带：星图馆 8 色实测 L*∈[55,61]；霓虹亮色(#22d3ee)L*≈78 属过曝。
// 取 [40,72] 给分类色留中段余量：<40 被深空底吞没，>72 发光过曝读成霓虹。
const L_BAND = { dark: [40, 72], light: [25, 60] };
// 色度下限：8 色最低 C*≈33（青/蓝绿）；取 28 拦住灰泥色又不误伤低饱和青。
const CHROMA_MIN = 28;
// 相邻色色盲分离：8 色相邻对最小 ΔE≈14；取 12 作硬门（低于即两色盲难辨）。
const CVD_DELTA_E_MIN = 12;
// 与底色对比：WCAG 非文本图形对比下限 3.0（WCAG 2.1 SC 1.4.11）。
const CONTRAST_MIN = 3.0;
const DEFAULT_SURFACE = '#04060d';

/* ---- 自测基准（方法论 §五-3 实测样本） ---- */
const GREEN_SAMPLE = ['#0891b2', '#d97706', '#d946ef', '#65a30d', '#3b82f6', '#ea580c', '#0d9488', '#f43f5e'];
// 红例：把绿例首色 #0891b2 换成霓虹青 #22d3ee，应报"超亮度带"。
const RED_SAMPLE = ['#22d3ee', '#d97706', '#d946ef', '#65a30d', '#3b82f6', '#ea580c', '#0d9488', '#f43f5e'];

/* ---------- 颜色空间转换 ---------- */
function hexToRgb(hex) {
  if (typeof hex !== 'string') throw new Error(`色值不是字符串: ${hex}`);
  const h = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`非法 hex 色值（需 #RRGGBB）: "${hex}"`);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linToSrgb(c) { c = c < 0 ? 0 : c > 1 ? 1 : c; return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }

// D65 白点
const WHITE = { x: 0.95047, y: 1.0, z: 1.08883 };
function labF(t) { const d = 6 / 29; return t > d * d * d ? Math.cbrt(t) : t / (3 * d * d) + 4 / 29; }
function rgbToLab(r, g, b) {
  const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / WHITE.x;
  const y = (0.2126729 * R + 0.7151522 * G + 0.0721750 * B) / WHITE.y;
  const z = (0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / WHITE.z;
  const fx = labF(x), fy = labF(y), fz = labF(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function chroma(lab) { return Math.hypot(lab[1], lab[2]); }
function deltaE76(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

function relLuminance(r, g, b) { return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b); }
function contrastRatio(hexA, hexB) {
  const la = relLuminance(...hexToRgb(hexA)), lb = relLuminance(...hexToRgb(hexB));
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- 色盲模拟（Viénot, Brettel & Mollon 1999，linear-RGB↔LMS） ---------- */
function rgbToLms(r, g, b) {
  return [
    17.8824 * r + 43.5161 * g + 4.11935 * b,
    3.45565 * r + 27.1554 * g + 3.86714 * b,
    0.0299566 * r + 0.184309 * g + 1.46709 * b,
  ];
}
function lmsToRgb(l, m, s) {
  return [
    0.0809444479 * l - 0.130504409 * m + 0.116721066 * s,
    -0.0102485335 * l + 0.0540193266 * m - 0.113614708 * s,
    -0.000365296938 * l - 0.00412161469 * m + 0.693511405 * s,
  ];
}
function simulateCVD(hex, type) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLin);
  const [l, m, s] = rgbToLms(r, g, b);
  let L, M, S;
  if (type === 'protan') { L = 2.02344 * m - 2.52581 * s; M = m; S = s; }         // 缺 L 视锥
  else { L = l; M = 0.494207 * l + 1.24827 * s; S = s; }                          // deutan：缺 M 视锥
  const [r2, g2, b2] = lmsToRgb(L, M, S);
  return [linToSrgb(r2) * 255, linToSrgb(g2) * 255, linToSrgb(b2) * 255];
}
function cvdDeltaE(hexA, hexB, type) {
  return deltaE76(rgbToLab(...simulateCVD(hexA, type)), rgbToLab(...simulateCVD(hexB, type)));
}

/* ---------- 四项检查 ---------- */
function runChecks(palette, surface, mode) {
  if (!Array.isArray(palette) || palette.length === 0) throw new Error('调色板为空');
  const band = L_BAND[mode] || L_BAND.dark;
  const failures = [];

  palette.forEach((hex) => {
    const lab = rgbToLab(...hexToRgb(hex));
    const L = lab[0], C = chroma(lab);
    // ① 亮度带
    if (L > band[1]) failures.push({ check: '亮度带', color: hex, detail: `L*=${L.toFixed(1)} 超亮度带（上限 ${band[1]}，过亮/霓虹过曝）` });
    else if (L < band[0]) failures.push({ check: '亮度带', color: hex, detail: `L*=${L.toFixed(1)} 低于亮度带（下限 ${band[0]}，过暗被底色吞没）` });
    // ② 色度下限
    if (C < CHROMA_MIN) failures.push({ check: '色度下限', color: hex, detail: `C*=${C.toFixed(1)} < ${CHROMA_MIN}（灰泥/浊色，分类色不够饱和）` });
    // ④ 底色对比
    const cr = contrastRatio(hex, surface);
    if (cr < CONTRAST_MIN) failures.push({ check: '底色对比', color: hex, detail: `对比比=${cr.toFixed(2)} < ${CONTRAST_MIN}（暗底上读不清）` });
  });

  // ③ 相邻色 CVD 分离
  for (let i = 0; i < palette.length - 1; i++) {
    const p = cvdDeltaE(palette[i], palette[i + 1], 'protan');
    const d = cvdDeltaE(palette[i], palette[i + 1], 'deutan');
    const worst = Math.min(p, d);
    if (worst < CVD_DELTA_E_MIN) {
      failures.push({ check: 'CVD 分离', color: `${palette[i]}↔${palette[i + 1]}`, detail: `色盲模拟 ΔE=${worst.toFixed(1)} < ${CVD_DELTA_E_MIN}（protan=${p.toFixed(1)} deutan=${d.toFixed(1)}，相邻两色难辨）` });
    }
  }
  return { pass: failures.length === 0, failures };
}

/* ---------- 输出 ---------- */
function printReport(palette, surface, mode, res) {
  console.log(`调色板校验 · mode=${mode} · surface=${surface} · ${palette.length} 色`);
  if (res.pass) { console.log('✅ 四项全过：亮度带 / 色度下限 / CVD 分离 / 底色对比'); return; }
  console.log(`❌ ${res.failures.length} 项不合格：`);
  res.failures.forEach((f) => console.log(`  · [${f.check}] ${f.color}: ${f.detail}`));
}

/* ---------- 自测（心法二：校验者本身也被测） ---------- */
function selftest() {
  const surface = DEFAULT_SURFACE;
  const green = runChecks(GREEN_SAMPLE, surface, 'dark');
  const red = runChecks(RED_SAMPLE, surface, 'dark');
  const redOverLuma = red.failures.some((f) => f.check === '亮度带' && f.color === '#22d3ee' && f.detail.includes('超亮度带'));

  const greenOk = green.pass === true;
  const redOk = red.pass === false && redOverLuma;
  console.log('--- selftest ---');
  console.log(`绿例（8 实测色，应全过）: ${greenOk ? '✅ 通过' : '❌ 应全过却报错'}`);
  if (!greenOk) green.failures.forEach((f) => console.log(`    · [${f.check}] ${f.color}: ${f.detail}`));
  console.log(`红例（#0891b2→#22d3ee，应报超亮度带）: ${redOk ? '✅ 如期不过' : '❌ 未如期报超亮度带'}`);
  if (!redOk) console.log(`    实际失败项: ${JSON.stringify(red.failures)}`);

  if (greenOk && redOk) { console.log('PASS'); return 0; }
  console.log('FAIL'); return 1;
}

/* ---------- CLI ---------- */
function parseArgs(argv) {
  const opts = { mode: 'dark', surface: DEFAULT_SURFACE, selftest: false, palette: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--selftest') opts.selftest = true;
    else if (a === '--mode') opts.mode = argv[++i];
    else if (a === '--surface') opts.surface = argv[++i];
    else if (!a.startsWith('--') && opts.palette === null) opts.palette = a;
  }
  return opts;
}

function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); }
  catch (e) { console.error(`参数错误: ${e.message}`); process.exit(1); }

  if (opts.selftest) { process.exit(selftest()); }

  if (!opts.palette) {
    console.error('用法: node validate_palette.js "#hex,#hex,..." --mode dark [--surface "#04060d"]');
    console.error('   或: node validate_palette.js --selftest');
    process.exit(1);
  }
  const palette = opts.palette.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  try {
    // 提前校验底色与每个色值，非法输入即报错退出
    hexToRgb(opts.surface);
    palette.forEach(hexToRgb);
    const res = runChecks(palette, opts.surface, opts.mode);
    printReport(palette, opts.surface, opts.mode, res);
    process.exit(res.pass ? 0 : 1);
  } catch (e) {
    console.error(`校验中止: ${e.message}`);
    process.exit(1);
  }
}

main();
