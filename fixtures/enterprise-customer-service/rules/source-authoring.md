# 来源资料写作约定

每份来源使用 YAML frontmatter，至少包含：

```yaml
source_id: SRC-ORD-001
source_version_id: SV-SRC-ORD-001-1
title: 订单生命周期
document_type: specification
version: "1.0"
effective_date: 2026-06-01
owner: 订单产品组
status: approved
```

正文采用专业业务文档结构：文档目的、适用范围、核心定义、处理规则、异常与恢复、
验收与记录、相关资料。正文中的事实编号用于证据定位，但不预先声明图谱节点或写入 JSON。

更新文件必须增加 `supersedes`，说明替代的 `sourceVersionId`，并保留旧文件。

