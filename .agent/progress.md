# 研发进度

## 当前阶段：M3 - 知识库建设

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
| TASK-M3-002 | 收集Bot B知识库文档（用户手册、蓝图） | ⏳ 待开始 |
| TASK-M3-003 | 部署Embedding模型（m2-bert或nomic-embed-text） | ✅ 已完成 |
| TASK-M3-004 | 文档预处理：清洗、切分、格式化 | ✅ 已完成 |
| TASK-M3-005 | Bot A数据Embedding入库Qdrant | ✅ 已完成 (2026-04-22) |
| TASK-M3-006 | Bot B数据Embedding入库Qdrant | ⏳ 待开始 |
| TASK-M3-007 | 知识库质量验证（检索测试） | ⏳ 待开始 |

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

### TASK-M2-001: Ollama安装
- Ollama版本: 0.20.7
- 已安装模型:
  - qwen2.5:3b-instruct (1.9GB)
  - nomic-embed-text (274MB) - Embedding模型
- Metal GPU后端: 已启用 (M4 Mac)

### TASK-M2-002: Qdrant部署
- 端口: 6333 (REST), 6334 (gRPC)
- 版本: 1.17.1
- 状态: 运行中

### TASK-M2-003: Dify部署
- 端口: 3001 (Web UI)
- 容器: sm-dify-api, sm-dify-web, sm-dify-worker, sm-dify-nginx, sm-dify-postgres, sm-dify-redis

## 历史记录

- 2026-04-22: Bot A数据通过Dify UI手动导入知识库（dict.txt + prd.txt + 7个tickets_part*.txt）
- 2026-04-22: 修复Worker容器缺少MODE=worker导致Celery未启动
- 2026-04-22: 修复API容器缺少CELERY_BROKER_URL导致文档处理失败
- 2026-04-22: 修复plugin_daemon安装source字段大小写不匹配问题
- 2026-04-22: Ollama插件通过本地difypkg手动安装成功
- 2026-04-21: M3开始 - Bot A文档收集完成，预处理脚本完成
- 2026-04-21: M2系统部署完成 - init.sh和docker-compose-all-in-one.yml
- 2026-04-20: 需求讨论完成，确认方案，开始M1任务拆分
- 2026-04-21: M1 Demo静态页面开发完成
