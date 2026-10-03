# 企业客户服务知识索引

本索引列出版本 1.1 的全部知识页面。查询或人工阅读应先从领域和摘要定位目标页面。

## 项目与角色

- [客户服务知识系统项目](project/customer-service-knowledge-project.md)：面向连锁零售客户服务场景，统一资料、知识、业务关系、来源证据和问答体验的建设项目。
- [项目目标](project/project-goal.md)：以可追溯知识回答缩短服务人员查找规则和核对来源的时间，同时保留人工复核入口。
- [交付范围](project/delivery-scope.md)：首版覆盖订单、库存、履约、售后和知识服务，不承担组织权限、自动全网研究与生产级计费。
- [客户](project/customer-role.md)：通过网页或应用内入口提出业务问题、确认处理方案并对服务结果反馈。
- [服务人员](project/service-agent-role.md)：受理客户问题、核验身份、查看引用、创建工单并在证据不足时升级处理。
- [产品运营](project/product-operator-role.md)：维护商品与业务规则，确认变更影响并向知识运营提供正式资料。
- [知识审核人员](project/knowledge-reviewer-role.md)：审核候选知识、关系与来源证据，决定接受、保留待处理或退回。
- [系统管理员](project/system-admin-role.md)：维护模型连接和系统运行参数，不参与普通知识结论的业务审核。
- [服务渠道](project/service-channel.md)：客户问题从网页、应用内入口或人工服务进入统一受理流程，并保留原始渠道。
- [服务时间](project/business-hours.md)：人工服务按公布时间提供；非服务时间保留自助知识回答和工单登记。
- [服务目标](project/service-level-objective.md)：通过首次响应、解决时长、引用准确率和客户满意度衡量服务质量。
- [验收标准](project/acceptance-criteria.md)：验收必须覆盖真实上传、编译、审核、图谱、知识阅读和带引用问答的连续旅程。
- [项目术语](project/project-glossary.md)：为服务请求、工单、知识项、关系、引用、快照和历史结果提供统一定义。
- [升级负责人](project/escalation-owner.md)：对跨团队或高优先级问题承担接收、协调、结果确认和回传责任。
- [项目里程碑](project/project-milestone.md)：按资料准备、编译验证、界面联调、核心旅程和验收证据五个阶段推进。
- [来源管理原则](project/source-governance.md)：原始来源按版本保留，编译只能读取，任何变更必须创建新的来源版本。
- [知识版本发布](project/snapshot-release.md)：审核接受的知识、关系和证据以原子方式形成新的知识版本供全部页面使用。
- [历史结果](project/historical-result.md)：历史回答继续引用生成时的知识版本，不因后来资料变化而被静默改写。
- [版本 1.1](project/release-1-1.md)：汇总六项规则调整与六项新增能力，并保留基础版本的来源和历史回答。

## 商品与库存

- [商品与库存管理](catalog/catalog-inventory-management.md)：负责商品主数据、可售判断、库存同步、锁定释放和库存异常恢复。
- [商品](catalog/product.md)：面向客户展示和销售的业务对象，包含标题、类目、品牌、状态和展示信息。
- [SKU](catalog/sku.md)：商品的最小可库存和可销售单元，由规格组合唯一确定。
- [商品状态](catalog/product-status.md)：区分草稿、上架、停售和下架，并与可售规则共同决定客户能否购买。
- [可售规则](catalog/sellable-rule.md)：商品状态有效、价格可用、库存充足且渠道允许时才可进入订单创建。
- [门店](catalog/store.md)：承担库存持有、自提和部分配送履约的经营单元。
- [库存](catalog/inventory.md)：记录门店或中心仓特定 SKU 的实物数量、锁定数量和可用数量。
- [可用库存](catalog/available-inventory.md)：在实物库存基础上扣除锁定、冻结和安全库存后可用于新订单的数量。
- [锁定库存](catalog/reserved-inventory.md)：已为待支付或处理中订单预留、暂不可供其他订单使用的数量。
- [库存锁定](catalog/inventory-lock.md)：订单校验通过后锁定所需 SKU；更新版本普通订单锁定十分钟，支付处理中订单执行补偿检查。
- [库存释放](catalog/inventory-release.md)：订单取消、支付超时或创建失败时按幂等规则归还锁定库存。
- [库存同步](catalog/inventory-sync.md)：门店和中心库存变化通过版本化事件同步，并对乱序和重复事件执行校验。
- [缺货](catalog/stockout.md)：客户所需数量超过可用库存或履约门店无法确认实物时形成缺货状态。
- [替代商品](catalog/substitute-product.md)：在类目、关键属性、价格范围和库存满足条件时向客户建议的可替代 SKU。
- [商品价格](catalog/price.md)：用于展示和订单计算的基础金额，并在订单创建时形成不可静默改写的价格快照。
- [促销规则](catalog/promotion.md)：定义优惠资格、适用商品、有效期和与其他优惠的叠加边界。
- [商品信息纠错](catalog/product-correction.md)：对客户反馈的标题、规格、图片或属性错误执行核验、修正、复核和知识更新。
- [库存异常](catalog/inventory-exception.md)：包括负库存、长时间未同步、锁定未释放和门店账实不符等需要恢复的问题。
- [门店缺货转单](catalog/store-order-transfer.md)：原履约门店确认缺货后，筛选可履约门店、征得客户确认并重新锁定库存。

## 订单与支付

- [订单与支付管理](order/order-payment-management.md)：负责订单创建、状态转换、取消、支付、退款、优惠和发票规则。
- [订单](order/order.md)：记录客户、订单项、金额、履约方式、支付和售后状态的核心业务对象。
- [订单项](order/order-item.md)：记录某个 SKU 的购买数量、成交价格、优惠分摊和履约信息。
- [订单状态](order/order-status.md)：包括待确认、待支付、处理中、已履约和已关闭，并限制允许的状态转换。
- [订单创建](order/order-create.md)：汇总客户选择并在业务校验通过后生成订单和订单项。
- [订单校验](order/order-validation.md)：按商品状态、库存、价格、客户身份和履约信息顺序确认订单可创建。
- [订单取消](order/order-cancel.md)：在允许状态和时限内关闭订单，并触发库存释放和必要的退款。
- [取消窗口](order/cancel-window.md)：更新版本待支付订单可在创建后二十分钟内自助取消；支付处理中需要人工确认支付结果。
- [支付](order/payment.md)：客户通过受支持渠道完成订单金额支付，并由支付状态驱动订单后续处理。
- [支付方式](order/payment-method.md)：表示订单使用的支付渠道及其可用范围、费用和退款能力。
- [支付状态](order/payment-status.md)：包括待支付、处理中、成功、失败和已退款，并与订单状态分开记录。
- [支付回调](order/payment-callback.md)：支付渠道异步通知支付结果的接口消息，必须验签并按幂等规则处理。
- [幂等键](order/idempotency-key.md)：用于识别重复的创建、回调、取消或退款请求，避免同一业务动作执行多次。
- [退款](order/refund.md)：把符合条件的已支付金额原路退回，并记录申请、处理和到账状态。
- [退款状态](order/refund-status.md)：包括待审核、处理中、成功和失败，失败时保留渠道原因与重试入口。
- [优惠分摊](order/discount-allocation.md)：将整单优惠按可解释口径分配到订单项，用于部分退款和财务核对。
- [发票](order/invoice.md)：记录开票抬头、税号、金额、状态以及红冲和重新开具关系。
- [订单异常](order/order-exception.md)：覆盖支付成功无订单、状态不一致、退款长时间未到账和重复扣款等问题。

## 履约与售后

- [履约与售后管理](fulfillment/fulfillment-aftersales-management.md)：负责配送、自提、物流状态、签收、退换货、逆向物流和补偿。
- [履约单](fulfillment/fulfillment-order.md)：从订单拆分出的履约执行对象，记录门店或仓库、方式、状态和承诺时间。
- [履约方式](fulfillment/fulfillment-method.md)：区分配送、门店自提等执行方式，并决定需要的地址、门店和核验信息。
- [配送](fulfillment/delivery.md)：由门店、仓库或承运方把商品送达客户指定地址的履约过程。
- [配送范围](fulfillment/delivery-area.md)：根据地址、门店服务能力、商品限制和承运能力判断是否可配送。
- [承诺时效](fulfillment/promised-time.md)：在下单时向客户确认的预计送达时间，并用于识别延迟。
- [门店自提](fulfillment/store-pickup.md)：门店完成备货后通知客户，客户核验身份和取货码后完成核销。
- [取货码](fulfillment/pickup-code.md)：用于门店自提核验的一次性凭证，不替代需要的客户身份检查。
- [物流状态](fulfillment/logistics-status.md)：将承运方事件映射为已揽收、运输中、派送中、已签收和异常等客户可见状态。
- [物流事件](fulfillment/logistics-event.md)：承运方或门店发布的状态变化记录，带有事件时间、业务时间和唯一编号。
- [签收](fulfillment/signoff.md)：确认商品已经交付客户或授权收件人，并结束正向配送。
- [签收异常](fulfillment/signoff-exception.md)：包括未收到却显示签收、破损、少件和错误交付，需要核查物流证据。
- [退货申请](fulfillment/return-request.md)：客户提交需要退回的订单项、原因、数量和必要凭证后形成的售后请求。
- [退货时限](fulfillment/return-window.md)：更新版本符合条件的商品可在签收后十五个自然日内申请无理由退货；法定和业务例外仍按清单处理。
- [换货申请](fulfillment/exchange-request.md)：客户在资格和库存满足时提出以同商品其他合格 SKU 替换原订单项。
- [逆向物流](fulfillment/reverse-logistics.md)：把退回商品从客户侧运输到指定质检或入库地点。
- [退货质检](fulfillment/return-inspection.md)：核对退回商品身份、完整性、使用情况和可再销售状态。
- [售后补偿](fulfillment/compensation.md)：对履约延迟、商品破损或服务失误按原因、影响和审批边界提供补偿。
- [同城即时配送](fulfillment/instant-delivery.md)：在覆盖门店和可用库存满足条件时提供较短承诺时效；无法履约时降级为普通配送并通知客户。

## 客户服务

- [客户服务管理](service/customer-service-management.md)：负责问题分类、请求受理、工单流转、人工升级、引用回答和反馈闭环。
- [服务请求](service/service-request.md)：记录客户提出的问题、渠道、相关业务对象、身份核验和当前处理状态。
- [问题分类](service/issue-category.md)：按订单、支付、配送、售后、商品和账户等稳定分类路由服务请求。
- [服务意图](service/service-intent.md)：从客户表达中识别查询、取消、退款、投诉或信息修改等目标。
- [工单](service/ticket.md)：需要持续跟踪、人工处理或跨团队协作的服务记录。
- [工单状态](service/ticket-status.md)：包括新建、处理中、等待客户、等待协同、已解决和已关闭。
- [工单优先级](service/ticket-priority.md)：根据客户影响、资金风险、履约中断和问题范围确定处理优先级。
- [首次响应时限](service/first-response-time.md)：更新版本最高优先级工单应在五分钟内首次响应，超时自动升级。
- [解决时长](service/resolution-time.md)：从服务请求受理到确认解决的时间，等待客户补充资料的时间单独记录。
- [客户身份核验](service/customer-verification.md)：在查询敏感订单信息、修改联系方式或处理退款前确认客户权限。
- [人工升级](service/manual-escalation.md)：证据不足、高风险、客户明确要求或自动流程失败时转交人工处理。
- [协同任务](service/collaboration-task.md)：工单需要订单、库存、支付或门店团队处理时建立的可跟踪任务。
- [回答草稿](service/answer-draft.md)：基于当前知识版本和检索证据生成、尚待输出或确认的回答内容。
- [带引用回答](service/cited-answer.md)：向用户呈现结论、来源角标、采用证据和相关知识入口的回答。
- [引用](service/citation.md)：把回答中的具体结论连接到知识项和原始来源证据位置。
- [客户确认](service/customer-confirmation.md)：在执行取消、退款、替代商品或重要信息变更前确认客户理解并同意。
- [客户反馈](service/feedback.md)：记录客户对回答、处理过程和结果的评价、原因与补充说明。
- [服务关闭](service/service-closure.md)：处理结果已执行、客户获得说明且无未完成协同任务后关闭服务请求。

## 知识与模型

- [知识处理与模型使用](knowledge/knowledge-model-management.md)：负责来源版本、知识编译、关系证据、审核发布、检索回答和模型配置。
- [资料](knowledge/source.md)：用户导入并在产品中管理的逻辑资料身份。
- [资料版本](knowledge/source-version.md)：某份资料在特定时间的只读内容版本，具有摘要和稳定定位信息。
- [Markdown 解析](knowledge/markdown-parser.md)：读取 Markdown 结构和文本位置，不执行脚本或文档中的操作指令。
- [来源证据](knowledge/evidence-fragment.md)：通过来源版本和字符范围定位的原文片段，用于支持知识、关系和回答。
- [编译任务](knowledge/compile-run.md)：记录一轮来源校验、读取、知识重组、关系建立、检查、审核和发布状态。
- [知识项](knowledge/knowledge-item.md)：按稳定知识单元重组的标题、摘要、正文、类型、状态和来源集合。
- [知识类型](knowledge/knowledge-type.md)：区分领域、目标、角色、概念、流程、规则、组件、数据对象、接口和指标等。
- [知识关系](knowledge/relation.md)：连接两个知识项并记录明确语义、方向、权重和证据的对象。
- [审核问题](knowledge/review-issue.md)：记录证据不足、悬空关系、冲突或处理失败，并指向可恢复动作。
- [知识审核](knowledge/knowledge-review.md)：更新版本证据覆盖达到百分之八十五的候选项才进入可接受集合，仍需用户确认。
- [知识版本](knowledge/knowledge-snapshot.md)：一次原子发布的知识项、关系、证据和派生索引集合。
- [知识检索](knowledge/retrieval.md)：只在当前已接受知识版本中寻找与问题相关的知识和来源证据。
- [推荐问题](knowledge/suggested-question.md)：根据当前知识版本生成并关联相关知识项的可提问入口。
- [回答生成](knowledge/answer-generation.md)：基于检索证据形成回答并明确引用，不在证据不足时生成确定结论。
- [模型配置](knowledge/model-profile.md)：保存连接类型、服务地址、模型标识、凭据引用和测试状态，不保存可回显密钥。
- [连接测试](knowledge/connection-test.md)：更新版本在十五秒内验证模型连接；可重试网络错误允许重试一次，并继续隐藏凭据和完整响应。
- [旧值防线](knowledge/stale-answer-guard.md)：来源发生变化后标记待编译；新知识版本发布前不得把旧结果伪装为当前答案。

## 系统与接口

- [系统与接口架构](system/system-interface-architecture.md)：定义客户服务界面、资料、编译、知识、图谱、问答和业务服务的边界与通信。
- [客户服务界面](system/customer-service-ui.md)：承载知识问答、资料管理、知识页面、知识图谱和设置五个一级模块。
- [资料服务](system/source-service.md)：负责资料身份、来源版本、文件读取状态、只读预览和移除影响分析。
- [知识编译服务](system/compile-service.md)：协调内容提取、知识重组、关系证据、一致性检查和发布。
- [知识服务](system/knowledge-service.md)：提供知识详情、来源、关系和当前知识版本读取能力。
- [图谱服务](system/graph-service.md)：从当前知识版本生成节点、关系、领域、度数和稳定布局种子。
- [问答服务](system/qa-service.md)：协调问题、检索、证据筛选、模型生成、引用和历史回答保存。
- [订单服务](system/order-service.md)：提供订单创建、查询、取消和状态管理接口。
- [库存服务](system/inventory-service.md)：提供库存查询、锁定、释放、同步和异常核对接口。
- [支付服务](system/payment-service.md)：提供支付创建、状态查询、回调处理和退款接口。
- [工单服务](system/ticket-service.md)：提供服务请求转工单、状态流转、协同任务和关闭接口。
- [履约服务](system/fulfillment-service.md)：提供配送、自提、物流状态和售后履约协同能力。
- [接口网关](system/api-gateway.md)：统一处理服务入口、身份校验、请求追踪、限流和错误映射。
- [事件总线](system/event-bus.md)：传递订单、库存、支付、履约和知识发布等异步事件。
- [重试策略](system/retry-policy.md)：只对明确可重试错误执行有限次数和退避间隔的重试，并保持幂等。
- [失败事件队列](system/dead-letter-queue.md)：保存超过重试上限的事件，供诊断、修复和人工重新处理。
- [文件存储](system/object-storage.md)：保存不可变来源文件和可访问的历史版本内容。
- [检索索引](system/search-index.md)：从已接受知识版本构建可重建的关键词和语义检索派生数据。

## 质量、安全与运营

- [质量、安全与运营管理](quality/quality-security-operations.md)：统一定义知识质量、隐私安全、运行监控、事故处理和变更记录。
- [回答有据性](quality/answer-groundedness.md)：衡量回答中的可验证结论是否由采用的来源证据支持。
- [引用准确率](quality/citation-accuracy.md)：衡量引用是否定位到真正支持对应结论的来源片段。
- [关系证据覆盖率](quality/relation-coverage.md)：衡量已接受关系中具备可访问证据的比例。
- [图谱一致性](quality/graph-consistency.md)：核对图谱节点和边与当前知识版本中的知识项和关系是否一致。
- [编译成功率](quality/compile-success-rate.md)：衡量可处理来源中成功生成并通过一致性检查的比例。
- [检索响应时间](quality/retrieval-latency.md)：衡量从提交检索到获得候选知识与证据的时间。
- [模型可用性](quality/model-availability.md)：衡量已配置默认模型连接测试和实际请求的成功情况。
- [来源完整性](quality/source-integrity.md)：通过内容摘要、版本身份和只读存储证明来源没有被编译过程改写。
- [个人信息](quality/personal-information.md)：包括可识别客户身份、联系方式、地址和订单关联信息。
- [数据分类](quality/data-classification.md)：把资料和字段划分为公开、内部和敏感等级，并决定处理与展示边界。
- [脱敏规则](quality/masking-policy.md)：在界面、日志和模型上下文中按最小必要原则隐藏敏感字段。
- [提示注入](quality/prompt-injection.md)：来源文档中试图改变系统行为、索取密钥或触发操作的不可信内容。
- [文档安全处理](quality/document-sanitization.md)：解析导入内容时移除脚本、危险 URL 和主动内容，同时保留可引用文本。
- [操作记录](quality/audit-log.md)：记录关键配置、编译、审核、发布、恢复和数据控制动作，但不记录明文密钥。
- [监控告警](quality/monitoring-alert.md)：对模型不可用、编译失败、接口错误、检索延迟和事件积压产生可恢复告警。
- [恢复手册](quality/recovery-runbook.md)：按现象、影响、检查、恢复、验证和回滚顺序指导故障处理。
- [变更记录](quality/change-record.md)：记录变更原因、范围、负责人、验证结果、发布时间和回滚条件。
- [支付回调积压事故](quality/payment-callback-backlog.md)：支付渠道突发重试与消费能力不足共同造成回调积压，订单状态延迟但支付账务未丢失。
- [引用定位偏差事故](quality/citation-offset-incident.md)：来源新版本发布后部分引用字符范围未重算，导致来源面板定位偏移；修复后增加快照级定位校验。
- [会员敏感信息](quality/member-sensitive-data.md)：会员手机号、地址和订单备注属于需要在检索、日志和界面中掩码的敏感信息。
