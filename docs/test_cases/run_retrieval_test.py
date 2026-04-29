#!/usr/bin/env python3
"""
Bot A / Bot B 检索准确性自动化测试脚本

使用方法:
    python3 run_retrieval_test.py --bot a --top-k 5
    python3 run_retrieval_test.py --bot b --top-k 5
    python3 run_retrieval_test.py --bot a --test-id A01 --test-id A02

依赖:
    pip install httpx qdrant-client
"""

import argparse
import json
import sys
import os
from datetime import datetime
from pathlib import Path

# 向量生成
def embed_text(text: str, model: str = "bge-m3") -> list[float]:
    """使用 Ollama 生成文本向量"""
    import httpx
    response = httpx.post(
        "http://localhost:11434/api/embeddings",
        json={"model": model, "prompt": text},
        timeout=60.0
    )
    response.raise_for_status()
    return response.json()["embedding"]


def search_qdrant(
    collection: str,
    query_vector: list[float],
    top_k: int = 5
) -> list[dict]:
    """查询 Qdrant 向量数据库"""
    import httpx
    response = httpx.post(
        "http://localhost:6333/collections/{}/points/search".format(collection),
        json={
            "vector": query_vector,
            "limit": top_k,
            "with_payload": True
        },
        timeout=30.0
    )
    response.raise_for_status()
    return response.json()["result"]


def load_test_cases(bot: str) -> list[dict]:
    """加载测试用例"""
    if bot.lower() == "a":
        file_path = Path(__file__).parent / "bot_a_retrieval_test_v2.md"
    else:
        file_path = Path(__file__).parent / "bot_b_retrieval_test_v2.md"

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 解析 Markdown 表格中的测试用例
    cases = []
    lines = content.split("\n")
    for line in lines:
        # 匹配 | B01 | 问题 | ...
        if " | " in line and line.strip().startswith("|"):
            parts = [p.strip() for p in line.split("|")]
            # 跳过表头和分隔符
            if len(parts) >= 3 and parts[1] and parts[1][0].isalnum():
                case_id = parts[1]
                if case_id[0] in "AB" and case_id[1:].isdigit():
                    question = parts[2]
                    cases.append({
                        "id": case_id,
                        "question": question,
                        "expected": parts[3] if len(parts) > 3 else ""
                    })
    return cases


def run_single_test(
    case: dict,
    collection: str,
    top_k: int
) -> dict:
    """执行单个测试用例"""
    print(f"  Testing {case['id']}: {case['question'][:50]}...")

    try:
        # 生成向量
        vector = embed_text(case["question"])

        # 检索
        results = search_qdrant(collection, vector, top_k)

        # 构建结果
        top_results = []
        for i, r in enumerate(results):
            top_results.append({
                "rank": i + 1,
                "score": r["score"],
                "title": r["payload"].get("title", ""),
                "content_preview": r["payload"].get("content", "")[:100]
            })

        # 判断等级
        if results and results[0]["score"] >= 0.7:
            grade = "PASS"
        elif results and results[0]["score"] >= 0.5:
            grade = "PARTIAL"
        else:
            grade = "FAIL"

        return {
            "id": case["id"],
            "question": case["question"],
            "expected": case["expected"],
            "grade": grade,
            "top_results": top_results,
            "error": None
        }
    except Exception as e:
        return {
            "id": case["id"],
            "question": case["question"],
            "expected": case["expected"],
            "grade": "ERROR",
            "top_results": [],
            "error": str(e)
        }


def run_tests(bot: str, top_k: int, test_ids: list = None):
    """运行所有测试"""
    # 配置
    collections = {
        "a": "bot_a_knowledge",
        "b": "bot_b_knowledge"
    }
    collection = collections.get(bot.lower())
    if not collection:
        print(f"Error: Unknown bot '{bot}'. Use 'a' or 'b'.")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"Bot {bot.upper()} 检索准确性测试")
    print(f"Collection: {collection}")
    print(f"Top-K: {top_k}")
    print(f"{'='*60}\n")

    # 加载测试用例
    cases = load_test_cases(bot)
    if test_ids:
        cases = [c for c in cases if c["id"] in test_ids]

    print(f"Loaded {len(cases)} test cases\n")

    # 执行测试
    results = []
    for case in cases:
        result = run_single_test(case, collection, top_k)
        results.append(result)
        print(f"    -> {result['grade']} (score: {result['top_results'][0]['score'] if result['top_results'] else 'N/A'})")

    # 统计
    stats = {"PASS": 0, "PARTIAL": 0, "FAIL": 0, "ERROR": 0}
    for r in results:
        stats[r["grade"]] = stats.get(r["grade"], 0) + 1

    total = len(results)
    pass_rate = (stats["PASS"] / total * 100) if total > 0 else 0

    print(f"\n{'='*60}")
    print(f"测试结果统计")
    print(f"{'='*60}")
    print(f"总用例数: {total}")
    print(f"PASS: {stats['PASS']} ({stats['PASS']/total*100:.1f}%)")
    print(f"PARTIAL: {stats['PARTIAL']} ({stats['PARTIAL']/total*100:.1f}%)")
    print(f"FAIL: {stats['FAIL']} ({stats['FAIL']/total*100:.1f}%)")
    if stats["ERROR"] > 0:
        print(f"ERROR: {stats['ERROR']}")
    print(f"通过率: {pass_rate:.1f}%")

    # 失败用例详情
    failed = [r for r in results if r["grade"] in ("FAIL", "ERROR")]
    if failed:
        print(f"\n{'='*60}")
        print(f"需要调优的用例 ({len(failed)}条)")
        print(f"{'='*60}")
        for r in failed:
            print(f"\n{r['id']}: {r['question']}")
            if r["error"]:
                print(f"  ERROR: {r['error']}")
            else:
                print(f"  Top1 score: {r['top_results'][0]['score'] if r['top_results'] else 'N/A'}")

    # 保存结果
    output_file = Path(__file__).parent / f"test_results_bot_{bot}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "bot": bot,
            "collection": collection,
            "top_k": top_k,
            "timestamp": datetime.now().isoformat(),
            "stats": stats,
            "pass_rate": pass_rate,
            "results": results
        }, f, ensure_ascii=False, indent=2)
    print(f"\n结果已保存: {output_file}")

    return results, stats


def main():
    parser = argparse.ArgumentParser(description="Bot A/B 检索准确性测试")
    parser.add_argument("--bot", "-b", required=True, choices=["a", "b", "A", "B"],
                        help="选择测试的Bot (a 或 b)")
    parser.add_argument("--top-k", "-k", type=int, default=5,
                        help="返回 Top-K 结果 (默认: 5)")
    parser.add_argument("--test-id", "-t", action="append",
                        help="指定测试用例ID (可多次使用)")
    args = parser.parse_args()

    run_tests(args.bot.lower(), args.top_k, args.test_id)


if __name__ == "__main__":
    main()
