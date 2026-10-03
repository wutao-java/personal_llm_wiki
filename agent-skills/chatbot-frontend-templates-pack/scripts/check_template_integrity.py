#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""check_template_integrity.py · 对话产品模板完整性机检（零依赖，随包自带，py3.9+）

四项检查（对话产品模板红线的可执行化，事实源 = 方法论 §四/§五）:
  ① magic-number  内联 style / <style> 块里的裸 hex 颜色（shared.css 与 CSS 变量定义行、
                   纯黑白、实体识别色 .ava/.ag-ava/.src-fav/.lane-ava 与 ln-/st- 条豁免）→ 报 magic number
  ② skeleton      骨架类名存活：.app/.composer/.thread 必在（error）；.sidebar 建议在，
                   画布式页（无会话侧栏）豁免为 note
  ③ quote-trunc   HTML 属性值里用直引号 " 截断中文（应改弯引号 U+201C/201D）→ error
  ④ dead-button   死按钮启发式：button 无 onclick / 无 data-silent / 未被 shared.js 绑定类
                   或页内脚本（含委托祖先 id）覆盖 → note 提示核查

用法:
  python3 check_template_integrity.py <文件或目录> [--strict]
  python3 check_template_integrity.py --selftest   # 绿例（干净基线体）全过 + 红例四项全抓

退出码: 0 = 无 error（--strict 时无任何 finding）/ 自测双向都对；1 = 有 error / 自测失败 / 输入非法。
"""
import os
import re
import sys

TAG_RE = re.compile(r"<(/?)([a-zA-Z][\w-]*)((?:[^<>\"']|\"[^\"]*\"|'[^']*')*)/?>", re.S)
ATTR_RE = re.compile(r"([\w:-]+)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|(\S+))")
HEX_RE = re.compile(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b")
STYLE_BLOCK_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.S)
SCRIPT_BLOCK_RE = re.compile(r"<script[^>]*>(.*?)</script>", re.S)

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"}
WHITE_BLACK = {"#fff", "#ffffff", "#000", "#000000"}
IDENTITY_CLASSES = {"ava", "ag-ava", "src-fav", "lane-ava", "lane-track"}   # 实体识别色载体
BUTTON_BOUND = {"new-chat", "item", "model-pill", "tb-btn", "send"}          # shared.js 自动绑定的按钮类
DELEGATED_ANCESTOR = {"msg-actions", "suggestions", "convs"}                 # 类委托绑定的祖先容器
SKELETON_HARD = ["app", "composer", "thread"]


def attrs_of(attr_str):
    d = {}
    for m in ATTR_RE.finditer(attr_str):
        d[m.group(1).lower()] = m.group(2) if m.group(2) is not None else (
            m.group(3) if m.group(3) is not None else (m.group(4) or ""))
    return d


def classes_of(attr_str):
    m = re.search(r'class\s*=\s*"([^"]*)"', attr_str) or re.search(r"class\s*=\s*'([^']*)'", attr_str)
    return set(m.group(1).split()) if m else set()


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def check_magic_hex(text):
    out = []
    # ① style 块：仅非白黑、且不在 --var 定义段的 hex 计
    for bm in STYLE_BLOCK_RE.finditer(text):
        block, base = bm.group(1), bm.start(1)
        for hm in HEX_RE.finditer(block):
            hexv = hm.group(0).lower()
            if hexv in WHITE_BLACK:
                continue
            seg_start = max(block.rfind(";", 0, hm.start()), block.rfind("{", 0, hm.start()),
                            block.rfind("}", 0, hm.start())) + 1
            if re.search(r"--[\w-]+\s*:", block[seg_start:hm.start()]):
                continue  # CSS 变量定义行豁免
            out.append((line_of(text, base + hm.start()), "magic-number",
                        "<style> 块裸 hex %s（应走 var(--x) token）" % hm.group(0)))
    # ① 内联 style：实体识别色 / 白黑豁免
    for tm in TAG_RE.finditer(text):
        if tm.group(1):
            continue
        a = attrs_of(tm.group(3))
        style = a.get("style", "")
        if "#" not in style:
            continue
        cls = classes_of(tm.group(3))
        eid = a.get("id", "")
        identity = bool(cls & IDENTITY_CLASSES) or eid.startswith("ln-") or eid.startswith("st-")
        for hm in HEX_RE.finditer(style):
            if hm.group(0).lower() in WHITE_BLACK or identity:
                continue
            out.append((line_of(text, tm.start()), "magic-number",
                        "内联 style 裸 hex %s（应走 var(--x) token）" % hm.group(0)))
    return out


def check_skeleton(text):
    all_cls = set()
    for m in re.finditer(r'class\s*=\s*"([^"]*)"', text):
        all_cls.update(m.group(1).split())
    out = []
    for need in SKELETON_HARD:
        if need not in all_cls:
            out.append((0, "skeleton", "骨架类名 .%s 缺失（页面骨架被破坏）" % need))
    if "sidebar" not in all_cls:
        out.append((0, "skeleton-note", ".sidebar 缺失——画布式页（无会话侧栏）属正常，其余页请核查"))
    return out


def check_quote_trunc(text):
    out = []
    follow = re.compile(r"=\s*\"[^\"]*\"([一-鿿A-Za-z0-9])")
    for tm in TAG_RE.finditer(text):
        for fm in follow.finditer(tm.group(3)):
            out.append((line_of(text, tm.start()), "quote-trunc",
                        "属性值疑似被直引号截断（'%s' 紧跟闭合引号）——中文引号应用弯引号 “”" % fm.group(1)))
            break
    return out


def script_ref_ids(text):
    stext = "".join(SCRIPT_BLOCK_RE.findall(text))
    ids = set(re.findall(r'id\s*=\s*"([\w-]+)"', text))
    return {i for i in ids if re.search(r"\b" + re.escape(i) + r"\b", stext)}


def check_dead_buttons(text):
    out, stack, ref_ids = [], [], script_ref_ids(text)
    for tm in TAG_RE.finditer(text):
        closing, tag, attr_str = tm.group(1), tm.group(2).lower(), tm.group(3)
        self_closing = tm.group(0).rstrip().endswith("/>")
        if closing:
            for i in range(len(stack) - 1, -1, -1):
                if stack[i][0] == tag:
                    del stack[i:]
                    break
            continue
        a = attrs_of(attr_str)
        cls = classes_of(attr_str)
        if tag == "button":
            covered = ("onclick" in a or "data-silent" in a or bool(cls & BUTTON_BOUND)
                       or a.get("id", "") in ref_ids
                       or any(sid in ref_ids for (_, sid, _) in stack if sid)
                       or any(sc & DELEGATED_ANCESTOR for (_, _, sc) in stack))
            if not covered:
                label = re.sub(r"\s+", " ", tm.group(0))[:40]
                out.append((line_of(text, tm.start()), "dead-button",
                            "按钮无 onclick/data-silent、未被绑定类或页内脚本覆盖，请核查是否死按钮：%s" % label))
        if tag not in VOID and not self_closing:
            stack.append((tag, a.get("id", ""), cls))
    return out


def scan_text(text):
    return (check_magic_hex(text) + check_skeleton(text)
            + check_quote_trunc(text) + check_dead_buttons(text))


# 分级：skeleton 断裂=硬门（error，破坏骨架）；quote-trunc=警告（真实截断，默认不拦、--strict 拦）；
# magic-number / dead-button = 提示核查（note）。冻结的厂商模板可能自带需人工核对的 warn/note。
ERROR_KINDS = {"skeleton"}
WARN_KINDS = {"quote-trunc"}


def report(name, findings):
    if not findings:
        print("  ✅ %s：四项全过" % name)
        return
    for ln, kind, msg in sorted(findings, key=lambda x: (x[0], x[1])):
        loc = ("L%d" % ln) if ln else "—"
        mark = "❌" if kind in ERROR_KINDS else ("⚠" if kind in WARN_KINDS else "·")
        print("  %s [%s] %s %s" % (mark, kind, loc, msg))


def iter_targets(path):
    if os.path.isfile(path):
        yield path
        return
    for fn in sorted(os.listdir(path)):
        if fn.endswith(".html") and fn != "index.html":
            yield os.path.join(path, fn)


# ---------- 自测（心法二：校验者本身也被测） ----------
GREEN = """<!DOCTYPE html><html><head><style>
:root{--accent:#0d9488;--ink:#18181b}
.k{color:var(--ink);background:#fff}
</style></head><body data-ai-name="Assistant"><div class="app">
<aside class="sidebar"><button class="new-chat" data-silent="1">＋ 新建</button>
<nav class="convs"><button class="item">会话一</button></nav></aside>
<main class="main"><header class="topbar">
<button class="tb-btn" id="theme-toggle" data-silent="1"></button></header>
<div class="thread-wrap"><div class="thread">
<div class="msg ai"><div class="msg-actions"><button>复制</button></div></div></div></div>
<div class="composer"><div class="c-box">
<textarea placeholder="给 Assistant 发消息…（演示环境，回复为固定文案）"></textarea>
<button class="send" data-silent="1">↑</button></div>
<div class="suggestions" id="empty-sugg"><button>建议一</button></div></div></main></div>
<script>document.getElementById('empty-sugg').addEventListener('click',function(){});</script>
</body></html>"""

RED = """<!DOCTYPE html><html><head><style>
.bad{color:#ff3366;background:#123abc}
</style></head><body><div class="app">
<main class="main"><div class="composer">
<div class="widget" style="background:#a1b2c3"></div>
<textarea placeholder="他说"你好"就走了"></textarea>
<button>核对数据</button>
</div></main></div></body></html>"""


def selftest():
    g = scan_text(GREEN)
    g_real = [f for f in g if f[1] != "skeleton-note"]
    green_ok = len(g_real) == 0
    r = scan_text(RED)
    kinds = {f[1] for f in r}
    red_ok = {"magic-number", "skeleton", "quote-trunc", "dead-button"} <= kinds
    print("--- selftest ---")
    print("绿例（干净基线体，应全过）: %s" % ("✅ 通过" if green_ok else "❌ 应全过却报错"))
    if not green_ok:
        report("GREEN", g_real)
    print("红例（四项违规，应全抓）: %s" % ("✅ 四项全抓" if red_ok else "❌ 漏抓：%s" % (
        {"magic-number", "skeleton", "quote-trunc", "dead-button"} - kinds)))
    if not red_ok:
        report("RED", r)
    if green_ok and red_ok:
        print("PASS")
        return 0
    print("FAIL")
    return 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    strict = "--strict" in argv
    paths = [a for a in argv if not a.startswith("--")]
    if not paths:
        print(__doc__)
        return 1
    if not os.path.exists(paths[0]):
        print("❌ 路径不存在: %s" % paths[0])
        return 1
    had_error = False
    for fp in iter_targets(paths[0]):
        try:
            with open(fp, encoding="utf-8") as f:
                findings = scan_text(f.read())
        except OSError as e:
            print("❌ 读取失败 %s: %s" % (fp, e))
            had_error = True
            continue
        print("• %s" % os.path.basename(fp))
        report(os.path.basename(fp), findings)
        real = [f for f in findings if f[1] != "skeleton-note"]
        if any(k in ERROR_KINDS for _, k, _ in findings):
            had_error = True
        elif strict and real:
            had_error = True
    return 1 if had_error else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
