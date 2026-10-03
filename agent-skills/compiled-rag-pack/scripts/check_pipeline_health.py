#!/usr/bin/env python3
"""增量管线健康判读（区分"优化空间"与"真故障"）。

编译式 RAG 自动化管线的核心判读规则：低 health_score 不一定是损坏，
**只看 embeddings 是否 100% 覆盖 + 0 stale**——100% 即检索功能正常，低分多来自
opt-in 未启用 / schema coverage 不满 / PGLite 跳过 Supabase 专属检查项（都是正常扣分）。
真正要警惕的是 embeddings coverage 跌破阈值（schema drift 信号）。

本脚本解析 `gbrain doctor --json` 的输出，做确定性断言，供 cron 巡检与部署后自测调用。

用法：
    gbrain doctor --json 2>/dev/null > doctor.json
    python3 check_pipeline_health.py doctor.json [--min-coverage 100] [--max-stale 0]
    python3 check_pipeline_health.py --selftest   # 内建红绿自检，验证判读逻辑还有效

退出码：0 = 检索健康（覆盖率达标且 stale 未超限）；1 = 覆盖率跌破阈值或输入不可解析（需介入）。
只用标准库；对缺字段、非 JSON、空文件都给出可读结论而非 traceback。
"""
import argparse
import json
import sys
import tempfile
from pathlib import Path

# doctor JSON 里 embedding 覆盖率可能出现在不同 schema 版本的这些键位下，逐一探测。
_COVERAGE_KEYS = ("embeddings", "embed", "embedding_coverage", "coverage")
_STALE_KEYS = ("stale", "stale_chunks", "chunks_stale")


def _dig(obj, keys):
    """在嵌套 dict 里按候选键找第一个命中的值（浅层广度优先）。"""
    if not isinstance(obj, dict):
        return None
    for k in keys:
        if k in obj:
            return obj[k]
    for v in obj.values():
        found = _dig(v, keys)
        if found is not None:
            return found
    return None


def _as_percent(value):
    """把覆盖率字段归一成 0-100 的百分数。

    支持三种常见形态：0.0-1.0 的比率、0-100 的百分数、{'done':N,'total':M} 计数对。
    无法解析返回 None（交由调用方判为不可校验）。
    """
    if isinstance(value, (int, float)):
        pct = float(value)
        return pct * 100.0 if pct <= 1.0 else pct
    if isinstance(value, dict):
        done = value.get("done", value.get("embedded", value.get("covered")))
        total = value.get("total", value.get("pages", value.get("chunks")))
        if isinstance(done, (int, float)) and isinstance(total, (int, float)) and total > 0:
            return 100.0 * float(done) / float(total)
    return None


def check_health(path: Path, min_coverage: float, max_stale: int) -> int:
    """判读一个 doctor.json，返回退出码（0 健康 / 1 覆盖率跌破阈值或不可解析），顺带打印结论。"""
    if not path.is_file():
        print(f"❌ 找不到 doctor 输出文件：{path}")
        return 1
    raw = path.read_text(encoding="utf-8", errors="ignore").strip()
    if not raw:
        print("❌ doctor 输出为空（确认用了 gbrain doctor --json 且 2>/dev/null 导走 phase 日志）")
        return 1
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"❌ doctor 输出不是纯 JSON（stderr 的 phase 日志会污染 jq/json 解析）：{e}")
        return 1

    coverage = _as_percent(_dig(data, _COVERAGE_KEYS))
    stale = _dig(data, _STALE_KEYS)
    health = _dig(data, ("health_score", "overall_health", "health"))

    if coverage is None:
        print("❌ 无法从 doctor 输出定位 embeddings 覆盖率字段——请核对 gbrain 版本的 --json schema")
        return 1

    print(f"embeddings 覆盖率：{coverage:.1f}%（阈值 {min_coverage:.0f}%）")
    if isinstance(stale, (int, float)):
        print(f"stale chunk：{int(stale)}（上限 {max_stale}）")
    if health is not None:
        print(f"health_score：{health}（低分不等于损坏——只要覆盖率达标即检索正常）")

    ok = coverage + 1e-9 >= min_coverage
    if isinstance(stale, (int, float)) and int(stale) > max_stale:
        ok = False
        print(f"⚠ stale chunk 超限：{int(stale)} > {max_stale}——链一次 gbrain embed --stale 补回填")

    if ok:
        print("\n结论：✅ 检索健康——覆盖率达标，低 health_score（若有）只是优化空间")
        return 0
    print("\n结论：❌ embeddings 覆盖率跌破阈值（schema drift 信号）——先跑 gbrain embed --stale 再排查连接器 frontmatter")
    return 1


def selftest() -> int:
    """红绿自检：构造必被判故障的红例与必判健康的绿例，验证判读逻辑仍有效。

    红例 = embeddings 覆盖率 92% 且有 3 条 stale 的 doctor.json（须 exit≠0）。
    绿例 = embeddings 100% + 0 stale（health_score 故意压低）的 doctor.json（须 exit=0）。
    """
    ok = True

    with tempfile.TemporaryDirectory() as d:
        red = Path(d) / "doctor.json"
        red.write_text(json.dumps({
            "health_score": 88,
            "embeddings": {"done": 92, "total": 100},
            "stale": 3,
        }), encoding="utf-8")
        print("---- 红例（覆盖率 92% + 3 stale）----")
        code = check_health(red, 100.0, 0)
        red_ok = code != 0
        print(f"[selftest] 红例 exit={code}（期望非 0）→ {'PASS' if red_ok else 'FAIL'}\n")
        ok = ok and red_ok

    with tempfile.TemporaryDirectory() as d:
        green = Path(d) / "doctor.json"
        green.write_text(json.dumps({
            "health_score": 71,
            "embeddings": {"done": 100, "total": 100},
            "stale": 0,
        }), encoding="utf-8")
        print("---- 绿例（覆盖率 100% + 0 stale，health_score 仅 71）----")
        code = check_health(green, 100.0, 0)
        green_ok = code == 0
        print(f"[selftest] 绿例 exit={code}（期望 0）→ {'PASS' if green_ok else 'FAIL'}\n")
        ok = ok and green_ok

    print("[selftest] 结论：" + ("✅ 红绿全对，判读逻辑有效" if ok else "❌ 自检未通过，判读逻辑已失效"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="增量管线健康判读：只认 embeddings 覆盖率")
    ap.add_argument("doctor_json", nargs="?", help="gbrain doctor --json 的输出文件（用 2>/dev/null 保证纯 JSON）")
    ap.add_argument("--min-coverage", type=float, default=100.0,
                    help="embeddings 覆盖率下限百分数（默认 100，检索正常的核心指标）")
    ap.add_argument("--max-stale", type=int, default=0,
                    help="允许的 stale chunk 上限（默认 0）")
    ap.add_argument("--selftest", action="store_true",
                    help="内建红绿自检（红例必判故障、绿例必判健康），不需要 doctor 文件")
    args = ap.parse_args()

    if args.selftest:
        return selftest()
    if not args.doctor_json:
        print(__doc__)
        return 1
    return check_health(Path(args.doctor_json), args.min_coverage, args.max_stale)


if __name__ == "__main__":
    sys.exit(main())
