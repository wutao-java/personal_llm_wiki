# 渲染故障排查 · 症状→根因→修法

## 何时使用

图谱可视化页出现白屏 / 过曝 / 发虚 / 隐形 / 动画失效时，按症状定位根因。**图谱数据本身构建失败**（GraphRAG 索引报错）不在本表，归 rag-graphrag-pack。

## 症状表（8 条实测坑 + 2 条几何坑）

| # | 症状 | 根因 | 修法 |
|---|---|---|---|
| 1 | 白屏 + console 报 luma.gl throw | jsdelivr `/+esm` 双版本冲突(9.3.5 vs 9.3.6) | 换 `https://esm.sh/` 引 cosmos.gl |
| 2 | 全场过曝发糊 | bloom 参数过猛 | 回 strength 1.3 / radius 0.6 / threshold 0.15 起点 |
| 3 | 3D 场景不自动旋转 | 3d-force-graph 默认 trackball 无 autoRotate | 手动 `setInterval` 改 cameraPosition，pointerdown/wheel 时交还控制权 |
| 4 | SVG 入场动画不生效/闪跳 | CSS 类的 opacity 覆盖了 opacity 属性(attr) | 入场动画用 `style('opacity')`，结束后置回 `null` 让 CSS 接管 |
| 5 | 弦图自环花瓣盖住跨域丝带 | 对角线（域内流量）没清零 | **对角线清零** `matrix[i][i]=0`；对称矩阵直接给 d3.chord，不要 chordDirected+双向累加 |
| 6 | Retina 屏 canvas 发虚 | 没处理 devicePixelRatio | `canvas.width = css*devicePixelRatio` + `ctx.setTransform(dpr,...)` |
| 7 | 上千条边 SVG 卡死 | per-edge 渐变数百条可接受，上千条超载 | 上千条边改 canvas 渲染 |
| 8 | "Multiple instances of Three.js"警告 | examples 与主包版本/CDN 不一致 | 同锁 `three@0.170.0`（主包 + examples 同 CDN） |
| 附 A | Hive 同轴弦贴轴隐形 | 控制点未垂直于轴向偏移 | `px=-sin(angle), py=cos(angle), side=±1` 两侧偏移 |
| 附 B | 双曲圆盘数值爆炸 | Möbius `|a|` 未 clamp | clamp 在 **0.96** 以内（`if (m2 > 0.96*0.96) ...`） |

## 排查流程（校验→修复→重试）

1. 先看 console：有 luma.gl / Three.js 报错 → 查 CDN 源与版本锁（坑 1/8），不是换库。
2. 看首屏视觉：白屏查 CDN、过曝查 bloom、发虚查 devicePixelRatio、图元隐形查几何（对角线/垂直偏移）。
3. 改一处 → 起服务 → 截图 + 看 console → 复现则回上一步，直到零 error 且视觉恢复（转 kg-verification-loop 收口）。

## 症状不在表内怎么办（表外降级）

上表是 8+2 条实测坑，**不是全集**。遇到表外症状（如"节点中文文字乱码"、"tooltip 定位偏移"、"某浏览器不渲染"）：
- **不要硬套最像的表内条目**——文字乱码不是 devicePixelRatio、不是 bloom，别误诊。
- 按通用排查法降级：F12 看 console 具体报错 → 定位是数据/CSS/字体/库哪一层 → 最小复现 → 逐步二分。
- 如实声明"此症状超出本包收录的 8 条实测坑范围"，给出下一步取证动作，不编根因。

## 反模式

- ❌ 白屏就换库重写——根因是 CDN 源，换库白干。
- ❌ 过曝就关 bloom——丢了辉光质感，正解是回安全参数。
- ❌ 发虚就调 CSS 滤镜锐化——根因是 devicePixelRatio，滤镜救不了。
- ❌ 表外症状硬套表内最像条目——误诊比不诊断更贵。

---

来源：赋范空间 · 知识图谱可视化星图馆（踩坑清单 8 条 + 几何数值坑）。
