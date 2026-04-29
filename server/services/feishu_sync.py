"""
飞书定时同步服务 - Bot C 版本指南
从飞书多维表格同步版本信息到 Qdrant
"""

import hashlib
import json
import math
import time
import uuid
from datetime import datetime
from typing import List, Dict, Any

import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct


# ============== 配置 ==============
from server.config import settings

FEISHU_APP_ID = settings.FEISHU_APP_ID
FEISHU_APP_SECRET = settings.FEISHU_APP_SECRET
FEISHU_SPREADSHEET_TOKEN = settings.FEISHU_TABLE_ID

OLLAMA_BASE_URL = settings.OLLAMA_HOST
EMBEDDING_MODEL = settings.OLLAMA_EMBED_MODEL

QDRANT_HOST = settings.QDRANT_HOST
QDRANT_PORT = settings.QDRANT_PORT
QDRANT_COLLECTION = "bot_c_versions"
VECTOR_DIM = 1024  # bge-m3

SYNC_CRON = settings.SYNC_CRON  # 每小时同步


# ============== 工具函数 ==============
def gen_uuid_from_string(s: str) -> str:
    """从字符串生成稳定的 UUID"""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, s))


# ============== 飞书 API ==============
def get_feishu_access_token() -> str:
    """获取飞书 Access Token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {"app_id": FEISHU_APP_ID, "app_secret": FEISHU_APP_SECRET}
    resp = httpx.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise Exception(f"飞书认证失败: {data}")
    return data["tenant_access_token"]


def get_sheet_data(token: str, sheet_id: str, range_str: str = "A1:Z100") -> List[List]:
    """读取飞书表格数据"""
    url = f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{FEISHU_SPREADSHEET_TOKEN}/values/{sheet_id}!{range_str}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = httpx.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise Exception(f"读取飞书表格失败: {data}")
    return data["data"]["valueRange"]["values"]


def get_sheet_list(token: str) -> List[Dict]:
    """获取所有 Sheet 页签"""
    url = f"https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/{FEISHU_SPREADSHEET_TOKEN}/sheets/query"
    headers = {"Authorization": f"Bearer {token}"}
    resp = httpx.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise Exception(f"获取Sheet列表失败: {data}")
    return data["data"]["sheets"]


# ============== Embedding ==============
def get_embedding(text: str) -> List[float]:
    """获取文本向量 (bge-m3)"""
    url = f"{OLLAMA_BASE_URL}/api/embeddings"
    payload = {"model": EMBEDDING_MODEL, "prompt": text}
    resp = httpx.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data["embedding"]


def normalize_vector(v: List[float]) -> List[float]:
    """归一化向量 (用于余弦相似度)"""
    mag = math.sqrt(sum(x * x for x in v))
    return [x / mag for x in v]


# ============== Qdrant ==============
def ensure_collection_exists(client: QdrantClient):
    """确保 Collection 存在，不存在则创建"""
    collections = client.get_collections().collections
    collection_names = [c.name for c in collections]

    if QDRANT_COLLECTION not in collection_names:
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
        print(f"Created collection: {QDRANT_COLLECTION}")
    else:
        print(f"Collection already exists: {QDRANT_COLLECTION}")


def format_release_index(rows: List[List], sheet_title: str) -> List[Dict]:
    """格式化 Release Index 数据为知识单元"""
    if len(rows) < 3:
        return []

    # 第一行是标题描述，第二行是列名
    headers = rows[1] if len(rows) > 1 else []
    data_rows = rows[2:]  # 从第三行开始是数据

    records = []
    for i, row in enumerate(data_rows):
        if not row or not any(row):
            continue

        record = {}
        for j, cell in enumerate(row):
            if j < len(headers):
                header = str(headers[j]).strip() if headers[j] else f"col_{j}"
                record[header] = cell

        if not record.get("Release Name") and not record.get("Release Name") != "Release Name":
            continue

        # 构建文本描述
        release_name = record.get("Release Name", f"Release {i+1}")
        status = record.get("Status", "Unknown")
        modules = []
        for m in ["Inventory", "Other", "Promotion", "Master Data", "POS", "EOD", "Dashboard", "Integration", "Integration Dashboard"]:
            if record.get(m) == "Y":
                modules.append(m)

        # PROD versions
        prod_versions = []
        for col in ["PROD Terminal Version", "PVT PROD Ver", "PDT PROD Ver", "POS PROD Ver", "ISP PROD Ver", "Dmall OS PROD"]:
            if record.get(col):
                prod_versions.append(str(record.get(col, "")))

        affected_scope = record.get("Affected scope", "")
        remarks = record.get("Remarks", "")
        item_count = record.get("#Item", "")

        content = f"""Release: {release_name}
Status: {status}
Modules: {", ".join(modules) if modules else "N/A"}
Versions: {", ".join(prod_versions) if prod_versions else "N/A"}
Affected Scope: {affected_scope}
Item Count: {item_count}
Remarks: {remarks}"""

        records.append({
            "doc_id": gen_uuid_from_string(f"release_{release_name}"),
            "original_doc_id": f"release_{release_name}".replace(" ", "_").replace("/", "_"),
            "release_name": release_name,
            "status": status,
            "modules": modules,
            "content": content,
            "source": "feishu_release_index",
            "sheet": sheet_title,
        })

    return records


def format_terminal_versions(rows: List[List], sheet_title: str) -> List[Dict]:
    """格式化 Production Terminal Versions 数据"""
    if len(rows) < 3:
        return []

    # 第一行是更新时间，第二行是列名
    headers = rows[1] if len(rows) > 1 else []
    data_rows = rows[2:3]  # 实际数据只有一行

    records = []
    for i, row in enumerate(data_rows):
        if not row:
            continue

        record = {}
        for j, cell in enumerate(row):
            if j < len(headers):
                header = str(headers[j]).strip() if headers[j] else f"col_{j}"
                record[header] = cell

        update_time = rows[0][0] if rows and rows[0] else "Unknown"

        content = f"""Production Terminal Versions (Updated: {update_time})
POS Terminal Version: {record.get("POS Terminal Version", "N/A")}
PVT Terminal Version: {record.get("PVT Terminal Version", "N/A")}
ISP Terminal Version: {record.get("ISP Terminial Version", "N/A")}
PDT Terminal Version: {record.get("PDT Terminal Version", "N/A")}
Dmall OS Version: {record.get("Dmall OS", "N/A")}"""

        records.append({
            "doc_id": gen_uuid_from_string("production_terminal_versions"),
            "original_doc_id": "production_terminal_versions",
            "release_name": "Production Terminal Versions",
            "status": "Current",
            "modules": ["POS", "PVT", "ISP", "PDT", "Dmall OS"],
            "content": content,
            "source": "feishu_terminal_versions",
            "sheet": sheet_title,
        })

    return records


# ============== 主同步流程 ==============
def sync_feishu_to_qdrant() -> Dict[str, int]:
    """
    同步飞书表格到 Qdrant
    返回: {"released": count, "terminal": count}
    """
    print(f"[{datetime.now().isoformat()}] Starting Feishu sync...")

    # 1. 获取 Access Token
    token = get_feishu_access_token()
    print("  - Got Feishu access token")

    # 2. 获取所有 Sheet
    sheets = get_sheet_list(token)
    print(f"  - Found {len(sheets)} sheets")

    # 3. 读取各 Sheet 数据
    all_records = []
    for sheet in sheets:
        sheet_id = sheet["sheet_id"]
        sheet_title = sheet["title"]
        print(f"  - Reading sheet: {sheet_title}")

        rows = get_sheet_data(token, sheet_id)
        print(f"    - Got {len(rows)} rows")

        if "Release Index" in sheet_title:
            records = format_release_index(rows, sheet_title)
            all_records.extend(records)
            print(f"    - Formatted {len(records)} release records")
        elif "Production Terminal Versions" in sheet_title:
            records = format_terminal_versions(rows, sheet_title)
            all_records.extend(records)
            print(f"    - Formatted {len(records)} terminal version records")

    # 4. 连接 Qdrant
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    ensure_collection_exists(client)

    # 5. 清空旧数据并写入新数据（全量重建）
    print(f"  - Clearing old data from {QDRANT_COLLECTION}...")
    try:
        client.delete_collection(QDRANT_COLLECTION)
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
    except Exception as e:
        print(f"  - Collection recreate: {e}")

    # 6. 生成向量并写入
    print(f"  - Embedding {len(all_records)} records...")
    points = []
    for i, record in enumerate(all_records):
        if i % 5 == 0:
            print(f"    - Processing {i+1}/{len(all_records)}...")

        # 生成向量
        embedding = get_embedding(record["content"])
        embedding_norm = normalize_vector(embedding)

        point = PointStruct(
            id=record["doc_id"],
            vector=embedding_norm,
            payload={
                "original_doc_id": record.get("original_doc_id", ""),
                "release_name": record["release_name"],
                "status": record["status"],
                "modules": record["modules"],
                "content": record["content"],
                "source": record["source"],
                "sheet": record["sheet"],
            }
        )
        points.append(point)

    # 批量写入
    print(f"  - Writing {len(points)} points to Qdrant...")
    client.upsert(
        collection_name=QDRANT_COLLECTION,
        points=points
    )

    result = {
        "released": len([r for r in all_records if r["source"] == "feishu_release_index"]),
        "terminal": len([r for r in all_records if r["source"] == "feishu_terminal_versions"]),
    }

    print(f"[{datetime.now().isoformat()}] Sync completed: {result}")
    return result


# ============== 手动执行入口 ==============
if __name__ == "__main__":
    try:
        result = sync_feishu_to_qdrant()
        print(f"\nSync successful!")
        print(f"  - Release Index records: {result['released']}")
        print(f"  - Terminal Versions records: {result['terminal']}")
    except Exception as e:
        print(f"\nSync failed: {e}")
        raise
