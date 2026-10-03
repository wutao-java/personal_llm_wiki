# 连锁零售企业客户服务与知识运营项目资料集

这是 FF - LLM Wiki知识库内置的一套企业客户服务与知识运营资料，用于产品初始内容、开发和回归验收。

`raw/` 是来源真相；`reference/wiki/` 是 Codex 从这些来源编译出的可读知识页；
`preset/` 是同一次编译产生的正式对象快照和图谱投影。预置数据用于首次进入时提供完整知识内容，
但不能替代后续上传资料时的真实模型编译。

数据集的完整约束见：
`docs/specs/0002-enterprise-customer-service-built-in-data/spec.md`。

## 重要边界

- 不直接编辑 `raw/` 中已经登记到 `corpus-manifest.json` 的文件；变更通过新来源版本表达。
- 不直接编辑生成的 Wiki、快照或图谱投影；应修改 authoring blueprint 后重新生成并完整校验。
- 产品初始化时先通过正式后端来源服务导入 66 个逻辑来源和 72 个 Markdown 来源版本，
  使其可在资料管理中列出、查看版本和阅读正文；页面不得绕过后端直接加载本目录文件。
- 默认知识快照和图谱投影在来源导入后通过同一正式数据边界导入，不能替代来源入库或成为图谱专用真相。
- `evaluation/` 中的标准答案仅用于自动化比对，不允许在问答产品中按问题文本直接返回。
- 所有内置内容均不包含现实客户、订单、联系方式、密钥或个人身份信息。

## 数据校验与重新生成

日常只运行校验：

```bash
node fixtures/enterprise-customer-service/tools/validate-fixture.mjs
```

生成工具只使用 Node.js 标准库，不引入产品依赖，并且默认拒绝覆盖现有文件。
只有明确重新生成整套来源与派生产物时才运行：

```bash
node fixtures/enterprise-customer-service/tools/build-fixture.mjs --force
node fixtures/enterprise-customer-service/tools/validate-fixture.mjs
```

重新生成会产生新的冻结清单，必须作为一次完整数据集变更评审，不能在编译或查询过程中执行。
