from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.dependencies import get_current_user
from server.database import get_db
from server.models import SyncStatusModel, UserModel
from server.schemas.common import SuccessResponse
from server.services.feishu_client import feishu_client

router = APIRouter(prefix="/api/feishu", tags=["feishu"])

MODULE_NAMES = [
    "Inventory", "Other", "Promotion", "Master Data",
    "POS", "EOD", "Dashboard", "Integration", "Integration Dashboard",
]


@router.get("/release-index")
async def get_release_index(_user: UserModel = Depends(get_current_user)):
    try:
        sheets = await feishu_client.get_sheet_list()
        release_index_sheet = next((s for s in sheets if "Release Index" in s["title"]), None)
        if not release_index_sheet:
            return SuccessResponse(data={"error": "未找到 Release Index Sheet"})

        rows = await feishu_client.get_sheet_data(release_index_sheet["sheet_id"])
        result_lines = ["# 版本发布索引 (Release Index)\n"]
        if len(rows) > 2:
            for i, row in enumerate(rows[2:22], 1):
                if not row:
                    continue
                release_name = row[0] if len(row) > 0 else ""
                status = str(row[22]) if len(row) > 22 and row[22] else ""
                modules = []
                for j, cell in enumerate(row[1:10], 0):
                    if cell == "Y" and j < len(MODULE_NAMES):
                        modules.append(MODULE_NAMES[j])
                if release_name:
                    result_lines.append(f"**{i}. {release_name}**")
                    result_lines.append(f"   - 状态: {status}")
                    result_lines.append(f"   - 模块: {', '.join(modules) if modules else 'N/A'}")
                    result_lines.append("")

        return SuccessResponse(data={"result": "\n".join(result_lines)})
    except Exception as e:
        return SuccessResponse(data={"error": str(e)})


@router.get("/terminal-versions")
async def get_terminal_versions(_user: UserModel = Depends(get_current_user)):
    try:
        sheets = await feishu_client.get_sheet_list()
        terminal_sheet = next(
            (s for s in sheets if "Production Terminal Versions" in s["title"]), None
        )
        if not terminal_sheet:
            return SuccessResponse(data={"error": "未找到 Production Terminal Versions Sheet"})

        rows = await feishu_client.get_sheet_data(terminal_sheet["sheet_id"])
        result_lines = ["# 生产环境终端版本\n"]
        if len(rows) > 2:
            update_time = rows[0][0] if rows and rows[0] else "Unknown"
            result_lines.append(f"更新时间: {update_time}\n")

            headers = rows[1] if len(rows) > 1 else []
            data = rows[2] if len(rows) > 2 else []

            version_map = {
                "POS Terminal Version": "POS",
                "PVT Terminal Version": "PVT",
                "ISP Terminial Version": "ISP",
                "PDT Terminal Version": "PDT",
                "Dmall OS": "Dmall OS",
            }

            for j, cell in enumerate(data):
                if j < len(headers):
                    header = str(headers[j]).strip()
                    if header in version_map:
                        result_lines.append(f"- **{version_map[header]}**: {cell}")

        return SuccessResponse(data={"result": "\n".join(result_lines)})
    except Exception as e:
        return SuccessResponse(data={"error": str(e)})


@router.get("/search")
async def search_releases(
    keyword: str = Query(..., description="搜索关键词"),
    _user: UserModel = Depends(get_current_user),
):
    try:
        sheets = await feishu_client.get_sheet_list()
        release_index_sheet = next((s for s in sheets if "Release Index" in s["title"]), None)
        if not release_index_sheet:
            return SuccessResponse(data={"error": "未找到 Release Index Sheet"})

        rows = await feishu_client.get_sheet_data(release_index_sheet["sheet_id"])
        result_lines = [f'# 搜索结果: "{keyword}"\n']
        found = 0

        for i, row in enumerate(rows[2:], 3):
            if not row:
                continue
            release_name = str(row[0]).lower() if len(row) > 0 and row[0] else ""
            row_text = " ".join(str(c).lower() for c in row if c)

            if keyword.lower() in release_name or keyword.lower() in row_text:
                found += 1
                name = row[0] if len(row) > 0 else ""
                status = str(row[22]) if len(row) > 22 and row[22] else ""
                modules = []
                for j, cell in enumerate(row[1:10]):
                    if cell == "Y" and j < len(MODULE_NAMES):
                        modules.append(MODULE_NAMES[j])

                result_lines.append(f"**{name}**")
                result_lines.append(f"   - 状态: {status}")
                result_lines.append(f"   - 模块: {', '.join(modules) if modules else 'N/A'}")
                prod_ver = str(row[15]) if len(row) > 15 and row[15] else ""
                if prod_ver:
                    result_lines.append(f"   - PROD版本: {prod_ver}")
                result_lines.append("")
                if found >= 10:
                    break

        if found == 0:
            result_lines.append("未找到匹配结果")

        return SuccessResponse(data={"result": "\n".join(result_lines)})
    except Exception as e:
        return SuccessResponse(data={"error": str(e)})


@router.get("/sync/status")
async def get_sync_status(
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(get_current_user),
):
    result = await db.execute(
        select(SyncStatusModel)
        .order_by(SyncStatusModel.synced_at.desc())
        .limit(10)
    )
    records = result.scalars().all()
    return SuccessResponse(data=[
        {
            "id": r.id,
            "collection": r.collection,
            "records_synced": r.records_synced,
            "synced_at": r.synced_at.isoformat() if r.synced_at else None,
            "status": r.status,
            "error_message": r.error_message,
        }
        for r in records
    ])
