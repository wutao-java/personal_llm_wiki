## v1.0.0 (2026-07-15) 首发：7 项能力 + 八模板画廊

- 相对素材快照的唯一 assets 修复：05-canvas L105 与 06-research L140 的 placeholder 直引号截断改为弯引号（方法论坑 2 实证，check_template_integrity.py 检出）；其余 8 个资产文件与快照 md5 一致。

八种 Chatbot 产品布局基线模板 + 共享层契约 + 选型画廊 + 随包完整性校验器，首发七项能力：

### 新增能力
- 八形态选型（决策）：按"这个产品的信任来自哪"一句判句选模板（溯源→02 / 过程透明→03 /
  少打字多点选→04 / 产出物是文档→05 / 长任务→06 / 方案对比→07 / 分工协作→08 / 都不特殊→01）；
  用户显式点名时弹 index 画廊让用户亲挑，不替用户定形态。
- 共享层契约（方法）：shared.css token（明暗两套精确 hex）+ 骨架类名清单 + shared.js window.CT
  API（init/stream/demoReply/userMsg/aiMsg/toast）；共享层先立、每页只写差异区、单页 200 行级。
- 建站工作流（方法）：三决策先锁 → index 先行 → 共享层先立 → 逐页建 + 专业密度 mock，防方向性返工。
- 接真后端（方法）：只改 CT.demoReply（假回复钩子）与 CT.stream（换 SSE 增量渲染）两个点，
  消费端逻辑不变；token 不散 magic number。
- 产品红线（约束）：基线模板≠演示馆（首要教训置顶）· 禁含糊词/裸 hex · 按钮地板 · craft 底线五条。
- 明暗双主题验收（验收）：Playwright 闭环 navigate→等长模拟跑完→截图→查 console→交互真点→
  明暗抽查，零 error + 交互真响应 + 双主题都过三条硬标准；03/06/08 长模拟等跑完再截图。
- 8 坑排查（诊断）：nth-child 错位 / 弯引号截断 / 主题按钮目标态 / color-mix 透明色 /
  深拷贝 DOM 流式 / 按钮地板 / 等跑完再截图 / file://↔http 主题不互通，含表外症状通用降级。

### 工具脚本
- scripts/check_template_integrity.py：零依赖 python3 页面完整性四项机检（裸 hex magic number /
  骨架类名存活 / 属性直引号中文截断 / 死按钮启发式），内置 `--selftest` 绿例（01 基线体）全过 +
  红例（构造违规片段）双向自证。

### 随包资产
- assets/：八模板 HTML + index.html 选型画廊 + shared.css + shared.js，共 11 个可改模板。
- references/：八模板速查表 + 8 坑对照表 + 视觉 token 表（明暗两套精确 hex）。

### 追加计划
- 新模板形态进 assets 即 minor 版本。
- 共享层契约随真实后端接入反馈滚动。
