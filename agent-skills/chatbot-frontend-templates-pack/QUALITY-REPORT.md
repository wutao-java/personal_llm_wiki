# 出厂质检单 · chatbot-frontend-templates-pack

> 本包按《赋范课程 Skills 制作规范》全流程制作，以下为出厂检验记录。
> 质检单生成日期：2026-07-15

| 检验项 | 结果 |
|---|---|
| 结构校验（OpenAI / Anthropic 官方规则） | ✅ 全绿 |
| 评估用例 | 12 项（覆盖 7 项能力） |
| 触发测试 | 应触发 6 条 · 不应触发 4 条 |
| 实测评级 | **A**（出厂线 ≥A） |
| 行为命中率 | 34/37 = 92% |
| 触发准确率 | 10/10 = 100% |
| 纪律检查（反模式零出现 · 按需路由） | ✅ 全过 |
| 独立实例实测（干净环境装包实跑） | ✅ 通过（2026-07-15 · 实测模型：Claude 子实例（干净环境装包实测）） |
| 老师终审 | ⏳ 终审通过后更新 |

## 本包能力清单

- chat-backend-wiring
- chat-build-workflow
- chat-dual-theme-acceptance
- chat-gallery-troubleshooting
- chat-product-redlines
- chat-shared-layer-contract
- chat-template-selection

## 检验方法说明

- **结构校验**：按 OpenAI 与 Anthropic 官方 Skill 规范逐项机检（命名、触发描述、行数、引用深度、路径规范）
- **评估用例**：每项能力配真实任务用例，以可观察行为判定，不接受模型自我声称
- **触发测试**：验证该触发时触发、不该触发时不触发
- **独立实例实测**：Runner 与 Judge 双子实例分离——干净环境装包实跑全部用例，由独立评委逐条判定命中，评级 ≥A 方可出厂
