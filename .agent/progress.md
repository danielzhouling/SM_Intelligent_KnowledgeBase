# 研发进度

## 当前阶段：M4 - Bot配置（进行中，优先Bot C飞书同步）

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
| TASK-M4-001 | 配置Dify Bot A（关联bot_a_knowledge） | ⏳ 待开始 |
| TASK-M4-002 | 配置Dify Bot B（关联bot_b_knowledge） | ⏳ 暂缓 — 依赖Bot B文档 |
| TASK-M4-003 | 申请飞书多维表格访问权限（app_id + app_secret） | ✅ 已完成 |
| TASK-M4-004 | 开发飞书定时同步服务（Bot C数据） | ✅ 已完成 (2026-04-22) — 98条版本记录+1条终端版本 |
| TASK-M4-005 | 配置Dify Bot C（关联bot_c_versions） | 🔄 **下一步** |
| TASK-M4-006 | Bot对话流程测试与调优 | ⏳ 待开始 |
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

**Dify HTTP Tool 配置:**
- URL: http://localhost:8000/api/release-index
- URL: http://localhost:8000/api/terminal-versions
- URL: http://localhost:8000/api/search?keyword={keyword}

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
- 2026-04-22: Bot A数据通过Dify UI手动导入知识库（dict.txt + prd.txt + 7个tickets_part*.txt）
- 2026-04-22: 修复Worker容器缺少MODE=worker导致Celery未启动
- 2026-04-22: 修复API容器缺少CELERY_BROKER_URL导致文档处理失败
- 2026-04-22: 修复plugin_daemon安装source字段大小写不匹配问题
- 2026-04-22: Ollama插件通过本地difypkg手动安装成功
- 2026-04-21: M3开始 - Bot A文档收集完成，预处理脚本完成
- 2026-04-21: M2系统部署完成 - init.sh和docker-compose-all-in-one.yml
- 2026-04-20: 需求讨论完成，确认方案，开始M1任务拆分
- 2026-04-21: M1 Demo静态页面开发完成
