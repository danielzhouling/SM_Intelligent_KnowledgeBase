# 研发进度

## 当前阶段：M4 - Bot配置（进行中，Bot A已激活，等待Bot C配置）

## 待修复Bug（2026-04-24）

| Bug | 严重程度 | 状态 |
|-----|---------|------|
| AdminData未定义 | 🔴 严重 | ✅ 已修复 — admin/index.html/users.html/roles.html改用AdminApiService异步调用 |
| 非管理员可登录管理后台 | 🟡 中等 | 待修复 — admin页面未校验user.manage/role.manage权限 |
| Bot权限过滤前端未生效 | 🟡 中等 | 待修复 — store-manager/helpdesk看到3个Bot（应为1/2） |

## Bug修复记录（2026-04-24）

### AdminData未定义 Bug
- **根因**: admin/index.html, users.html, roles.html 使用了不存在的 `AdminData` 对象，应使用 `AdminApiService`
- **修复**: 将同步 `AdminData.getXxx()` 调用改为异步 `await AdminApiService.getXxx()`
- **修复**: 将 `AdminData.saveXxx()` 改为 `AdminApiService.createXxx/updateXxx/deleteXxx` API调用
- **修复**: admin/index.html 仪表盘统计、recent feedback表格改用异步加载

### Bot C API Key配置
- **问题**: Bot C在Dify已配置Agent+飞书插件，但数据库无API Key，状态为draft
- **修复**: 在Dify数据库为Bot C创建API Token `app-NNfmmBgV2X9PWDxcQf9fSLt7`，更新到app数据库
- **结果**: Bot C现在为active状态，可正常调用Dify Agent

### Bot B数据修复
- **问题**: Bot B被错误更新为disabled且有Bot C的API Key
- **修复**: 重置Bot B为draft状态，API Key置空

## 已知问题

| 问题 | 说明 |
|------|------|
| app-backend容器unhealthy | DifyService初始化时连接Dify失败，但不影响API运行 |
| Bot B待配置 | 等待用户提供用户手册/蓝图文档 |

## 重要技术决策变更（2026-04-22）

| 决策项 | 变更前 | 变更后 |
|--------|--------|--------|
| 后端技术栈 | Node.js/Express | **Python/FastAPI** |
| 数据库 | SQLite | **独立PostgreSQL实例** |
| 认证方案 | 未定 | **JWT Token** |
| 会话保存 | 未定 | **保存，利用Dify存储 + 后端存映射** |
| 反馈流程 | 简单记录 | **完整闭环：提交→审核→分类→导出微调** |
| M5任务数 | 8个 | **10个（新增Docker整合、反馈闭环）** |

## 任务进度

### M2 系统部署

| 任务 | 描述 | 状态 |
|------|------|------|
| TASK-M2-001 | 安装Ollama并配置Metal后端支持 | ✅ 已完成 |
| TASK-M2-002 | 部署Qdrant向量数据库 | ✅ 已完成 |
| TASK-M2-003 | 部署Dify平台 | ✅ 已完成 |
| TASK-M2-004 | 配置Dify与Ollama连接 | ✅ 已完成 (2026-04-21) |
| TASK-M2-005 | 编写Docker Compose部署文档 | ✅ 已完成 (2026-04-21) |

### M3 知识库建设

| 任务 | 描述 | 状态 |
|------|------|------|
| TASK-M3-001 | 收集Bot A知识库文档（工单、问题记录） | ✅ 已完成 |
| TASK-M3-002 | 收集Bot B知识库文档（用户手册、蓝图） | ⏳ 待用户提供（暂缓） |
| TASK-M3-003 | 部署Embedding模型（m2-bert或nomic-embed-text） | ✅ 已完成 |
| TASK-M3-004 | 文档预处理：清洗、切分、格式化 | ✅ 已完成 |
| TASK-M3-005 | Bot A数据Embedding入库Qdrant | ✅ 已完成 (2026-04-22) |
| TASK-M3-006 | Bot B数据Embedding入库Qdrant | ⏳ 待开始 — 暂缓，等待用户提供文档 |

### M4 Bot配置

| 任务 | 描述 | 状态 |
|------|------|------|
| TASK-M4-001 | 配置Dify Bot A（关联bot_a_knowledge） | ✅ 已完成 (2026-04-23) — Chatbot + 知识库检索，待调优 |
| TASK-M4-002 | 配置Dify Bot B（关联bot_b_knowledge） | ⏳ 暂缓 — 依赖Bot B文档 |
| TASK-M4-003 | 申请飞书多维表格访问权限（app_id + app_secret） | ✅ 已完成 |
| TASK-M4-004 | 开发飞书HTTP API服务（供Dify HTTP Tool调用） | ✅ 已完成 — 服务运行在 localhost:8000 |
| TASK-M4-005 | 配置Dify Bot C（版本指南，飞书插件） | ✅ 已完成 (2026-04-22) — Dify Agent + 飞书电子表格插件 |
| TASK-M4-006 | Bot对话流程测试与调优 | ⏳ 待开始 |
| TASK-M5-001 | 后端服务搭建 + PostgreSQL + Schema + JWT + 种子数据 | ✅ 已完成 (2026-04-23) |
| TASK-M5-002 | FastAPI路由层：auth + users/roles/bots CRUD + feedbacks + chat会话 | ✅ 已完成 (2026-04-23) |
| TASK-M5-010 | 端到端集成测试 (21个测试全部通过) | ✅ 已完成 (2026-04-23) |
| TASK-M3-006-1 | Embedding模型替换为bge-m3（支持中英文检索） | ✅ 已完成 (2026-04-22) — 通过率84.2% |
| TASK-M3-007 | 知识库质量验证（检索测试，19条用例） | ✅ 已完成 (2026-04-22) — 英文87.5%通过，中文0%通过（模型不支持） |

## 已完成详情

### TASK-M3-001: Bot A 文档收集

**文档清单：**
| 文件 | 类型 | 数量 |
|------|------|------|
| 2025_11 ~ 2026_03 tickets.xlsx | 工单数据 | 3326条 |
| Dict.xlsx | 数据字典 | 32条 |
| 押金系统 PRD.docx | PRD文档 | 5章节 |
| POS客户端 PRD.docx | PRD文档 | 58章节 |

**存放路径：** `knowledge/bot_a/raw/`

### TASK-M3-004: 文档预处理

**处理脚本：** `knowledge/bot_a/process/preprocess.py`

**输出文件：**
| 文件 | 大小 | 说明 |
|------|------|------|
| tickets.json | 4.2 MB | 3326条工单知识单元 |
| prd.json | 114 KB | 47个PRD章节 |
| dict.json | 10 KB | 32条术语 |
| dict.txt | 2 KB | 数据字典（文本格式） |
| prd.txt | 94 KB | PRD章节（文本格式） |
| tickets_part1~7.txt | 各300~400KB | 工单拆分文件（每份500条，文本格式） |

**知识单元结构：**
```json
{
  "doc_id": "ticket_2025_11_0000",
  "title": "SHELTAG PRINTING",
  "content": "问题: SHELTAG PRINTING\n\n根因分类: ...\n\n解决方案:\n...",
  "metadata": {
    "source": "ticket",
    "ticket_id": "6186351",
    "root_cause": "Improper / Incomplete Installation",
    ...
  }
}
```

**知识分类（元数据）：**
- `source="ticket"` - 工单数据
- `source="prd"` - PRD章节
- `source="dict"` - 数据字典术语

### TASK-M3-005: Bot A数据入库

**导入方式：** 通过 Dify UI 手动上传（项目硬性约束）

**Dify 知识库配置：**
- 知识库名称：Bot A - 工单与PRD
- 分段方式：自动，分段长度 1500，重叠 50
- 索引方式：高质量（Embedding）
- Embedding 模型：nomic-embed-text
- 检索方式：混合检索（语义 0.7 + 关键词 0.3）

**上传文件清单：**
| 文件 | 类型 | 条数 |
|------|------|------|
| dict.txt | 数据字典 | 32 条 |
| prd.txt | PRD章节 | 47 个 |
| tickets_part1~7.txt | 工单 | 3326 条 |

**测试用例：** `docs/test_cases/bot_a_knowledge_base_test.md`（19条用例）

### TASK-M3-007: 知识库质量验证（检索测试）

**验证方法：** 直接通过 Ollama + Qdrant API 验证向量检索质量（绕过Dify API认证问题）

**测试结果：**
| 语言类型 | 通过率 | 说明 |
|---------|--------|------|
| 英文检索 | 7/8 (87.5%) | nomic-embed-text 正常工作 |
| 中文检索 | 0/5 (0%) | **预期失败** - nomic-embed-text 不支持中文 |
| 中英混合 | 1/6 (16.7%) | 混合检索效果差 |

**总体通过率:** 8/19 (42.1%)

**关键发现：**
- `nomic-embed-text` 是纯英文Embedding模型，无法处理中文文本
- 中文查询（如"押金退款流程"）返回完全不相关结果
- 英文查询（如"uncaptured sales"）检索质量良好
- **根本原因已确认**：需要替换为支持中英文的 Embedding 模型（如 bge-m3）

**后续建议：**
- ✅ TASK-M3-006-1 已完成（bge-m3 模型替换）
- 重新索引后中文检索显著改善

### TASK-M3-006-1: Embedding模型替换为bge-m3

**替换结果：**
- 模型: bge-m3 (567M参数, 1024维向量, 8K上下文)
- 接入方式: Ollama本地部署 + Dify数据库注册
- 通过率: 42.1% → 84.2% (提升42%)

**测试结果对比：**
| 类别 | nomic-embed-text | bge-m3 |
|------|:-----------------:|:------:|
| 总体通过率 | 42.1% | **84.2%** |
| 英文检索 | 87.5% | 87.5% |
| 中文PRD | 0% | **60%** |
| 数据字典 | 0% | **100%** |
| 中英混合 | 16.7% | **100%** |

### TASK-M4-004: 飞书 HTTP API 服务

**服务:** `server/feishu_http_server.py` (FastAPI)

**可用接口:**
| 接口 | 功能 |
|------|------|
| `GET /api/release-index` | 获取版本发布索引列表 |
| `GET /api/terminal-versions` | 获取当前生产终端版本 |
| `GET /api/search?keyword=xxx` | 按关键词搜索版本 |

**协议:** HTTP REST API
**数据源:** 飞书表格 ReleaseIndex（实时读取，无缓存）

**启动命令:** `python3 server/feishu_http_server.py`
**访问地址:** http://localhost:8000

### TASK-M4-005: Dify Bot C 配置（已完成）

**方案变更：** 从 HTTP Tool 方案改为 **Dify 飞书电子表格插件** 方案

**配置详情：**
- 应用类型: **Agent**（支持工具调用）
- 应用名称: `Bot C - 版本指南`
- LLM 模型: `qwen2.5:3b-instruct` (Ollama本地)
- 插件: `langgenius/feishu_spreadsheet:0.0.2`
- 工具: `read_rows`, `read_table`（飞书电子表格读取）
- 数据源: 飞书电子表格 `YASaso15NhaPfQt4JTkcgKvYneY`

**飞书插件凭证配置：**
- APP_ID: `cli_a932aed4ec389bcb`
- APP_SECRET: 已配置

**注意：** 飞书插件使用第三方代理API (`lark-plugin-api.solutionsuite.cn`)，非直接调用飞书Open API

### TASK-M4-006: Bot对话测试（待开始）

**Dify HTTP Tool 配置:**
- URL: http://localhost:8000/api/release-index
- URL: http://localhost:8000/api/terminal-versions
- URL: http://localhost:8000/api/search?keyword={keyword}

### TASK-M5-001: 后端服务搭建 (2026-04-23 完成)

**新增文件结构:**
```
server/
├── config.py               # pydantic-settings 配置管理
├── database.py             # async SQLAlchemy 引擎 + session + Base
├── main.py                 # FastAPI 入口 + lifespan（建表+种子）
├── seed.py                 # 幂等种子数据
├── requirements.txt        # Python 依赖
├── Dockerfile              # 容器构建
├── .env.example            # 环境变量模板（提交）
├── .env                    # 本地开发配置（不提交，gitignore）
├── models/
│   ├── __init__.py
│   ├── user.py            # users + user_roles
│   ├── role.py            # roles + permissions + role_permissions
│   ├── bot.py             # bots
│   ├── conversation.py    # conversations
│   ├── feedback.py        # feedbacks
│   └── sync_status.py     # sync_status
├── schemas/
│   ├── __init__.py
│   ├── common.py          # SuccessResponse / ErrorResponse
│   └── auth.py           # LoginRequest / TokenResponse / UserMeResponse
├── auth/
│   ├── __init__.py
│   ├── jwt.py             # JWT签发/验证 + bcrypt密码
│   └── dependencies.py    # get_current_user
├── routers/
│   ├── __init__.py
│   ├── auth.py            # /api/auth/login, /refresh, /me
│   └── feishu.py         # /api/feishu/*
├── services/
│   └── feishu_client.py  # async FeishuClient（从feishu_http_server.py提取）
└── tests/
    ├── __init__.py
    ├── conftest.py        # 测试固件（SQLite内存DB + TestClient）
    ├── test_models.py     # 9个模型测试
    ├── test_auth.py       # 5个JWT测试
    ├── test_auth_api.py   # 6个API测试
    ├── test_seed.py       # 9个种子数据测试
    └── test_feishu_router.py  # 3个飞书路由测试
```

**技术选型:**
- FastAPI 0.115+ + SQLAlchemy 2.0 async + asyncpg
- JWT: python-jose (HS256), bcrypt直接使用（非passlib，兼容性问题）
- 测试: pytest-asyncio + aiosqlite 内存数据库
- 配置: pydantic-settings + .env 文件

**Docker部署:**
- `app-postgres`: PostgreSQL 15 独立实例，端口5433暴露宿主机
- `app-backend`: FastAPI服务，端口8000暴露宿主机
- 容器名: sm-app-postgres, sm-app-backend

**种子数据验证通过:**
- admin/admin123 (System Admin, 5项权限)
- hq-admin/password123 (HQ IT Admin)
- store-manager/password123 (Store Manager)
- helpdesk/password123 (Helpdesk)
- Bot A/B/C (draft状态, dify_api_key=null)

### TASK-M2-001: Ollama安装
- Ollama版本: 0.20.7
- 已安装模型:
  - qwen2.5:3b-instruct (1.9GB)
  - nomic-embed-text (274MB) - ~~Embedding模型~~ (已替换)
  - **bge-m3 (1.2GB) - 当前Embedding模型**
- Metal GPU后端: 已启用 (M4 Mac)

### TASK-M2-002: Qdrant部署
- 端口: 6333 (REST), 6334 (gRPC)
- 版本: 1.17.1
- 状态: 运行中

### TASK-M2-003: Dify部署
- 端口: 3001 (Web UI)
- 容器: sm-dify-api, sm-dify-web, sm-dify-worker, sm-dify-nginx, sm-dify-postgres, sm-dify-redis

## 历史记录

- 2026-04-22: 技术方案定稿 — Python/FastAPI + PostgreSQL + JWT + 会话保存 + 反馈闭环，M5扩展为10个任务
- 2026-04-22: TASK-M4-005完成 — Bot C配置为Dify Agent + 飞书电子表格插件，测试通过并发布
- 2026-04-22: Bot A数据通过Dify UI手动导入知识库（dict.txt + prd.txt + 7个tickets_part*.txt）
- 2026-04-22: 修复Worker容器缺少MODE=worker导致Celery未启动
- 2026-04-22: 修复API容器缺少CELERY_BROKER_URL导致文档处理失败
- 2026-04-22: 修复plugin_daemon安装source字段大小写不匹配问题
- 2026-04-22: Ollama插件通过本地difypkg手动安装成功
- 2026-04-21: M3开始 - Bot A文档收集完成，预处理脚本完成
- 2026-04-21: M2系统部署完成 - init.sh和docker-compose-all-in-one.yml
- 2026-04-20: 需求讨论完成，确认方案，开始M1任务拆分
- 2026-04-21: M1 Demo静态页面开发完成

- 2026-04-23: TASK-M5-008完成 — 反馈闭环实现（admin/feedback.html），反馈审核Modal、状态机(valid/invalid/duplicate/wrong-source)、微调数据导出JSON、AdminApiService对接
- 2026-04-23: TASK-M5-005完成 — 多会话管理（chat.html侧边栏会话列表 + 切换 + 新会话 + 删除），历史消息加载，mock模式会话持久化
- 2026-04-23: TASK-M5-006完成 — 用户端前端改造（demo/js/app.js），ApiService真实API对接、流式响应、多会话支持、反馈提交
- 2026-04-23: TASK-M5-007完成 — 管理后台API服务层（js/admin-api-service.js），AdminApiService实现 + admin-app.js对接，Mock/Real模式切换
- 2026-04-23: TASK-M5-003完成 — 前端API服务层（api-service.js）重构，JWT Token管理、401刷新拦截器、SSE流式解析
- 2026-04-23: TASK-M5-004完成 — 前端app.js改造，接入新ApiService
- 2026-04-23: TASK-M5-002完成 — FastAPI全路由层开发（48个测试全部通过）
- 2026-04-23: TASK-M5-001完成 — FastAPI后端服务搭建（32个测试全部通过）
- 2026-04-23: TASK-M5-010完成 — 端到端集成测试（21个测试全部通过），覆盖认证、Bot管理、用户CRUD、角色CRUD、反馈管理

- 2026-04-24: 修复种子数据缺失Bot权限 — seed.py添加bot.A/B/C权限，数据库插入9条role_permissions映射
- 2026-04-24: 修复DifyService从数据库读取API Key — 从环境变量改为从BotModel查询数据库
- 2026-04-24: 修复SSE流双重data:前缀 — dify_service yield纯JSON，chat.py统一加SSE前缀
- 2026-04-24: 修复_parseSSE双次调用read() — 移除重复调用，修复reader消耗问题
- 2026-04-24: 修复Nginx proxy_request_buffering配置 — 移除on避免缓冲POST请求
- 2026-04-24: 系统测试执行 — 36项测试，API 14/14通过，UI 12/22通过（10项因Bot未配置/AdminData未定义而失败）
- 2026-04-24: Bot A在管理后台配置为active — 用户端可见Bot A卡片
