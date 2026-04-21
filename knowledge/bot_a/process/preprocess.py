#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bot A 知识库预处理脚本
将工单、PRD、数据字典转换为可入库的JSON格式

Usage:
    python3 preprocess.py [--all] [--tickets] [--prd] [--dict]
"""

import os
import re
import json
import argparse
from pathlib import Path
from datetime import datetime

import pandas as pd
from docx import Document

# ============================================================================
# 配置
# ============================================================================

# 脚本位于 process/ 目录，需要回退到 bot_a/
BOT_A_DIR = Path(__file__).parent.parent
RAW_DIR = BOT_A_DIR / "raw"
PROCESSED_DIR = BOT_A_DIR / "processed"

# 工单文件
TICKET_FILES = [
    "2025_11 tickets.xlsx",
    "2025_12 tickets.xlsx",
    "2026_01 tickets.xlsx",
    "2026_02 Tickets.xlsx",
    "2026_03 tickets.xlsx",
]

# PRD文件
PRD_FILES = [
    "「SM OSI」_「销售域」_「押金系统」_「PRD」_V1.0.0.0.docx",
    "「SM_Market」_「 POS 域」_「POS客户端 V1.0.0.0」_「PRD」_V1.0.0.0.docx",
]

DICT_FILE = "Dict.xlsx"

# ============================================================================
# 工单处理
# ============================================================================

def process_tickets():
    """处理工单数据，每条工单转为1个知识单元"""
    all_tickets = []

    for filename in TICKET_FILES:
        filepath = RAW_DIR / filename
        if not filepath.exists():
            print(f"  [WARN] 文件不存在: {filename}")
            continue

        print(f"  处理: {filename}")
        df = pd.read_excel(filepath)

        for idx, row in df.iterrows():
            # 跳过空Resolution
            resolution = str(row.get('Resolution', '')).strip()
            if resolution == 'nan' or not resolution:
                continue

            # 构建内容
            subject = str(row.get('Subject', '')).strip()
            root_cause = str(row.get('Root Cause', '')).strip()
            specific_root_cause = str(row.get('Specific Root Cause', '')).strip()
            description = str(row.get('Description', '')).strip()
            resolution_summary = str(row.get('Resolution Summary', '')).strip()

            # 拼接内容
            content_parts = []

            if subject and subject != 'nan':
                content_parts.append(f"问题: {subject}")

            if root_cause and root_cause != 'nan':
                content_parts.append(f"根因分类: {root_cause}")

            if specific_root_cause and specific_root_cause != 'nan':
                content_parts.append(f"具体根因: {specific_root_cause}")

            if description and description != 'nan':
                content_parts.append(f"问题描述: {description}")

            if resolution_summary and resolution_summary != 'nan':
                content_parts.append(f"解决摘要: {resolution_summary}")

            content_parts.append(f"解决方案:\n{resolution}")

            content = "\n\n".join(content_parts)

            # 生成doc_id
            month = filename.split()[0]  # e.g. "2025_11"
            doc_id = f"ticket_{month}_{str(idx).zfill(4)}"

            # 元数据
            metadata = {
                "source": "ticket",
                "ticket_id": str(row.get('RequestID', '')).strip(),
                "subject": subject,
                "created_time": str(row.get('Created Time', '')).strip()[:10] if pd.notna(row.get('Created Time')) else '',
                "priority": str(row.get('Priority', '')).strip(),
                "status": str(row.get('Request Status', '')).strip(),
                "affected_markets": str(row.get('Affected Markets Application', '')).strip(),
                "root_cause": root_cause if root_cause != 'nan' else '',
                "source_file": filename,
            }

            all_tickets.append({
                "doc_id": doc_id,
                "title": subject if subject and subject != 'nan' else f"工单_{idx}",
                "content": content,
                "metadata": metadata
            })

    print(f"  共处理 {len(all_tickets)} 条工单")
    return all_tickets


# ============================================================================
# PRD处理
# ============================================================================

def extract_chapters_from_docx(doc):
    """从DOCX提取章节结构"""
    chapters = []

    # 匹配章节标题 (1. 2. 3. 或 3.1 3.2 等)
    chapter_pattern = re.compile(r'^(\d+(?:\.\d+)?)\s+(.+)$')

    current_chapter = None
    current_content = []
    current_level = 0

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        match = chapter_pattern.match(text)
        if match:
            # 保存上一章节
            if current_chapter:
                chapters.append({
                    "chapter_num": current_chapter,
                    "title": current_title,
                    "level": current_level,
                    "content": "\n".join(current_content).strip()
                })

            # 开始新章节
            current_chapter = match.group(1)
            current_title = match.group(2)
            current_level = len(current_chapter.split('.'))

            # 判断是章还是节
            if '.' in current_chapter:
                current_title = f"[{current_chapter}] {current_title}"
            else:
                current_title = f"第{current_chapter}章 {current_title}"

            current_content = []
        else:
            current_content.append(text)

    # 保存最后一章
    if current_chapter:
        chapters.append({
            "chapter_num": current_chapter,
            "title": current_title,
            "level": current_level,
            "content": "\n".join(current_content).strip()
        })

    return chapters


def process_prd():
    """处理PRD文档，按章节切分"""
    all_prd = []

    for filename in PRD_FILES:
        filepath = RAW_DIR / filename
        if not filepath.exists():
            print(f"  [WARN] 文件不存在: {filename}")
            continue

        print(f"  处理: {filename}")
        doc = Document(filepath)

        # 提取文件名中的系统名
        # e.g. "「SM OSI」_「销售域」_「押金系统」_「PRD」_V1.0.0.0.docx"
        match = re.search(r'」_(「.*?」)_「PRD」', filename)
        system_name = match.group(1).replace('「', '').replace('」', '') if match else filename

        chapters = extract_chapters_from_docx(doc)
        print(f"    提取 {len(chapters)} 个章节")

        for idx, chapter in enumerate(chapters):
            # 跳过内容太少的章节
            if len(chapter['content']) < 50:
                continue

            doc_id = f"prd_{system_name}_{chapter['chapter_num'].replace('.', '_')}"

            metadata = {
                "source": "prd",
                "system": system_name,
                "chapter": chapter['chapter_num'],
                "title": chapter['title'],
                "level": chapter['level'],
                "source_file": filename,
            }

            all_prd.append({
                "doc_id": doc_id,
                "title": chapter['title'],
                "content": chapter['content'],
                "metadata": metadata
            })

    print(f"  共处理 {len(all_prd)} 个PRD章节")
    return all_prd


# ============================================================================
# 数据字典处理
# ============================================================================

def process_dict():
    """处理数据字典"""
    filepath = RAW_DIR / DICT_FILE
    if not filepath.exists():
        print(f"  [WARN] 文件不存在: {DICT_FILE}")
        return []

    print(f"  处理: {DICT_FILE}")
    df = pd.read_excel(filepath)

    all_dict = []
    for idx, row in df.iterrows():
        name = str(row.get('Name', '')).strip()
        abbr = str(row.get('Abbreviation', '')).strip()
        desc = str(row.get('Des', '')).strip()

        if name == 'nan' or not name:
            continue

        # 清理描述中的多余换行
        desc = re.sub(r'\s+', ' ', desc).strip()

        doc_id = f"dict_{str(idx).zfill(3)}"

        metadata = {
            "source": "dict",
            "name": name,
            "abbreviation": abbr if abbr != 'nan' else '',
            "questioner": str(row.get('Questioner', '')).strip(),
            "answerer": str(row.get('Answerer', '')).strip(),
        }

        # 内容组合
        content_parts = [f"术语: {name}"]
        if abbr and abbr != 'nan':
            content_parts.append(f"缩写: {abbr}")
        if desc and desc != 'nan':
            content_parts.append(f"解释: {desc}")

        all_dict.append({
            "doc_id": doc_id,
            "title": name,
            "content": "\n".join(content_parts),
            "metadata": metadata
        })

    print(f"  共处理 {len(all_dict)} 条术语")
    return all_dict


# ============================================================================
# 主函数
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Bot A 知识库预处理')
    parser.add_argument('--all', action='store_true', help='处理所有数据')
    parser.add_argument('--tickets', action='store_true', help='只处理工单')
    parser.add_argument('--prd', action='store_true', help='只处理PRD')
    parser.add_argument('--dict', action='store_true', help='只处理数据字典')
    args = parser.parse_args()

    # 默认处理所有
    if not any([args.all, args.tickets, args.prd, args.dict]):
        args.all = True

    # 确保输出目录存在
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("Bot A 知识库预处理")
    print("=" * 60)

    # 处理工单
    if args.all or args.tickets:
        print("\n[1/3] 处理工单数据...")
        tickets = process_tickets()
        output_file = PROCESSED_DIR / "tickets.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(tickets, f, ensure_ascii=False, indent=2)
        print(f"  已保存: {output_file}")

    # 处理PRD
    if args.all or args.prd:
        print("\n[2/3] 处理PRD文档...")
        prd = process_prd()
        output_file = PROCESSED_DIR / "prd.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(prd, f, ensure_ascii=False, indent=2)
        print(f"  已保存: {output_file}")

    # 处理数据字典
    if args.all or args.dict:
        print("\n[3/3] 处理数据字典...")
        dict_data = process_dict()
        output_file = PROCESSED_DIR / "dict.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(dict_data, f, ensure_ascii=False, indent=2)
        print(f"  已保存: {output_file}")

    print("\n" + "=" * 60)
    print("预处理完成!")
    print("=" * 60)

    # 汇总
    print("\n输出文件:")
    for f in PROCESSED_DIR.glob("*.json"):
        size = f.stat().st_size / 1024
        print(f"  {f.name}: {size:.1f} KB")


if __name__ == "__main__":
    main()
