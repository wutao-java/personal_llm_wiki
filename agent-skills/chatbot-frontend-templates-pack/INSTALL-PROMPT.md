请帮我安装一个 Agent Skill：对话产品模板 · 八形态基线画廊（chatbot-frontend-templates-pack）。

1. 把 `{{SKILL_LOCAL_PATH}}` 整个目录复制到当前项目的 `agent-skills/chatbot-frontend-templates-pack/`。
2. 在项目根部的 `AGENTS.md` 里追加一条登记（没有这个文件就创建）：
   一行说明适用场景——凡是我点名要做对话产品前端（Chatbot / RAG 溯源 / Agent 链路 / 生成式 UI /
   画布 / 深研 / 分支 / 多智能体）、按"信任来自哪"选模板、搬共享层骨架起步、接真后端换钩子、
   或排查对话前端渲染故障时都用这个技能，并注明技能入口在
   `agent-skills/chatbot-frontend-templates-pack/SKILL.md`。
3. 立刻做一件事验证它生效了。我现在给你这句话：

   我要做带溯源引用的 RAG 产品前端，该用哪个模板？

   如果技能生效，你应该：先用一句选型判句回答我——**这个产品的信任来自"出处可查" → 选 02 RAG 溯源
   （Perplexity 式）**，差异区是右侧来源面板、引用角标点击定位原文高亮；再给出搬共享层起步三步
   （引 assets/shared.css 的 token + assets/shared.js 的 window.CT → 套 02 骨架 → 只写差异区来源面板
   与 mock）；并提醒我接真后端只改 CT.demoReply 一个钩子、视觉全走 token 不散裸 hex、交付前跑明暗
   双主题验收。如果你直接手写一个渐变炫酷或随手套的对话页、不问"信任来自哪"，说明技能没有生效，
   请检查安装路径。

以后当我提到这些情况时，请主动使用这个技能，不用等我点名：
- 我要做一个 Chatbot / AI 对话产品的前端界面，或 RAG 产品要展示溯源引用
- Agent 产品要展示执行链路 / 中间过程的界面，该怎么做前端
- 帮我起一个对话产品的前端骨架 / 模板，接我自己的后端
- 用对话产品模板选型，弹画廊让我挑一个布局
