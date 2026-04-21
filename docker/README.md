# SM-Dmall ERP 智能知识库系统 - 部署文档

## 环境要求

- macOS (Apple Silicon M1/M2/M3/M4)
- Docker Desktop 或 OrbStack
- Homebrew

## 一、Ollama 本地模型服务

### 1.1 安装与启动

```bash
# 安装 Ollama
brew install ollama

# 启动 Ollama 服务
brew services start ollama

# 验证安装
ollama list
```

### 1.2 安装模型

```bash
# 安装对话模型 (Qwen 3B, 适合本地运行)
ollama pull qwen2.5:3b-instruct

# 安装 Embedding 模型 (用于知识库向量化和RAG)
ollama pull nomic-embed-text
```

### 1.3 验证模型

```bash
# 测试对话
ollama run qwen2.5:3b-instruct "你好"

# 测试 Embedding
curl -X POST http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "nomic-embed-text", "prompt": "测试文本"}'
```

## 二、Qdrant 向量数据库

### 2.1 启动 Qdrant

```bash
cd docker
docker-compose up -d qdrant
```

### 2.2 验证部署

```bash
# 健康检查
curl http://localhost:6333/

# 查看 Collections
curl http://localhost:6333/collections
```

### 2.3 API 端口

- REST API: http://localhost:6333
- gRPC API: http://localhost:6334

## 三、Dify AI 平台

### 3.1 启动 Dify

```bash
docker-compose -f dify-docker-compose.yml up -d
```

### 3.2 验证部署

```bash
# Web UI (注意: 系统服务可能占用5000端口，使用3001)
curl http://localhost:3001

# 查看容器状态
docker ps --filter "name=sm-dify"
```

### 3.3 初始配置

1. 访问 http://localhost:3001
2. 首次登录需要创建管理员账号
3. 配置 Ollama 作为模型提供商:
   - 进入 Settings > Model Providers
   - 选择 Ollama
   - API Base URL: `http://host.docker.internal:11434`
   - 模型名称: `qwen2.5:3b-instruct`

### 3.4 端口映射

| 服务 | 端口 | 说明 |
|------|------|------|
| Dify Web | 3001 | 用户界面 |
| PostgreSQL | 内部 | 数据库 |
| Redis | 内部 | 缓存 |

## 四、快速启动 (一键启动所有服务)

```bash
# 启动所有服务
docker-compose up -d
docker-compose -f dify-docker-compose.yml up -d

# 验证服务状态
curl http://localhost:6333/collections  # Qdrant
curl http://localhost:3001             # Dify
curl http://localhost:11434/api/tags  # Ollama
```

## 五、服务访问地址汇总

| 服务 | 地址 | 说明 |
|------|------|------|
| Ollama API | http://localhost:11434 | 本地模型服务 |
| Qdrant | http://localhost:6333 | 向量数据库 REST |
| Qdrant gRPC | http://localhost:6334 | 向量数据库 gRPC |
| Dify | http://localhost:3001 | AI平台 Web UI |

## 六、注意事项

### 6.1 macOS 端口占用

如果端口 5000 被系统服务占用 (如 AirPlay)，Dify 将使用备选端口 3001。

### 6.2 Docker 网络

- Dify 容器使用 `dify-network` 网络
- Ollama 通过 `host.docker.internal` 访问宿主机

### 6.3 数据持久化

- Qdrant 数据卷: `docker_qdrant_storage`
- Dify 数据卷: `dify_api_data`, `postgres_data`, `redis_data`

## 七、停止服务

```bash
# 停止 Dify
docker-compose -f dify-docker-compose.yml down

# 停止 Qdrant
docker-compose down

# 停止 Ollama (不常用，不建议停止)
brew services stop ollama
```

## 八、故障排除

### Qdrant 启动失败

```bash
# 检查日志
docker logs sm-qdrant

# 清理数据卷重新启动
docker-compose down -v
docker-compose up -d
```

### Dify API 连接失败

```bash
# 检查容器日志
docker logs sm-dify-api
docker logs sm-dify-nginx

# 重启相关容器
docker-compose -f dify-docker-compose.yml restart api nginx
```

### Ollama 模型无法连接

```bash
# 检查 Ollama 服务状态
ollama list

# 重启 Ollama
brew services restart ollama
```
