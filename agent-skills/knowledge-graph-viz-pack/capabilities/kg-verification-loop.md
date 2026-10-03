# 截图验证闭环 · 零 error 才算交付

## 何时使用

图谱可视化页做完/改完后——这是本包任何接入/优化动作的**固定收尾步**。WebGL、force 仿真、bloom 这类问题只有渲染时才暴露，不跑浏览器不算做完。**与图谱无关的一般网页验收**归 qa 类技能。

## 核心流程

1. **先核对库的真实 API，不凭记忆写**：写代码前 WebFetch 官方 README/示例——cosmos.gl v3 的 API 和 v1/v2 完全不同，凭记忆必错。
2. **起本地服务**：`python3 -m http.server`（file:// 也能跑，但验证一律用 http）。
3. **Playwright 逐页闭环**：navigate → **sleep 等动画/仿真收敛**（force 前 2 秒是一团乱麻，别误判布局坏了）→ screenshot → 看图 + `console_messages` 查错 → 改 → 重来。
4. **交互也要点一遍**：按钮切换、hover、双击各有独立坑（矩阵排序动画、双曲双击聚焦、chord 悬停），不能只看首屏。
5. **配色顺手过机检**：改过 DOMAINS 配色的，跑 `node scripts/validate_palette.js "<hex,...>" --mode dark` 确认四项全过（详见 kg-visual-redlines）。
6. **存真实截图**：验证通过的截图存 previews/，作为画廊首页卡片预览图——比 CSS 装饰图强十倍，用户一眼看到真效果。

## 三条硬验收标准（缺一不算交付）

- [ ] **零 console error**（不是"看起来没报错"，是 `console_messages` 实查）。
- [ ] **截图视觉达标**：非白屏、非过曝、布局收敛、图例在场、配色过 validate_palette。
- [ ] **交互点验通过**：每个控制按钮 + hover + 特有交互都点过一遍无异常。

## 校验→修复→重试

任一标准不过 → 按 kg-render-troubleshooting 定位根因 → 改 → 回第 3 步重跑闭环，直到三条全绿。数值调优（bloom / 粒子数 / 点数）先保守再往上加。

## 反模式

- ❌ 只看代码不跑浏览器就宣布"完成"——WebGL/仿真类 bug 只有渲染时才暴露。
- ❌ 截图不等收敛——force 仿真前 2 秒一团乱麻，误判布局坏了。
- ❌ 只验首屏不点交互——排序切换/悬停/双击各有独立坑。
- ❌ 凭记忆写库 API——cosmos.gl v3 与 v1/v2 完全不同，先查官方文档。

---

来源：赋范空间 · 知识图谱可视化星图馆（工程工作流 · Playwright 验证闭环）。
