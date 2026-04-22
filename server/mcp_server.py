"""
飞书 MCP Server
实现 MCP 协议，供 Dify 调用以实时读取飞书表格数据
"""

import json
from typing import Any, List, Optional
from dataclasses import dataclass
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# ============== 配置 ==============
FEISHU_APP_ID = "cli_a932aed4ec389bcb"
FEISHU_APP_SECRET = "VEDSStFLUfeYWJe86oQwnhOxdUiaTiaN"
FEISHU_SPREADSHEET_TOKEN = "YASaso15NhaPfQt4JTkcgKvYneY"

# ============== 飞书 API 客户端 ==============
class FeishuClient:
    def __init__(self):
        self.access_token: Optional[str] = None

    def get_access_token(self) -> str:
        """获取飞书 Access Token"""
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
        """读取飞书表格数据"""
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
        """获取所有 Sheet"""
        token = self.get_access_token()
        url = f"https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/{FEISHU_SPREADSHEET_TOKEN}/sheets/query"
        headers = {"Authorization": f"Bearer {token}"}
        resp = httpx.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise Exception(f"获取Sheet列表失败: {data}")
        return data["data"]["sheets"]


# ============== MCP Server ==============
app = Server("feishu-mcp")


@app.list_tools()
async def list_tools() -> List[Tool]:
    """列出所有可用工具"""
    return [
        Tool(
            name="get_release_index",
            description="获取版本发布索引列表，包含各版本的名称、模块、版本号、状态、影响范围等信息",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="get_terminal_versions",
            description="获取当前生产环境的终端版本信息，包括POS、PVT、ISP、PDT、Dmall OS的当前版本",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="search_releases",
            description="搜索版本发布记录，可按关键词搜索版本名称、模块、状态等",
            inputSchema={
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "string",
                        "description": "搜索关键词，如版本名、模块名"
                    }
                },
                "required": ["keyword"]
            }
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> List[TextContent]:
    """执行工具调用"""
    feishu = FeishuClient()

    if name == "get_release_index":
        # 获取 Release Index 数据
        sheets = feishu.get_sheet_list()
        release_index_sheet = next((s for s in sheets if "Release Index" in s["title"]), None)

        if not release_index_sheet:
            return [TextContent(type="text", text="未找到 Release Index Sheet")]

        rows = feishu.get_sheet_data(release_index_sheet["sheet_id"])

        # 格式化输出
        result_lines = ["# 版本发布索引 (Release Index)\n"]
        if len(rows) > 2:
            # 第三行开始是数据
            for i, row in enumerate(rows[2:22], 1):  # 只返回前20条
                if not row:
                    continue
                release_name = row[0] if len(row) > 0 else ""
                status = ""
                modules = []
                for j, cell in enumerate(row):
                    if j > 0 and j < 10 and cell == "Y":
                        module_names = ["Inventory", "Other", "Promotion", "Master Data", "POS", "EOD", "Dashboard", "Integration", "Integration Dashboard"]
                        if j-1 < len(module_names):
                            modules.append(module_names[j-1])
                    if j == 22:  # Status column
                        status = str(cell) if cell else ""

                if release_name:
                    result_lines.append(f"**{i}. {release_name}**")
                    result_lines.append(f"   - 状态: {status}")
                    result_lines.append(f"   - 模块: {', '.join(modules) if modules else 'N/A'}")
                    result_lines.append("")

        return [TextContent(type="text", text="\n".join(result_lines))]

    elif name == "get_terminal_versions":
        # 获取 Production Terminal Versions 数据
        sheets = feishu.get_sheet_list()
        terminal_sheet = next((s for s in sheets if "Production Terminal Versions" in s["title"]), None)

        if not terminal_sheet:
            return [TextContent(type="text", text="未找到 Production Terminal Versions Sheet")]

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

        return [TextContent(type="text", text="\n".join(result_lines))]

    elif name == "search_releases":
        keyword = arguments.get("keyword", "")
        if not keyword:
            return [TextContent(type="text", text="请提供搜索关键词")]

        # 获取所有 Release Index 数据
        sheets = feishu.get_sheet_list()
        release_index_sheet = next((s for s in sheets if "Release Index" in s["title"]), None)

        if not release_index_sheet:
            return [TextContent(type="text", text="未找到 Release Index Sheet")]

        rows = feishu.get_sheet_data(release_index_sheet["sheet_id"])

        # 搜索
        result_lines = [f"# 搜索结果: \"{keyword}\"\n"]
        found = 0

        module_names = ["Inventory", "Other", "Promotion", "Master Data", "POS", "EOD", "Dashboard", "Integration", "Integration Dashboard"]

        for i, row in enumerate(rows[2:], 3):  # 从第三行开始
            if not row:
                continue

            release_name = str(row[0]).lower() if len(row) > 0 and row[0] else ""
            row_text = " ".join(str(c).lower() for c in row if c)

            if keyword.lower() in release_name or keyword.lower() in row_text:
                found += 1
                name = row[0] if len(row) > 0 else ""
                status = str(row[22]) if len(row) > 22 and row[22] else ""

                modules = []
                for j, cell in enumerate(row):
                    if 1 <= j <= 9 and cell == "Y":
                        if j-1 < len(module_names):
                            modules.append(module_names[j-1])

                result_lines.append(f"**{name}** (行{i})")
                result_lines.append(f"   - 状态: {status}")
                result_lines.append(f"   - 模块: {', '.join(modules) if modules else 'N/A'}")

                # 包含版本信息
                prod_ver = str(row[15]) if len(row) > 15 and row[15] else ""
                if prod_ver:
                    result_lines.append(f"   - PROD版本: {prod_ver}")

                result_lines.append("")

                if found >= 10:  # 最多返回10条
                    break

        if found == 0:
            result_lines.append("未找到匹配结果")

        return [TextContent(type="text", text="\n".join(result_lines))]

    else:
        return [TextContent(type="text", text=f"未知工具: {name}")]


# ============== 启动服务器 ==============
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
