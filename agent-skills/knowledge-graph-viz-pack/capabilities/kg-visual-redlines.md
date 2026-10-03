# 视觉红线 · 配色必机检 · CDN 源 · 发光安全起点

## 何时使用

改配色、引第三方库（cosmos.gl / three.js）、调发光（bloom）参数之前——动手前先读，这些是白屏/过曝级返工的红线。

## 红线清单（逐条硬约束）

1. **配色必过机检，不许目测**：新配色交付前必须跑随包校验器，四项检查=亮度带 / 色度下限 / 相邻色 CVD 分离(≥12) / 与底色对比。
   ```bash
   node scripts/validate_palette.js "#0891b2,#d97706,#d946ef,#65a30d,#3b82f6,#ea580c,#0d9488,#f43f5e" --mode dark --surface "#04060d"
   ```
   本项目最终通过的 8 色（dark, surface #04060d）即上例，全过。**霓虹亮色（#22d3ee 级）会超亮度带**——发光感靠 shadowBlur/bloom 叠加，不靠提高基色亮度。校验器可 `node scripts/validate_palette.js --selftest` 自证可靠（内置绿例全过 + 红例报超亮度带）。

2. **cosmos.gl 只用 esm.sh 源**：`import { Graph } from 'https://esm.sh/@cosmos.gl/graph'`。**禁用 jsdelivr 的 `/+esm`**——会 luma.gl 双版本冲突（9.3.5 vs 9.3.6）直接 throw、页面白屏。

3. **UnrealBloomPass 安全起点 strength 1.3 / radius 0.6 / threshold 0.15**（2.8 会全场过曝糊掉）。数值调优铁律：先给保守值再往上加，过曝/过密比不够炫更毁效果。

4. **three.js 主包与 examples 同版本同 CDN**：`https://esm.sh/three@0.170.0` 与 `https://esm.sh/three@0.170.0/examples/...` 一起锁——混版本报"Multiple instances of Three.js"。

5. **底色 #04060d 是默认深空主题的基线，不是枷锁**：按用户项目视觉基调做主题落地时可以换
   surface / 主色（见 kg-data-contract-adaptation 第 5 步的决策点），但**换主题不豁免机检**——
   `validate_palette.js` 的 `--surface` 参数同步换成新底色重跑，四项全过才落地；bloom 仍从安全起点调。
   分类色**跟实体（领域）走，不跟排名走**；图例永远在场——这两条不随主题变。

## 落地流程（校验→修复→重试）

1. 动配色前：先把候选色跑 `validate_palette.js`，红项（超亮度带/灰泥色/CVD 太近/对比不足）先改到全过再落进 data.js 的 DOMAINS。
2. 引库前：核对 CDN 源与版本锁——cosmos.gl 走 esm.sh，three 主包+examples 同锁 three@0.170.0。
3. 调 bloom 前：从 1.3 / 0.6 / 0.15 起，逐步往上试，过曝立即回退。
4. 改完进 kg-verification-loop 截图确认非白屏/非过曝。

## 反模式

- ❌ 目测挑"好看的霓虹色"——必超亮度带，validate_palette 直接抓。
- ❌ bloom 一步拉到 2.8 追求炫——全场过曝糊掉，正解是回 1.3 / 0.6 / 0.15。
- ❌ jsdelivr `/+esm` 引 cosmos.gl——luma.gl 9.3.5 vs 9.3.6 双版本 throw、页面白屏。
- ❌ three 主包走 esm.sh、examples 走 jsdelivr——"Multiple instances of Three.js"警告。
- ❌ 换了项目主题却沿用旧 surface 跑机检（或干脆不重跑）——对比度/亮度带全部失真，机检等于没跑。

---

来源：赋范空间 · 知识图谱可视化星图馆（视觉系统红线 · 踩坑清单 · validate_palette 四项机检）。
