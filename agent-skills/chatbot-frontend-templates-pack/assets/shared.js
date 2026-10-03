/* Chat Templates · 共享交互层:主题切换 / composer 发送 / 流式打字模拟 */
(function () {
  'use strict';

  /* ---------- 主题 ---------- */
  const root = document.documentElement;
  const saved = localStorage.getItem('ct-theme');
  const prefers = matchMedia('(prefers-color-scheme: dark)').matches;
  let dark = saved ? saved === 'dark' : prefers;
  applyTheme();
  function applyTheme() {
    root.dataset.theme = dark ? 'dark' : 'light';
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = dark ? '☀️ 浅色' : '🌙 深色';
  }
  window.CT = window.CT || {};
  CT.bindTheme = function () {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      dark = !dark;
      localStorage.setItem('ct-theme', dark ? 'dark' : 'light');
      applyTheme();
    });
    applyTheme();
  };

  /* ---------- toast ---------- */
  let toastEl, toastTimer;
  CT.toast = function (text) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  };

  /* ---------- 流式打字:把 html 逐块注入 target ---------- */
  CT.stream = function (target, html, opts) {
    opts = opts || {};
    const speed = opts.cps || 55;                    // 每秒字符数
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const full = tmp.textContent.length;
    let shown = 0, t0 = null, done = false;
    const caret = document.createElement('span');
    caret.className = 'caret';
    function clip(node, budget) {
      // 深拷贝 node,文本累计裁剪到 budget 字符
      const out = node.cloneNode(false);
      for (const child of node.childNodes) {
        if (budget.n <= 0) break;
        if (child.nodeType === 3) {
          const take = child.textContent.slice(0, budget.n);
          budget.n -= take.length;
          out.appendChild(document.createTextNode(take));
        } else {
          out.appendChild(clip(child, budget));
        }
      }
      return out;
    }
    return new Promise(resolve => {
      function frame(now) {
        if (!t0) t0 = now;
        shown = Math.min(full, Math.floor((now - t0) / 1000 * speed));
        const budget = { n: shown };
        target.innerHTML = '';
        for (const child of tmp.childNodes) {
          if (budget.n <= 0) break;
          target.appendChild(clip(child, budget));
        }
        if (shown < full) {
          target.appendChild(caret);
          if (opts.follow !== false) { const w = target.closest('.thread-wrap'); if (w) w.scrollTop = w.scrollHeight; }
          requestAnimationFrame(frame);
        } else if (!done) {
          done = true;
          target.innerHTML = html;
          if (opts.follow !== false) { const w = target.closest('.thread-wrap'); if (w) w.scrollTop = w.scrollHeight; }
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  };

  /* ---------- 消息 DOM 工厂 ---------- */
  CT.userMsg = function (text) {
    const el = document.createElement('div');
    el.className = 'msg user';
    el.innerHTML = '<div class="ava">你</div><div class="body"><div class="who">你 <span class="t">' + now() + '</span></div><div class="prose"></div></div>';
    el.querySelector('.prose').textContent = text;
    return el;
  };
  CT.aiMsg = function (name) {
    const el = document.createElement('div');
    el.className = 'msg ai';
    el.innerHTML = '<div class="ava">AI</div><div class="body"><div class="who">' + (name || 'Assistant') + ' <span class="t">' + now() + '</span></div><div class="prose"></div></div>';
    return el;
  };
  function now() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ---------- composer:Enter 发送,回复走页面注册的 CT.demoReply ---------- */
  CT.bindComposer = function () {
    const ta = document.querySelector('.c-box textarea');
    const send = document.querySelector('.c-box .send');
    const thread = document.querySelector('.thread');
    if (!ta || !send || !thread) return;
    function submit() {
      const text = ta.value.trim();
      if (!text) return;
      ta.value = ''; autosize();
      thread.appendChild(CT.userMsg(text));
      const ai = CT.aiMsg(document.body.dataset.aiName || 'Assistant');
      thread.appendChild(ai);
      const wrap = document.querySelector('.thread-wrap');
      if (wrap) wrap.scrollTop = wrap.scrollHeight;
      const html = (window.CT.demoReply && CT.demoReply(text)) ||
        '<p>这是<strong>演示环境</strong>:布局与交互都是真的,模型是假的。把这一层换成你的后端 SSE 接口,流式渲染逻辑可以直接复用。</p>';
      CT.stream(ai.querySelector('.prose'), html);
    }
    send.addEventListener('click', submit);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    });
    function autosize() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; }
    ta.addEventListener('input', autosize);
  };

  /* ---------- 通用初始化 ---------- */
  CT.init = function () {
    CT.bindTheme();
    CT.bindComposer();
    document.querySelectorAll('.msg-actions button, .new-chat, .convs .item, .model-pill, .tb-btn:not(#theme-toggle)').forEach(b => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', e => {
        if (b.closest('a')) return;
        if (b.dataset.silent) return;
        const label = (b.textContent || '').trim().slice(0, 12);
        CT.toast(label + ' · 演示环境,此处接你的真实逻辑');
      });
    });
  };
})();
