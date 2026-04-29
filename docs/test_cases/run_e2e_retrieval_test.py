#!/usr/bin/env python3
"""
Bot A / Bot B 端到端检索准确性测试脚本 (通过 Dify API)

使用方法:
    python3 run_e2e_retrieval_test.py --bot a
    python3 run_e2e_retrieval_test.py --bot b
    python3 run_e2e_retrieval_test.py --bot a --test-id A01 --test-id A02

依赖:
    pip install httpx
"""

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

DIFY_API_URL = "http://localhost:3001/v1/chat-messages"

BOT_CONFIG = {
    "a": {
        "api_key": "app-tokXC0BnuUzEZNivb31HAMya",
        "collection": "bot_a_knowledge",
        "test_file": "bot_a_retrieval_test_v2.md",
    },
    "b": {
        "api_key": "app-CyB78gw1CstCsB5QIj2LzhOZ",
        "collection": "bot_b_knowledge",
        "test_file": "bot_b_retrieval_test_v2.md",
    },
}


def call_dify(api_key: str, query: str) -> dict:
    import httpx

    response = httpx.post(
        DIFY_API_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "inputs": {},
            "query": query,
            "response_mode": "blocking",
            "user": "retrieval-test-script",
        },
        timeout=120.0,
    )
    response.raise_for_status()
    return response.json()


def load_test_cases(bot: str) -> list[dict]:
    file_path = Path(__file__).parent / BOT_CONFIG[bot]["test_file"]
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    seen_ids = set()
    cases = []
    lines = content.split("\n")
    for line in lines:
        if " | " in line and line.strip().startswith("|"):
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 4 and parts[1] and parts[1][0].isalnum():
                case_id = parts[1]
                prefix = "A" if bot == "a" else "B"
                if case_id[0] == prefix and case_id[1:].isdigit() and case_id not in seen_ids:
                    seen_ids.add(case_id)
                    question = parts[2].strip().strip("`")
                    cases.append({"id": case_id, "question": question})
    return cases


def grade_result(retrieval_count: int, top_score: float, answer: str) -> str:
    if retrieval_count == 0 and (len(answer) < 50 or "无法回答" in answer or "无法" in answer):
        return "FAIL"
    if retrieval_count > 0 and len(answer) > 50 and "无法回答" not in answer and "无法" not in answer[:20]:
        return "PASS"
    return "PARTIAL"


def run_single_test(case: dict, api_key: str) -> dict:
    print(f"  Testing {case['id']}: {case['question'][:50]}...")
    try:
        result = call_dify(api_key, case["question"])

        answer = result.get("answer", "")
        metadata = result.get("metadata", {})
        retriever_resources = metadata.get("retriever_resources", [])

        top_score = 0.0
        if retriever_resources:
            scores = [r.get("score", 0) or 0 for r in retriever_resources]
            top_score = max(scores) if scores else 0.0

        g = grade_result(len(retriever_resources), top_score, answer)

        return {
            "id": case["id"],
            "query": case["question"],
            "grade": g,
            "retrieval_count": len(retriever_resources),
            "top_score": round(top_score, 4),
            "answer_len": len(answer),
            "answer_preview": answer[:200],
            "message_id": result.get("message_id", ""),
            "conversation_id": result.get("conversation_id", ""),
            "retriever_resources": [
                {
                    "position": r.get("position"),
                    "score": r.get("score"),
                    "document_name": r.get("document_name", ""),
                    "content_preview": (r.get("content", "") or "")[:100],
                }
                for r in retriever_resources
            ],
            "error": None,
        }
    except Exception as e:
        return {
            "id": case["id"],
            "query": case["question"],
            "grade": "ERROR",
            "retrieval_count": 0,
            "top_score": 0,
            "answer_len": 0,
            "answer_preview": "",
            "message_id": "",
            "conversation_id": "",
            "retriever_resources": [],
            "error": str(e),
        }


def run_tests(bot: str, test_ids: list[str] | None = None):
    config = BOT_CONFIG[bot]
    api_key = config["api_key"]

    print(f"\n{'='*60}")
    print(f"Bot {bot.upper()} 端到端检索测试 (Dify API, 语义检索模式)")
    print(f"Dify API: {DIFY_API_URL}")
    print(f"{'='*60}\n")

    cases = load_test_cases(bot)
    if test_ids:
        cases = [c for c in cases if c["id"] in test_ids]

    print(f"Loaded {len(cases)} test cases\n")

    results = []
    for i, case in enumerate(cases):
        result = run_single_test(case, api_key)
        results.append(result)
        retrieval_info = f"retrieval={result['retrieval_count']}, score={result['top_score']}" if result['error'] is None else f"ERROR: {result['error']}"
        print(f"    -> {result['grade']} ({retrieval_info})")
        time.sleep(1)

    stats = {"PASS": 0, "PARTIAL": 0, "FAIL": 0, "ERROR": 0}
    for r in results:
        stats[r["grade"]] = stats.get(r["grade"], 0) + 1

    total = len(results)
    pass_rate = (stats["PASS"] / total * 100) if total > 0 else 0

    print(f"\n{'='*60}")
    print(f"测试结果统计 (语义检索模式)")
    print(f"{'='*60}")
    print(f"总用例数: {total}")
    print(f"PASS: {stats['PASS']} ({stats['PASS']/total*100:.1f}%)")
    print(f"PARTIAL: {stats['PARTIAL']} ({stats['PARTIAL']/total*100:.1f}%)")
    print(f"FAIL: {stats['FAIL']} ({stats['FAIL']/total*100:.1f}%)")
    if stats["ERROR"] > 0:
        print(f"ERROR: {stats['ERROR']}")
    print(f"通过率: {pass_rate:.1f}%")

    retrieval_success = sum(1 for r in results if r["retrieval_count"] > 0)
    print(f"检索成功率: {retrieval_success}/{total} ({retrieval_success/total*100:.1f}%)")

    output_file = (
        Path(__file__).parent
        / f"test_results_bot_{bot}_semantic_{datetime.now().strftime('%Y%m%d')}.json"
    )
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "bot": bot,
                "search_method": "semantic",
                "embedding": "bge-m3",
                "score_threshold": 0.5,
                "timestamp": datetime.now().isoformat(),
                "total": total,
                "stats": stats,
                "pass_rate": pass_rate,
                "retrieval_success_rate": f"{retrieval_success}/{total}",
                "results": results,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"\n结果已保存: {output_file}")

    return results, stats


def main():
    parser = argparse.ArgumentParser(description="Bot A/B 端到端检索测试 (Dify API)")
    parser.add_argument(
        "--bot",
        "-b",
        required=True,
        choices=["a", "b", "A", "B"],
        help="选择测试的Bot (a 或 b)",
    )
    parser.add_argument(
        "--test-id",
        "-t",
        action="append",
        help="指定测试用例ID (可多次使用)",
    )
    args = parser.parse_args()
    run_tests(args.bot.lower(), args.test_id)


if __name__ == "__main__":
    main()
