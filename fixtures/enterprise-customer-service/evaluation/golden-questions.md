# 标准问答集

本文件用于检索、引用和回答质量回归。不得在产品运行时根据问题文本直接返回这里的预期摘要。

## Q-001 · direct

**问题**：什么是可用库存？

**预期要点**：可用库存是在实物库存基础上扣除锁定、冻结和安全库存后可用于新订单的数量。

**相关知识**：K-CATALOG-AVAILABLE-INVENTORY、K-CATALOG-INVENTORY

**预期来源**：SV-SRC-CAT-003-1

## Q-002 · direct

**问题**：支付回调为什么必须使用幂等键？

**预期要点**：幂等键用于识别重复回调，避免同一支付结果被重复执行并造成订单状态或账务重复变化。

**相关知识**：K-ORDER-PAYMENT-CALLBACK、K-ORDER-IDEMPOTENCY-KEY

**预期来源**：SV-SRC-ORD-005-1

## Q-003 · direct

**问题**：工单有哪些主要状态？

**预期要点**：工单包括新建、处理中、等待客户、等待协同、已解决和已关闭。

**相关知识**：K-SERVICE-TICKET-STATUS、K-SERVICE-TICKET

**预期来源**：SV-SRC-CS-003-1

## Q-004 · direct

**问题**：知识版本是什么？

**预期要点**：知识版本是一次原子发布的知识项、关系、证据和派生索引集合。

**相关知识**：K-KNOWLEDGE-KNOWLEDGE-SNAPSHOT

**预期来源**：SV-SRC-KM-005-1、SV-SRC-KM-005-2

## Q-005 · direct

**问题**：带引用回答必须包含什么？

**预期要点**：带引用回答应呈现结论、来源角标、采用证据和相关知识入口。

**相关知识**：K-SERVICE-CITED-ANSWER、K-SERVICE-CITATION

**预期来源**：SV-SRC-CS-007-1

## Q-006 · direct

**问题**：什么情况下商品才可售？

**预期要点**：商品状态、价格、库存和渠道条件全部满足时才可售。

**相关知识**：K-CATALOG-SELLABLE-RULE、K-CATALOG-PRODUCT-STATUS、K-CATALOG-AVAILABLE-INVENTORY、K-CATALOG-PRICE

**预期来源**：SV-SRC-CAT-002-1、SV-SRC-CAT-003-1、SV-SRC-CAT-006-1

## Q-007 · direct

**问题**：退货质检检查哪些内容？

**预期要点**：退货质检核对商品身份、完整性、使用情况和可再销售状态。

**相关知识**：K-FULFILLMENT-RETURN-INSPECTION

**预期来源**：SV-SRC-AFS-003-1

## Q-008 · direct

**问题**：模型配置是否保存明文密钥？

**预期要点**：模型配置只保存凭据引用，页面状态、日志和普通响应不得回显明文密钥。

**相关知识**：K-KNOWLEDGE-MODEL-PROFILE、K-KNOWLEDGE-CONNECTION-TEST

**预期来源**：SV-SRC-KM-007-1、SV-SRC-KM-007-2、SV-SRC-SEC-001-1

## Q-009 · direct

**问题**：图谱一致性衡量什么？

**预期要点**：它核对图谱节点和边是否与当前知识版本中的知识项和关系一致。

**相关知识**：K-QUALITY-GRAPH-CONSISTENCY、K-KNOWLEDGE-KNOWLEDGE-SNAPSHOT

**预期来源**：SV-SRC-QA-001-1、SV-SRC-ARC-006-1

## Q-010 · direct

**问题**：服务关闭需要满足哪些条件？

**预期要点**：处理结果已执行、客户获得说明且不存在未完成协同任务后才能关闭服务请求。

**相关知识**：K-SERVICE-SERVICE-CLOSURE、K-SERVICE-COLLABORATION-TASK

**预期来源**：SV-SRC-CS-008-1、SV-SRC-CS-004-1

## Q-011 · multi_hop

**问题**：客户取消待支付订单后，库存和支付分别如何处理？

**预期要点**：订单取消触发库存释放；如果尚未支付无需退款，如果支付状态处理中则先人工确认支付结果再决定退款。

**相关知识**：K-ORDER-ORDER-CANCEL、K-CATALOG-INVENTORY-RELEASE、K-ORDER-PAYMENT-STATUS、K-ORDER-REFUND

**预期来源**：SV-SRC-ORD-003-1、SV-SRC-ORD-003-2、SV-SRC-CAT-004-1、SV-SRC-CAT-004-2、SV-SRC-ORD-004-1、SV-SRC-ORD-006-1

## Q-012 · multi_hop

**问题**：支付成功但订单仍显示待支付时应该怎样排查？

**预期要点**：先查询支付状态和回调记录，再用幂等键核对重复或延迟通知，必要时检查事件积压并补偿更新订单状态。

**相关知识**：K-ORDER-PAYMENT-STATUS、K-ORDER-PAYMENT-CALLBACK、K-ORDER-IDEMPOTENCY-KEY、K-QUALITY-PAYMENT-CALLBACK-BACKLOG、K-ORDER-ORDER-EXCEPTION

**预期来源**：SV-SRC-ORD-005-1、SV-SRC-ORD-009-1、SV-SRC-OPS-003-1

## Q-013 · multi_hop

**问题**：门店缺货时如何决定替代商品还是转单？

**预期要点**：先确认可用库存；满足类目、关键属性和价格条件时可建议替代商品，存在其他可履约门店时可在客户确认后转单并重新锁定库存。

**相关知识**：K-CATALOG-STOCKOUT、K-CATALOG-SUBSTITUTE-PRODUCT、K-CATALOG-STORE-ORDER-TRANSFER、K-SERVICE-CUSTOMER-CONFIRMATION、K-CATALOG-INVENTORY-LOCK

**预期来源**：SV-SRC-CAT-005-1、SV-SRC-CAT-009-1、SV-SRC-CS-002-1

## Q-014 · multi_hop

**问题**：退货申请到退款完成经过哪些主要环节？

**预期要点**：退货申请通过资格校验后进入逆向物流和退货质检，符合条件后触发退款并同步退款状态。

**相关知识**：K-FULFILLMENT-RETURN-REQUEST、K-FULFILLMENT-REVERSE-LOGISTICS、K-FULFILLMENT-RETURN-INSPECTION、K-ORDER-REFUND、K-ORDER-REFUND-STATUS

**预期来源**：SV-SRC-AFS-001-1、SV-SRC-AFS-001-2、SV-SRC-AFS-003-1、SV-SRC-ORD-006-1

## Q-015 · multi_hop

**问题**：来源变化后为什么不能立即把旧回答当作当前答案？

**预期要点**：来源变化只会产生待编译状态；新知识版本通过检查和审核后才能原子发布，历史回答继续绑定原知识版本。

**相关知识**：K-KNOWLEDGE-SOURCE-VERSION、K-KNOWLEDGE-STALE-ANSWER-GUARD、K-KNOWLEDGE-KNOWLEDGE-REVIEW、K-KNOWLEDGE-KNOWLEDGE-SNAPSHOT、K-PROJECT-HISTORICAL-RESULT

**预期来源**：SV-SRC-KM-001-1、SV-SRC-KM-005-1、SV-SRC-KM-005-2、SV-SRC-KM-008-1

## Q-016 · multi_hop

**问题**：点击回答中的引用后如何定位原文？

**预期要点**：引用先连接回答与知识项，再通过 evidenceId 找到资料版本和字符范围，由来源预览显示命中原文。

**相关知识**：K-SERVICE-CITATION、K-KNOWLEDGE-EVIDENCE-FRAGMENT、K-KNOWLEDGE-SOURCE-VERSION、K-SERVICE-CITED-ANSWER

**预期来源**：SV-SRC-CS-007-1、SV-SRC-KM-004-1、SV-SRC-KM-001-1

## Q-017 · multi_hop

**问题**：配送延迟如何影响客户服务和补偿？

**预期要点**：承诺时效用于识别延迟；延迟形成服务请求或工单，满足补偿规则时记录审批和补偿结果。

**相关知识**：K-FULFILLMENT-PROMISED-TIME、K-SERVICE-SERVICE-REQUEST、K-SERVICE-TICKET、K-FULFILLMENT-COMPENSATION

**预期来源**：SV-SRC-FUL-002-1、SV-SRC-CS-002-1、SV-SRC-AFS-004-1

## Q-018 · multi_hop

**问题**：知识图谱的节点大小和关系流动应依据什么？

**预期要点**：节点大小依据真实 degree 或明确业务权重；有方向的关系可依据关系权重展示流动，所有数值来自当前知识版本。

**相关知识**：K-SYSTEM-GRAPH-SERVICE、K-KNOWLEDGE-RELATION、K-QUALITY-GRAPH-CONSISTENCY、K-KNOWLEDGE-KNOWLEDGE-SNAPSHOT

**预期来源**：SV-SRC-ARC-006-1、SV-SRC-KM-004-1、SV-SRC-QA-001-1

## Q-019 · multi_hop

**问题**：客户要求退款时为什么要先核验身份？

**预期要点**：退款会改变订单资金状态，服务人员必须先确认客户有权操作相关订单，再创建退款流程并保存处理记录。

**相关知识**：K-SERVICE-CUSTOMER-VERIFICATION、K-ORDER-REFUND、K-ORDER-ORDER、K-QUALITY-AUDIT-LOG

**预期来源**：SV-SRC-CS-006-1、SV-SRC-ORD-006-1、SV-SRC-OPS-002-1

## Q-020 · multi_hop

**问题**：知识编译失败时系统应保留什么？

**预期要点**：系统保留原始来源版本、失败阶段和恢复原因，并继续提供上一个已接受知识版本，不发布不完整新版本。

**相关知识**：K-KNOWLEDGE-COMPILE-RUN、K-KNOWLEDGE-SOURCE-VERSION、K-KNOWLEDGE-REVIEW-ISSUE、K-KNOWLEDGE-KNOWLEDGE-SNAPSHOT、K-KNOWLEDGE-STALE-ANSWER-GUARD

**预期来源**：SV-SRC-KM-001-1、SV-SRC-KM-002-1、SV-SRC-KM-005-1、SV-SRC-KM-005-2、SV-SRC-KM-008-1

## Q-021 · multi_hop

**问题**：支付回调积压如何通过系统能力恢复？

**预期要点**：监控发现事件积压后，先控制支付渠道重试流量，再扩展消费、按幂等键补处理，超过上限的事件进入失败事件队列并人工恢复。

**相关知识**：K-QUALITY-PAYMENT-CALLBACK-BACKLOG、K-QUALITY-MONITORING-ALERT、K-SYSTEM-EVENT-BUS、K-SYSTEM-RETRY-POLICY、K-SYSTEM-DEAD-LETTER-QUEUE、K-ORDER-IDEMPOTENCY-KEY

**预期来源**：SV-SRC-OPS-003-1、SV-SRC-OPS-001-1、SV-SRC-ARC-007-1、SV-SRC-ORD-005-1

## Q-022 · multi_hop

**问题**：同城即时配送无法履约时怎样降级？

**预期要点**：系统检查配送范围和可用库存；条件不满足时降级为普通配送，更新承诺时效并通知客户确认。

**相关知识**：K-FULFILLMENT-INSTANT-DELIVERY、K-FULFILLMENT-DELIVERY-AREA、K-CATALOG-AVAILABLE-INVENTORY、K-FULFILLMENT-PROMISED-TIME、K-SERVICE-CUSTOMER-CONFIRMATION

**预期来源**：SV-SRC-FUL-010-1、SV-SRC-FUL-002-1、SV-SRC-CAT-003-1、SV-SRC-CS-002-1

## Q-023 · policy

**问题**：为什么原始资料不能被编译过程修改？

**预期要点**：原始资料是证据真相；只读版本和内容摘要用于证明知识、关系和回答所依据的内容没有被系统静默改写。

**相关知识**：K-PROJECT-SOURCE-GOVERNANCE、K-KNOWLEDGE-SOURCE-VERSION、K-QUALITY-SOURCE-INTEGRITY

**预期来源**：SV-SRC-PROJ-002-1、SV-SRC-KM-001-1、SV-SRC-SEC-002-1

## Q-024 · policy

**问题**：为什么不能把证据不足的关系直接发布？

**预期要点**：没有证据的关系无法审计，会进入审核问题；只有端点、语义和证据都通过检查的关系才能进入知识版本。

**相关知识**：K-KNOWLEDGE-RELATION、K-KNOWLEDGE-EVIDENCE-FRAGMENT、K-KNOWLEDGE-REVIEW-ISSUE、K-KNOWLEDGE-KNOWLEDGE-REVIEW

**预期来源**：SV-SRC-KM-004-1、SV-SRC-KM-005-1、SV-SRC-KM-005-2

## Q-025 · policy

**问题**：工单优先级由什么决定？

**预期要点**：优先级由客户影响、资金风险、履约中断和影响范围决定，而不是由客户催促次数单独决定。

**相关知识**：K-SERVICE-TICKET-PRIORITY、K-SERVICE-TICKET

**预期来源**：SV-SRC-CS-005-1、SV-SRC-CS-005-2

## Q-026 · policy

**问题**：为什么支付状态和订单状态要分开记录？

**预期要点**：两者由不同系统和事件驱动；分开记录可以识别支付成功但订单更新延迟等异常，并支持补偿处理。

**相关知识**：K-ORDER-PAYMENT-STATUS、K-ORDER-ORDER-STATUS、K-ORDER-PAYMENT-CALLBACK、K-ORDER-ORDER-EXCEPTION

**预期来源**：SV-SRC-ORD-001-1、SV-SRC-ORD-004-1、SV-SRC-ORD-005-1、SV-SRC-ORD-009-1

## Q-027 · policy

**问题**：为什么模型连接测试不能显示完整服务响应？

**预期要点**：完整响应可能包含敏感配置、上游细节或凭据信息；产品只展示可操作的测试状态和安全错误摘要。

**相关知识**：K-KNOWLEDGE-CONNECTION-TEST、K-KNOWLEDGE-MODEL-PROFILE、K-QUALITY-MASKING-POLICY

**预期来源**：SV-SRC-KM-007-1、SV-SRC-KM-007-2、SV-SRC-SEC-001-1

## Q-028 · policy

**问题**：为什么无方向关系不能显示单向粒子？

**预期要点**：单向粒子会暗示不存在的因果或流向；关系可视化必须忠实反映关系的方向字段。

**相关知识**：K-KNOWLEDGE-RELATION、K-SYSTEM-GRAPH-SERVICE、K-QUALITY-GRAPH-CONSISTENCY

**预期来源**：SV-SRC-KM-004-1、SV-SRC-ARC-006-1、SV-SRC-QA-001-1

## Q-029 · policy

**问题**：导入 Markdown 时如何处理文档中的操作指令？

**预期要点**：导入文档被视为不可信内容；解析器只提取安全文本和结构，不执行脚本、危险链接或要求系统改变行为的提示。

**相关知识**：K-KNOWLEDGE-MARKDOWN-PARSER、K-QUALITY-PROMPT-INJECTION、K-QUALITY-DOCUMENT-SANITIZATION

**预期来源**：SV-SRC-KM-001-1、SV-SRC-SEC-002-1

## Q-030 · policy

**问题**：项目为什么保留历史回答？

**预期要点**：历史回答是当时知识版本和模型处理的事实记录，保留它才能解释后来规则变化前后的差异。

**相关知识**：K-PROJECT-HISTORICAL-RESULT、K-KNOWLEDGE-KNOWLEDGE-SNAPSHOT、K-KNOWLEDGE-STALE-ANSWER-GUARD、K-QUALITY-CHANGE-RECORD

**预期来源**：SV-SRC-KM-008-1、SV-SRC-OPS-002-1

## Q-031 · history

**问题**：版本 1.0 和 1.1 的订单取消窗口分别是多少？

**预期要点**：基础版本为三十分钟，版本 1.1 调整为二十分钟；支付处理中订单需要人工确认。

**相关知识**：K-ORDER-CANCEL-WINDOW、K-PROJECT-RELEASE-1-1

**预期来源**：SV-SRC-ORD-003-1、SV-SRC-ORD-003-2、SV-SRC-PROJ-007-1

## Q-032 · history

**问题**：无理由退货时限在更新前后如何变化？

**预期要点**：基础版本为签收后七个自然日，版本 1.1 调整为十五个自然日，例外清单不变。

**相关知识**：K-FULFILLMENT-RETURN-WINDOW、K-PROJECT-RELEASE-1-1

**预期来源**：SV-SRC-AFS-001-1、SV-SRC-AFS-001-2、SV-SRC-PROJ-007-1

## Q-033 · history

**问题**：库存锁定时长为什么发生变化？

**预期要点**：版本 1.1 将普通订单锁定从十五分钟调整为十分钟，以减少长时间占用；支付处理中仍执行补偿检查。

**相关知识**：K-CATALOG-INVENTORY-LOCK、K-PROJECT-RELEASE-1-1

**预期来源**：SV-SRC-CAT-004-1、SV-SRC-CAT-004-2、SV-SRC-PROJ-007-1

## Q-034 · history

**问题**：最高优先级工单首次响应目标调整成多少？

**预期要点**：版本 1.1 从十分钟调整为五分钟，并增加超时自动升级。

**相关知识**：K-SERVICE-FIRST-RESPONSE-TIME、K-SERVICE-TICKET-PRIORITY、K-PROJECT-RELEASE-1-1

**预期来源**：SV-SRC-CS-005-1、SV-SRC-CS-005-2、SV-SRC-PROJ-007-1

## Q-035 · history

**问题**：知识审核阈值在版本 1.1 有什么变化？

**预期要点**：进入可接受候选集的证据覆盖阈值从百分之八十提高到百分之八十五。

**相关知识**：K-KNOWLEDGE-KNOWLEDGE-REVIEW、K-QUALITY-RELATION-COVERAGE、K-PROJECT-RELEASE-1-1

**预期来源**：SV-SRC-KM-005-1、SV-SRC-KM-005-2、SV-SRC-PROJ-007-1

## Q-036 · history

**问题**：模型连接测试策略在版本 1.1 有什么变化？

**预期要点**：超时从十秒调整为十五秒，并允许可重试网络错误重试一次。

**相关知识**：K-KNOWLEDGE-CONNECTION-TEST、K-SYSTEM-RETRY-POLICY、K-PROJECT-RELEASE-1-1

**预期来源**：SV-SRC-KM-007-1、SV-SRC-KM-007-2、SV-SRC-PROJ-007-1

## Q-037 · insufficient

**问题**：下季度每个门店具体销售目标是多少？

**预期要点**：资料集中没有门店销售目标，不能给出具体数值；应说明检索范围并建议补充经营计划。

**相关知识**：无；应返回证据不足

**预期来源**：无

## Q-038 · insufficient

**问题**：某位真实客户的手机号是什么？

**预期要点**：资料集不包含真实客户个人信息，也不应推断或编造手机号。

**相关知识**：K-QUALITY-PERSONAL-INFORMATION、K-QUALITY-MASKING-POLICY

**预期来源**：SV-SRC-SEC-001-1、SV-SRC-SEC-003-1

## Q-039 · insufficient

**问题**：明年一定会新增哪些支付渠道？

**预期要点**：当前资料没有已批准的未来支付渠道计划，不能把可能性表述为确定安排。

**相关知识**：K-ORDER-PAYMENT-METHOD、K-QUALITY-CHANGE-RECORD

**预期来源**：SV-SRC-ORD-004-1、SV-SRC-OPS-002-1

## Q-040 · insufficient

**问题**：所有配送延迟都会赔偿多少钱？

**预期要点**：补偿取决于原因、影响和审批边界，资料没有统一固定金额，不能给出单一数值。

**相关知识**：K-FULFILLMENT-COMPENSATION、K-FULFILLMENT-PROMISED-TIME

**预期来源**：SV-SRC-AFS-004-1、SV-SRC-FUL-002-1
