#!/usr/bin/env python3
"""团队大脑多租户隔离机械核验（leak = FAIL）。

隔离取证的核验规则：某凭证的每一条检索命中结果，其 source_id 必属该凭证被授权的
federated_read 集合；任一条越界即判泄漏（FAIL）。这是 SQL 层强制过滤的**结果核验**——
不靠肉眼"看起来对"，也不依赖大模型自觉过滤。

输入是一次检索的结果 JSON（来自 MCP HTTP API，带 source_id 字段），可以是：
  - 顶层 list：[{"source_id": "...", ...}, ...]
  - 含结果数组的 dict：{"results": [...]} / {"hits": [...]} / {"pages": [...]}

用法：
    python3 verify_source_isolation.py <results.json> --authorized customers,shared \\
        [--source-field source_id]
    python3 verify_source_isolation.py --selftest   # 内建红绿自检，验证核验逻辑还有效

退出码：0 = 零泄漏（所有命中都在授权集内）；1 = 检出越权 source_id 或输入不可解析。
只用标准库。授权集为空视为配置错误（无授权却有命中 = 全部泄漏）。
"""
import argparse
import json
import sys
import tempfile
from pathlib import Path

_RESULT_KEYS = ("results", "hits", "pages", "items", "matches", "data")


def _extract_results(data):
    """从多种响应形态里取出结果数组。返回 list 或 None。"""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for k in _RESULT_KEYS:
            v = data.get(k)
            if isinstance(v, list):
                return v
    return None


def check_isolation(path: Path, authorized: set, source_field: str) -> int:
    """核验一次检索结果的 source_id 是否全在授权集内，返回退出码（0 零泄漏 / 1 泄漏或不可解析）。"""
    if not authorized:
        print("❌ 授权集为空——无授权却做检索，任何命中都算泄漏，请传 --authorized")
        return 1

    if not path.is_file():
        print(f"❌ 找不到结果文件：{path}")
        return 1
    raw = path.read_text(encoding="utf-8", errors="ignore").strip()
    if not raw:
        print("❌ 结果文件为空（MCP HTTP 若返回 SSE，需先取 'data: ' 偏移后的 JSON 再喂本脚本）")
        return 1
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"❌ 结果不是纯 JSON（MCP HTTP 的 SSE 响应含 'data:' 前缀与控制字符，先剥离）：{e}")
        return 1

    results = _extract_results(data)
    if results is None:
        print(f"❌ 无法从响应定位结果数组（尝试过键：{', '.join(_RESULT_KEYS)}）")
        return 1

    leaks = []
    missing_field = 0
    for i, item in enumerate(results):
        if not isinstance(item, dict) or source_field not in item:
            missing_field += 1
            continue
        sid = item[source_field]
        if sid not in authorized:
            leaks.append((i, sid))

    print(f"授权集 federated_read = {{{', '.join(sorted(authorized))}}}")
    print(f"核验命中条数：{len(results)}（缺 {source_field} 字段：{missing_field}）")

    if missing_field == len(results) and results:
        print(f"❌ 所有条目都没有 {source_field} 字段——无法核验来源，确认 MCP 返回含 source_id")
        return 1

    if leaks:
        print(f"❌ 检出 {len(leaks)} 条越权命中（leak = FAIL）：")
        for idx, sid in leaks:
            print(f"    第 {idx} 条 source_id={sid} 不在授权集内")
        print("\n结论：❌ 隔离泄漏——检查该客户端 --federated-read 与 source 切分，隔离必须在 SQL 层强制")
        return 1

    print("\n结论：✅ 零泄漏——所有命中 source_id 都在该凭证授权集内")
    return 0


def selftest() -> int:
    """红绿自检：构造必判泄漏的红例与必判零泄漏的绿例，验证核验逻辑仍有效。

    授权集固定为 {customers, shared}。
    红例 = 命中里混入越权 source_id=internal（须 exit≠0）。
    绿例 = 命中全部落在授权集内（须 exit=0）。
    """
    authorized = {"customers", "shared"}
    ok = True

    with tempfile.TemporaryDirectory() as d:
        red = Path(d) / "results.json"
        red.write_text(json.dumps({"results": [
            {"source_id": "customers", "text": "订单概况"},
            {"source_id": "internal", "text": "内部薪资表"},  # 越权，红线
            {"source_id": "shared", "text": "公司政策"},
        ]}), encoding="utf-8")
        print("---- 红例（命中混入越权 source_id=internal）----")
        code = check_isolation(red, authorized, "source_id")
        red_ok = code != 0
        print(f"[selftest] 红例 exit={code}（期望非 0）→ {'PASS' if red_ok else 'FAIL'}\n")
        ok = ok and red_ok

    with tempfile.TemporaryDirectory() as d:
        green = Path(d) / "results.json"
        green.write_text(json.dumps({"results": [
            {"source_id": "customers", "text": "订单概况"},
            {"source_id": "shared", "text": "公司政策"},
        ]}), encoding="utf-8")
        print("---- 绿例（命中全部在授权集内）----")
        code = check_isolation(green, authorized, "source_id")
        green_ok = code == 0
        print(f"[selftest] 绿例 exit={code}（期望 0）→ {'PASS' if green_ok else 'FAIL'}\n")
        ok = ok and green_ok

    print("[selftest] 结论：" + ("✅ 红绿全对，核验逻辑有效" if ok else "❌ 自检未通过，核验逻辑已失效"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="多租户隔离核验：命中 source_id 必属授权集，越界即 FAIL")
    ap.add_argument("results_json", nargs="?", help="一次检索的结果 JSON（MCP HTTP API 输出，含 source_id）")
    ap.add_argument("--authorized",
                    help="该凭证 federated_read 授权的 source，逗号分隔，如 customers,shared")
    ap.add_argument("--source-field", default="source_id",
                    help="结果条目里表示来源的字段名（默认 source_id）")
    ap.add_argument("--selftest", action="store_true",
                    help="内建红绿自检（红例必判泄漏、绿例必判零泄漏），不需要结果文件")
    args = ap.parse_args()

    if args.selftest:
        return selftest()
    if not args.results_json:
        print("❌ 需要结果文件路径，或用 --selftest 跑内建自检")
        return 1
    if args.authorized is None:
        print("❌ 缺 --authorized（该凭证 federated_read 授权的 source，逗号分隔）")
        return 1
    authorized = {s.strip() for s in args.authorized.split(",") if s.strip()}
    return check_isolation(Path(args.results_json), authorized, args.source_field)


if __name__ == "__main__":
    sys.exit(main())
