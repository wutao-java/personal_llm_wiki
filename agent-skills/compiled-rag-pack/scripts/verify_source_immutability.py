#!/usr/bin/env python3
"""编译式 RAG 源不可变自检（完成后必过）。

对一个 wiki 项目目录做三项确定性校验：
  1) 源层不可变：源目录相对某个 git 基线零改动（编译/查询绝不改源）。
  2) 源层零新增：源目录内无未跟踪的新文件——git diff 对未跟踪文件是盲的，
     编译产物（含实体存根页）误落源层时只有这条能抓到（红线"一件不增"）。
  3) wikilink 前缀齐全：语料里的 [[...]] 全部带目录前缀，无裸 slug（裸 slug 会静默少边）。

用法：
    python3 verify_source_immutability.py <project-dir> [--source-dir raw] \
        [--corpus-dir .] [--baseline HEAD]
    python3 verify_source_immutability.py --selftest   # 内建红绿自检（临时 git 仓库夹具）

退出码：0 = 全过（允许前缀 warning）；1 = 源被改动或目录非法（硬失败）。
不假设已安装额外依赖，只用标准库 + 本机 git。
"""
import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

# wikilink 语法：[[目录/slug]]。带 '/' 视为带目录前缀；裸 slug（无 '/'）在 db 抽边模式建 0 边。
WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


def git_diff_source(project: Path, source_dir: str, baseline: str) -> tuple[str, str]:
    """对比源层与基线。

    返回 (status, detail)：
      status="clean" 零改动 / status="dirty" 有 diff / status="error" git 环境或基线不可用。
    调用方据此区分"源被改动"（dirty，红线破坏）与"无法校验"（error，环境问题）。
    """
    try:
        proc = subprocess.run(
            ["git", "diff", "--stat", baseline, "--", source_dir],
            cwd=str(project), capture_output=True, text=True,
        )
    except FileNotFoundError:
        return "error", "未找到 git（本校验依赖本机 git 对比源层基线）"
    if proc.returncode != 0:
        return "error", (proc.stderr.strip() or f"git diff 失败（基线 {baseline} 是否存在？该目录是否已 git init 并提交基线？）")
    diff = proc.stdout.strip()
    return ("clean" if diff == "" else "dirty"), diff


def git_untracked_source(project: Path, source_dir: str) -> tuple[str, str]:
    """列出源层内未跟踪的新文件（git diff 看不见它们）。

    返回 (status, detail)：status="clean" 零新增 / "dirty" 有新增 / "error" git 不可用。
    """
    try:
        proc = subprocess.run(
            ["git", "ls-files", "--others", "--exclude-standard", "--", source_dir],
            cwd=str(project), capture_output=True, text=True,
        )
    except FileNotFoundError:
        return "error", "未找到 git"
    if proc.returncode != 0:
        return "error", proc.stderr.strip() or "git ls-files 失败"
    files = [f for f in proc.stdout.strip().splitlines() if not Path(f).name.startswith("._")]
    return ("clean" if not files else "dirty"), "\n".join(files)


def scan_bare_wikilinks(corpus: Path) -> list[tuple[Path, str]]:
    """扫描语料内所有 .md，收集无目录前缀的裸 wikilink。"""
    bare: list[tuple[Path, str]] = []
    for md in sorted(corpus.rglob("*.md")):
        if md.name.startswith("._"):
            continue
        for target in WIKILINK_RE.findall(md.read_text(encoding="utf-8", errors="ignore")):
            slug = target.split("|", 1)[0].strip()  # 去掉可选的 [[slug|显示名]] 别名
            if "/" not in slug:
                bare.append((md, slug))
    return bare


def verify_immutability(project: Path, source_dir: str, corpus_dir: str, baseline: str) -> int:
    """对一个 wiki 项目跑三项校验，返回退出码（0 全过 / 1 硬失败），顺带打印结论。"""
    if not project.is_dir():
        print(f"❌ 项目目录不存在：{project}")
        return 1

    source_path = project / source_dir
    hard_fail = False

    # 校验一：源不可变
    if not source_path.is_dir():
        print(f"⚠ 源层目录不存在，跳过不可变校验：{source_dir}/（用 --source-dir 指定）")
    else:
        status, detail = git_diff_source(project, source_dir, baseline)
        if status == "clean":
            print(f"✓ 源不可变：{source_dir}/ 相对基线 {baseline} 零改动")
        elif status == "dirty":
            hard_fail = True
            print(f"❌ 源被改动：{source_dir}/ 相对基线 {baseline} 存在 diff——编译/查询不得改源，请回滚")
            print("  ---- git diff --stat ----")
            for line in detail.splitlines():
                print("  " + line)
        else:  # error：环境/基线不可用，无法校验，按硬失败拦截但不误判为"源被改动"
            hard_fail = True
            print(f"❌ 无法校验源不可变：{detail}")

        # 校验二：源层零新增（git diff 抓不到未跟踪文件，必须单独查）
        u_status, u_detail = git_untracked_source(project, source_dir)
        if u_status == "clean":
            print(f"✓ 源层零新增：{source_dir}/ 无未跟踪新文件")
        elif u_status == "dirty":
            hard_fail = True
            print(f"❌ 源层被塞入新文件（红线'一件不增'）——编译产物只许落 wiki/，请移走或删除：")
            for line in u_detail.splitlines():
                print("    " + line)
        else:
            hard_fail = True
            print(f"❌ 无法校验源层新增：{u_detail}")

    # 校验三：wikilink 前缀
    corpus = (project / corpus_dir).resolve()
    bare = scan_bare_wikilinks(corpus) if corpus.is_dir() else []
    if bare:
        print(f"⚠ 发现 {len(bare)} 处裸 wikilink（无目录前缀，db 抽边模式会静默少边）：")
        for md, slug in bare:
            print(f"    {md.relative_to(project)}: [[{slug}]] → 应写成 [[<目录>/{slug}]]")
    else:
        print("✓ wikilink 前缀：未发现裸 slug，抽边不会静默少边")

    if hard_fail:
        print("\n结论：❌ 源不可变红线被破坏，先修复再交付")
        return 1
    print("\n结论：✅ 源不可变自检通过" + ("（存在前缀 warning，建议补全）" if bare else ""))
    return 0


def _git(repo: Path, *args) -> subprocess.CompletedProcess:
    """在夹具仓库里跑 git，注入独立身份，避免依赖机器全局 git 配置。"""
    return subprocess.run(
        ["git", "-c", "user.email=selftest@local", "-c", "user.name=selftest", *args],
        cwd=str(repo), capture_output=True, text=True,
    )


def selftest() -> int:
    """红绿自检：用临时 git 仓库夹具，验证源不可变判定仍有效。

    夹具 = git init 后提交 raw/doc.md（源层基线）+ wiki/index.md（带前缀 wikilink）。
    绿例 = 提交后原样校验，源层零改动零新增（须 exit=0）。
    红例 = 之后改写 raw/doc.md 内容，源相对基线出现 diff（须 exit≠0）。
    """
    if subprocess.run(["git", "--version"], capture_output=True).returncode != 0:
        print("[selftest] ❌ 本机无 git，无法跑源不可变自检")
        return 1

    ok = True
    with tempfile.TemporaryDirectory() as d:
        repo = Path(d)
        (repo / "raw").mkdir()
        (repo / "wiki").mkdir()
        (repo / "raw" / "doc.md").write_text("原始资料，源层不可变。\n", encoding="utf-8")
        (repo / "wiki" / "index.md").write_text("编译页，见 [[wiki/doc]]。\n", encoding="utf-8")
        _git(repo, "init", "-q")
        _git(repo, "add", "-A")
        _git(repo, "commit", "-q", "-m", "baseline")

        print("---- 绿例（源层相对基线零改动零新增）----")
        code = verify_immutability(repo, "raw", ".", "HEAD")
        green_ok = code == 0
        print(f"[selftest] 绿例 exit={code}（期望 0）→ {'PASS' if green_ok else 'FAIL'}\n")
        ok = ok and green_ok

        # 破坏源层：改写已提交的源文件，制造 diff
        (repo / "raw" / "doc.md").write_text("原始资料被编译流程篡改了。\n", encoding="utf-8")
        print("---- 红例（源文件 raw/doc.md 被改写）----")
        code = verify_immutability(repo, "raw", ".", "HEAD")
        red_ok = code != 0
        print(f"[selftest] 红例 exit={code}（期望非 0）→ {'PASS' if red_ok else 'FAIL'}\n")
        ok = ok and red_ok

    print("[selftest] 结论：" + ("✅ 红绿全对，判定逻辑有效" if ok else "❌ 自检未通过，判定逻辑已失效"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="编译式 RAG 源不可变 + wikilink 前缀自检")
    ap.add_argument("project", nargs="?", help="wiki 项目目录（含源层与语料）")
    ap.add_argument("--source-dir", default="raw", help="源层子目录（默认 raw），相对 project")
    ap.add_argument("--corpus-dir", default=".", help="扫描 wikilink 的语料子目录（默认整个项目）")
    ap.add_argument("--baseline", default="HEAD", help="源不可变对比的 git 基线（默认 HEAD）")
    ap.add_argument("--selftest", action="store_true",
                    help="内建红绿自检（临时 git 仓库夹具，绿例零改动、红例改源），不需要项目目录")
    args = ap.parse_args()

    if args.selftest:
        return selftest()
    if not args.project:
        print(__doc__)
        return 1
    return verify_immutability(Path(args.project).resolve(), args.source_dir, args.corpus_dir, args.baseline)


if __name__ == "__main__":
    sys.exit(main())
