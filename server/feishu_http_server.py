"""
飞书 HTTP API Server
供 Dify 作为 HTTP Tool 调用，实时读取飞书表格数据
"""

from typing import Any, List, Optional
import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ============== 配置 ==============
FEISHU_APP_ID = "cli_a932aed4ec389bcb"
FEISHU_APP_SECRET = "VEDSStFLUfeYWJe86oQwnhOxdUiaTiaN"
FEISHU_SPREADSHEET_TOKEN = "YASaso15NhaPfQt4JTkcgKvYneY"

SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8000

# ============== FastAPI App ==============
app = FastAPI(title="Feishu API Server", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== 飞书 API 客户端 ==============
class FeishuClient:
    def __init__(self):
        self.access_token: Optional[str] = None

    def get_access_token(self) -> str:
        if self.access_token:
            return self.access_token

        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        payload = {"app_id": FEISHU_APP_ID, "app_secret": FEISHU_APP_SECRET}
        resp = httpx.post(url, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise Exception(f"飞书认证失败: {data}")
        self.access_token = data["tenant_access_token"]
        return self.access_token

    def get_sheet_data(self, sheet_id: str, range_str: str = "A1:Z100") -> List[List]:
        token = self.get_access_token()
        url = f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{FEISHU_SPREADSHEET_TOKEN}/values/{sheet_id}!{range_str}"
        headers = {"Authorization": f"Bearer {token}"}
        resp = httpx.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise Exception(f"读取飞书表格失败: {data}")
        return data["data"]["valueRange"]["values"]

    def get_sheet_list(self) -> List[dict]:
        token = self.get_access_token()
        url = f"https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/{FEISHU_SPREADSHEET_TOKEN}/sheets/query"
        headers = {"Authorization": f"Bearer {token}"}
        resp = httpx.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise Exception(f"获取Sheet列表失败: {data}")
        return data["data"]["sheets"]


feishu = FeishuClient()


# ============== API Endpoints ==============
@app.get("/")
async def root():
    return {"message": "Feishu API Server", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/release-index")
async def get_release_index():
    """
    获取版本发布索引列表
    Dify HTTP Tool 调用此接口获取版本列表
    """
    try:
        sheets = feishu.get_sheet_list()
        release_index_sheet = next((s for s in sheets if "Release Index" in s["title"]), None)

        if not release_index_sheet:
            return {"error": "未找到 Release Index Sheet"}

        rows = feishu.get_sheet_data(release_index_sheet["sheet_id"])

        result_lines = ["# 版本发布索引 (Release Index)\n"]
        if len(rows) > 2:
            for i, row in enumerate(rows[2:22], 1):
                if not row:
                    continue
                release_name = row[0] if len(row) > 0 else ""
                status = str(row[22]) if len(row) > 22 and row[22] else ""

                module_names = ["Inventory", "Other", "Promotion", "Master Data", "POS", "EOD", "Dashboard", "Integration", "Integration Dashboard"]
                modules = []
                for j, cell in enumerate(row[1:10], 0):
                    if cell == "Y" and j < len(module_names):
                        modules.append(module_names[j])

                if release_name:
                    result_lines.append(f"**{i}. {release_name}**")
                    result_lines.append(f"   - 状态: {status}")
                    result_lines.append(f"   - 模块: {', '.join(modules) if modules else 'N/A'}")
                    result_lines.append("")

        return {"result": "\n".join(result_lines)}

    except Exception as e:
        return {"error": str(e)}


@app.get("/api/terminal-versions")
async def get_terminal_versions():
    """
    获取当前生产环境终端版本
    Dify HTTP Tool 调用此接口获取终端版本
    """
    try:
        sheets = feishu.get_sheet_list()
        terminal_sheet = next((s for s in sheets if "Production Terminal Versions" in s["title"]), None)

        if not terminal_sheet:
            return {"error": "未找到 Production Terminal Versions Sheet"}

        rows = feishu.get_sheet_data(terminal_sheet["sheet_id"])

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
                "Dmall OS": "Dmall OS"
            }

            for j, cell in enumerate(data):
                if j < len(headers):
                    header = str(headers[j]).strip()
                    if header in version_map:
                        result_lines.append(f"- **{version_map[header]}**: {cell}")

        return {"result": "\n".join(result_lines)}

    except Exception as e:
        return {"error": str(e)}


@app.get("/api/search")
async def search_releases(keyword: str = Query(..., description="搜索关键词")):
    """
    搜索版本发布记录
    Dify HTTP Tool 调用此接口搜索版本
    """
    try:
        if not keyword:
            return {"error": "请提供搜索关键词"}

        sheets = feishu.get_sheet_list()
        release_index_sheet = next((s for s in sheets if "Release Index" in s["title"]), None)

        if not release_index_sheet:
            return {"error": "未找到 Release Index Sheet"}

        rows = feishu.get_sheet_data(release_index_sheet["sheet_id"])

        result_lines = [f"# 搜索结果: \"{keyword}\"\n"]
        found = 0
        module_names = ["Inventory", "Other", "Promotion", "Master Data", "POS", "EOD", "Dashboard", "Integration", "Integration Dashboard"]

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
                    if cell == "Y" and j < len(module_names):
                        modules.append(module_names[j])

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

        return {"result": "\n".join(result_lines)}

    except Exception as e:
        return {"error": str(e)}


# ============== 启动服务器 ==============
if __name__ == "__main__":
    print(f"飞书 API Server 启动中...")
    print(f"URL: http://{SERVER_HOST}:{SERVER_PORT}")
    print(f"\nDify HTTP Tool 配置:")
    print(f"  - 获取版本列表: GET http://{SERVER_HOST}:{SERVER_PORT}/api/release-index")
    print(f"  - 获取终端版本: GET http://{SERVER_HOST}:{SERVER_PORT}/api/terminal-versions")
    print(f"  - 搜索版本:     GET http://{SERVER_HOST}:{SERVER_PORT}/api/search?keyword=xxx")
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)
