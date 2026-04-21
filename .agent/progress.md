# 研发进度

## 当前阶段：M2 - 系统部署

## 任务进度

### M2 系统部署

| 任务 | 描述 | 状态 |
|------|------|------|
| TASK-M2-001 | 安装Ollama并配置Metal后端支持 | ✅ 已完成 |
| TASK-M2-002 | 部署Qdrant向量数据库 | ✅ 已完成 |
| TASK-M2-003 | 部署Dify平台 | ✅ 已完成 |
| TASK-M2-004 | 配置Dify与Ollama连接 | ✅ 已完成 (2026-04-21) |
| TASK-M2-005 | 编写Docker Compose部署文档 | ⏳ 待完成 |

## 已完成详情

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
- 健康检查: 通过

### TASK-M2-003: Dify部署
- 端口: 3001 (Web UI)
- 容器状态:
  - sm-dify-api: 运行中
  - sm-dify-web: 运行中
  - sm-dify-worker: 运行中
  - sm-dify-nginx: 运行中
  - sm-dify-postgres: 健康
  - sm-dify-redis: 健康

## 待配置 (TASK-M2-004)

Dify连接Ollama需要通过Web界面配置:
1. 访问 http://localhost:3001
2. 首次登录创建管理员账号
3. 进入 Settings > Model Providers
4. 添加 Ollama 提供商:
   - API Base URL: http://host.docker.internal:11434
   - 使用的模型: qwen2.5:3b-instruct

## 历史记录

- 2026-04-20: 需求讨论完成，确认方案，开始M1任务拆分
- 2026-04-20: 审查反馈修复 - TASK-004反馈机制、TASK-008多角色分配、TASK-010自动生成权限
- 2026-04-21: M1 Demo静态页面开发完成
- 2026-04-21: 开始M2系统部署 - Ollama/Qdrant/Dify已部署
