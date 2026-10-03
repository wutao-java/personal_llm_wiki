# 演示知识编译规则

## 知识类型

知识项类型采用直接、稳定的业务名称：

- `domain`：领域总览；
- `objective`：目标或验收结果；
- `role`：参与角色；
- `concept`：业务或技术概念；
- `process`：有顺序和状态变化的流程；
- `rule`：可执行约束或判断条件；
- `component`：系统组件或服务；
- `data_object`：稳定数据对象；
- `interface`：接口或事件契约；
- `metric`：可计算指标；
- `incident`：事故与修复事实；
- `release`：已发布变更集合。

## 关系类型

| 类型 | 方向 | 含义 |
|---|:---:|---|
| `part_of` | 有向 | 来源知识属于目标领域或更大对象 |
| `supports` | 有向 | 来源知识为目标提供业务或技术支撑 |
| `depends_on` | 有向 | 来源知识成立或执行依赖目标 |
| `implemented_by` | 有向 | 业务知识由目标组件实现 |
| `produces` | 有向 | 来源流程产生目标对象或状态 |
| `triggers` | 有向 | 来源事件触发目标流程或状态 |
| `governed_by` | 有向 | 来源知识受目标规则或控制约束 |
| `measured_by` | 有向 | 来源知识由目标指标衡量 |
| `supersedes` | 有向 | 新知识版本替代旧版本事实 |
| `conflicts_with` | 无向 | 两项候选事实存在待审核冲突 |

不得使用无明确含义的 `related_to` 来增加边数。

## 页面与链接

- 页面路径固定为 `reference/wiki/<domain>/<slug>.md`。
- `knowledgeId` 和 slug 在标题微调后保持不变。
- 所有互链写成 `[[domain/slug]]`；禁止裸 `[[slug]]`。
- 每页至少包含摘要、核心说明、关系和来源四部分。
- `index.md` 按领域列出全部页面，并为每页提供一行摘要。

## 来源与证据

- 来源正文只读；编译过程不能向 `raw/` 写入任何文件。
- 证据使用 `sourceVersionId + path + charStart + charEnd` 定位。
- 每条已接受关系至少有一个证据片段。
- 更新来源创建新 `sourceVersionId`，不覆盖历史正文。
- 证据不足的候选关系不进入已接受预置快照。

## 预置快照

预置快照的 `compiledBy` 明确记录 `Codex` 和编译时间。它可以作为正式首个快照导入，
但它与后续 DeepSeek 编译结果共用同一 schema。图谱投影是快照派生物，不是新的知识来源。

