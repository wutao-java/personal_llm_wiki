/* ============================================================
   星图馆 · 共享知识图谱数据
   一个种子随机(可复现)的 AI 领域知识图谱:
   8 个领域 · 120 个节点 · ~340 条边 · 附带层次结构
   ============================================================ */
window.KG = (() => {
  // -- 可复现随机数 (mulberry32) --
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // -- 已通过 dataviz 六项校验的暗色分类调色板 --
  const DOMAINS = [
    { id: 'llm',        name: '大模型',   en: 'LLM',        color: '#0891b2' },
    { id: 'agent',      name: '智能体',   en: 'AGENT',      color: '#d97706' },
    { id: 'multimodal', name: '多模态',   en: 'MULTIMODAL', color: '#d946ef' },
    { id: 'theory',     name: '基础理论', en: 'THEORY',     color: '#65a30d' },
    { id: 'compute',    name: '算力硬件', en: 'COMPUTE',    color: '#3b82f6' },
    { id: 'data',       name: '数据工程', en: 'DATA',       color: '#ea580c' },
    { id: 'safety',     name: '安全对齐', en: 'SAFETY',     color: '#0d9488' },
    { id: 'app',        name: '行业应用', en: 'APPS',       color: '#f43f5e' },
  ];

  const CONCEPTS = [
    /* llm */        ['Transformer', '注意力机制', 'MoE 混合专家', 'RLHF', '思维链 CoT', 'Scaling Laws', '涌现能力', '上下文窗口', 'LoRA 微调', '模型量化', 'KV Cache', '推理加速', '开源权重', '指令跟随'],
    /* agent */      ['ReAct 框架', '工具调用', '任务规划', '长期记忆', '多智能体协作', 'MCP 协议', '代码智能体', '计算机操作', '自我反思', '工作流编排', '沙箱执行', '环境反馈', '角色扮演', 'A2A 通信'],
    /* multimodal */ ['视觉编码器', 'CLIP 对比学习', '扩散模型', '视频生成', '语音识别', '语音合成', '图文对齐', 'OCR 理解', '具身感知', '世界模型', '3D 重建', '跨模态检索', '手势交互', '音乐生成'],
    /* theory */     ['反向传播', '梯度下降', '信息论', '贝叶斯推断', '流形假设', '泛化理论', '损失景观', '过参数化', '核方法', '因果推断', '博弈论', '最优传输', '压缩即智能', '免费午餐定理'],
    /* compute */    ['GPU 集群', 'TPU', '张量并行', '流水线并行', 'NVLink 互连', 'HBM 显存', '液冷数据中心', '推理芯片', 'FP8 训练', '算子融合', '编译优化', '存算一体', '光互连', '芯粒 Chiplet'],
    /* data */       ['网页爬取', '数据去重', '合成数据', '数据配比', '标注众包', '向量数据库', 'RAG 检索增强', '知识图谱', '数据飞轮', '清洗管线', '版权过滤', '多语言语料', '代码语料', '课程学习'],
    /* safety */     ['对齐税', '红队测试', '越狱攻击', '可解释性', '机制可解释', '宪法式 AI', '价值对齐', '幻觉抑制', '水印溯源', '评估基准', '安全护栏', '隐私计算', '模型审计', '灾难性风险'],
    /* app */        ['编程助手', '医疗诊断', '药物发现', '法律咨询', '金融风控', '教育辅导', '自动驾驶', '机器人', '游戏 NPC', '内容创作', '科学发现', '客服系统', '搜索引擎', '办公协同'],
  ];

  // -- 节点:每个领域 1 个枢纽 + 14 个概念 = 120 --
  const nodes = [];
  DOMAINS.forEach((d, di) => {
    nodes.push({ id: d.id, name: d.name, en: d.en, domain: di, hub: true });
    CONCEPTS[di].forEach((c, ci) => {
      nodes.push({ id: d.id + '-' + ci, name: c, domain: di, hub: false });
    });
  });
  const byId = Object.fromEntries(nodes.map((n, i) => (n.index = i, [n.id, n])));

  // -- 边 --
  const rand = mulberry32(20260714);
  const links = [];
  const seen = new Set();
  function addLink(a, b, w) {
    if (a === b) return;
    const key = a < b ? a + '|' + b : b + '|' + a;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source: a, target: b, weight: w || 1 });
  }

  DOMAINS.forEach((d, di) => {
    const ids = CONCEPTS[di].map((_, ci) => d.id + '-' + ci);
    ids.forEach(id => addLink(d.id, id, 2));                    // 枢纽辐射
    ids.forEach((id, i) => {                                    // 域内随机互联
      const n = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < n; k++) addLink(id, ids[Math.floor(rand() * ids.length)], 1);
    });
  });

  // 精选跨领域关联(让图谱有真实语义)
  [
    ['llm-3', 'safety-6'],   // RLHF ↔ 价值对齐
    ['llm-0', 'theory-0'],   // Transformer ↔ 反向传播
    ['llm-5', 'compute-0'],  // Scaling Laws ↔ GPU 集群
    ['llm-5', 'data-3'],     // Scaling Laws ↔ 数据配比
    ['llm-9', 'compute-7'],  // 模型量化 ↔ 推理芯片
    ['llm-11', 'compute-9'], // 推理加速 ↔ 算子融合
    ['agent-1', 'app-0'],    // 工具调用 ↔ 编程助手
    ['agent-5', 'llm-13'],   // MCP ↔ 指令跟随
    ['agent-6', 'data-12'],  // 代码智能体 ↔ 代码语料
    ['agent-4', 'theory-10'],// 多智能体 ↔ 博弈论
    ['multimodal-2', 'app-9'],  // 扩散模型 ↔ 内容创作
    ['multimodal-9', 'app-6'],  // 世界模型 ↔ 自动驾驶
    ['multimodal-8', 'app-7'],  // 具身感知 ↔ 机器人
    ['multimodal-1', 'data-5'], // CLIP ↔ 向量数据库
    ['theory-9', 'app-10'],  // 因果推断 ↔ 科学发现
    ['theory-12', 'llm-6'],  // 压缩即智能 ↔ 涌现能力
    ['data-6', 'app-12'],    // RAG ↔ 搜索引擎
    ['data-7', 'app-4'],     // 知识图谱 ↔ 金融风控
    ['data-2', 'safety-7'],  // 合成数据 ↔ 幻觉抑制
    ['safety-3', 'theory-6'],// 可解释性 ↔ 损失景观
    ['safety-1', 'agent-10'],// 红队测试 ↔ 沙箱执行
    ['safety-9', 'llm-13'],  // 评估基准 ↔ 指令跟随
    ['compute-8', 'theory-1'],  // FP8 ↔ 梯度下降
    ['compute-6', 'app-11'],    // 液冷数据中心 ↔ 客服系统(算力供给)
    ['app-1', 'safety-12'],  // 医疗诊断 ↔ 模型审计
    ['app-2', 'multimodal-10'], // 药物发现 ↔ 3D 重建
  ].forEach(([a, b]) => addLink(a, b, 1.5));

  // 少量随机跨域弱连接
  for (let k = 0; k < 22; k++) {
    const a = nodes[Math.floor(rand() * nodes.length)];
    const b = nodes[Math.floor(rand() * nodes.length)];
    if (a.domain !== b.domain && !a.hub && !b.hub) addLink(a.id, b.id, 0.6);
  }

  // 度数
  const degree = {};
  links.forEach(l => { degree[l.source] = (degree[l.source] || 0) + 1; degree[l.target] = (degree[l.target] || 0) + 1; });
  nodes.forEach(n => n.degree = degree[n.id] || 0);

  // -- 供边捆绑用的层次结构 --
  const hierarchy = {
    name: 'AI',
    children: DOMAINS.map((d, di) => ({
      name: d.name, id: d.id, domain: di,
      children: CONCEPTS[di].map((c, ci) => ({ name: c, id: d.id + '-' + ci, domain: di })),
    })),
  };

  return { DOMAINS, nodes, links, byId, hierarchy, mulberry32 };
})();
