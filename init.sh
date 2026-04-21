#!/bin/bash
# ==================================================================
# SM-Dmall ERP 智能知识库系统 - 环境初始化脚本
# ==================================================================
# 用途:
#   ./init.sh              - 检查环境状态
#   ./init.sh start        - 启动所有服务
#   ./init.sh stop         - 停止所有服务
#   ./init.sh restart      - 重启所有服务
#   ./init.sh status       - 查看服务状态
#   ./init.sh logs [svc]   - 查看日志 (可选: qdrant/dify/api/web/worker/nginx)
#   ./init.sh setup        - 一键初始化环境
# ==================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/docker"

# 服务定义
QDRANT_CONTAINER="sm-qdrant"
DIFY_API_CONTAINER="docker-api-1"
DIFY_WEB_CONTAINER="docker-web-1"
DIFY_WORKER_CONTAINER="docker-worker-1"
DIFY_NGINX_CONTAINER="docker-nginx-1"

# 端口定义
QDRANT_REST_PORT=6333
QDRANT_GRPC_PORT=6334
DIFY_WEB_PORT=3001
OLLAMA_PORT=11434

# ==================================================================
# 辅助函数
# ==================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

section() {
    echo ""
    echo "============================================================"
    echo "$1"
    echo "============================================================"
}

# ==================================================================
# 环境检查
# ==================================================================

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        return 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker 守护进程未运行"
        return 1
    fi

    log_success "Docker: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
    return 0
}

check_ollama() {
    if ! command -v ollama &> /dev/null; then
        log_warn "Ollama 未安装 (brew install ollama)"
        return 1
    fi

    OLLAMA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${OLLAMA_PORT}/api/tags 2>/dev/null || echo "000")
    if [ "$OLLAMA_STATUS" = "200" ]; then
        log_success "Ollama: 运行中 (端口 ${OLLAMA_PORT})"
        return 0
    else
        log_warn "Ollama: 未运行或无法访问"
        return 1
    fi
}

check_ports() {
    log_info "检查端口占用..."
    local ports=($QDRANT_REST_PORT $QDRANT_GRPC_PORT $DIFY_WEB_PORT)
    local port_names=("Qdrant REST" "Qdrant gRPC" "Dify Web")
    local has_conflict=false

    for i in "${!ports[@]}"; do
        if lsof -Pi ":${ports[$i]}" -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warn "端口 ${ports[$i]} (${port_names[$i]}) 已被占用"
            has_conflict=true
        else
            log_success "端口 ${ports[$i]} (${port_names[$i]}) 可用"
        fi
    done

    $has_conflict && return 1 || return 0
}

# ==================================================================
# 服务状态
# ==================================================================

show_status() {
    section "服务状态"

    # Docker 容器状态
    echo ""
    echo "Docker 容器:"
    docker ps -a --filter "name=sm-" --filter "name=docker-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | head -20 || echo "  无相关容器"

    # Qdrant 健康检查
    echo ""
    echo "Qdrant 健康检查:"
    if curl -s http://localhost:${QDRANT_REST_PORT}/health >/dev/null 2>&1; then
        log_success "Qdrant REST: http://localhost:${QDRANT_REST_PORT}"
        curl -s http://localhost:${QDRANT_REST_PORT}/collections | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'  Collections: {len(data.get(\"result\",{}).get(\"collections\",[]))}')" 2>/dev/null || true
    else
        log_error "Qdrant REST: 未响应"
    fi

    # Ollama 模型
    echo ""
    echo "Ollama 模型:"
    if command -v ollama &> /dev/null; then
        ollama list 2>/dev/null | tail -n +2 | while read line; do
            echo "  $line"
        done || log_warn "无法获取模型列表"
    else
        log_warn "Ollama 未安装"
    fi

    # Dify Web 健康检查
    echo ""
    echo "Dify Web:"
    if curl -sL -o /dev/null -w "%{http_code}" http://localhost:${DIFY_WEB_PORT} 2>/dev/null | grep -qE "^(200|302|307)$"; then
        log_success "Dify Web: http://localhost:${DIFY_WEB_PORT} (运行中)"
    else
        log_error "Dify Web: 未响应 (端口 ${DIFY_WEB_PORT})"
    fi

    echo ""
}

show_logs() {
    local service=${1:-""}

    case $service in
        qdrant)
            docker logs -f $QDRANT_CONTAINER --tail 100
            ;;
        api)
            docker logs -f $DIFY_API_CONTAINER --tail 100
            ;;
        web)
            docker logs -f $DIFY_WEB_CONTAINER --tail 100
            ;;
        worker)
            docker logs -f $DIFY_WORKER_CONTAINER --tail 100
            ;;
        nginx)
            docker logs -f $DIFY_NGINX_CONTAINER --tail 100
            ;;
        "")
            echo "Usage: $0 logs [qdrant|api|web|worker|nginx]"
            ;;
        *)
            echo "未知服务: $service"
            echo "可用服务: qdrant, api, web, worker, nginx"
            ;;
    esac
}

# ==================================================================
# 服务管理
# ==================================================================

start_services() {
    section "启动服务"

    log_info "使用 Docker Compose 启动服务..."
    cd "$DOCKER_DIR"

    # 启动 Qdrant
    log_info "启动 Qdrant..."
    docker-compose up -d qdrant

    # 启动 Dify (使用 all-in-one 配置)
    log_info "启动 Dify..."
    docker-compose -f docker-compose-all-in-one.yml up -d

    log_success "服务启动完成"
    sleep 2
    show_status
}

stop_services() {
    section "停止服务"

    log_info "停止 Docker 服务..."
    cd "$DOCKER_DIR"

    docker-compose -f docker-compose-all-in-one.yml down 2>/dev/null || true
    docker-compose down qdrant 2>/dev/null || true

    log_success "服务已停止"
}

restart_services() {
    stop_services
    sleep 2
    start_services
}

# ==================================================================
# 环境初始化
# ==================================================================

setup_environment() {
    section "初始化环境"

    # 检查基础命令
    log_info "检查基础命令..."
    local commands=("docker" "curl" "lsof")
    for cmd in "${commands[@]}"; do
        if command -v $cmd &> /dev/null; then
            log_success "$cmd"
        else
            log_error "$cmd (未安装)"
        fi
    done

    # 检查 Docker
    if ! check_docker; then
        log_error "请先安装并启动 Docker Desktop"
        exit 1
    fi

    # 检查并创建必要的目录
    log_info "检查目录..."
    mkdir -p "$DOCKER_DIR/volumes/qdrant"
    mkdir -p "$DOCKER_DIR/volumes/dify"

    # Ollama 检查
    echo ""
    if ! command -v ollama &> /dev/null; then
        log_warn "Ollama 未安装"
        echo ""
        echo "安装 Ollama:"
        echo "  brew install ollama"
        echo "  brew services start ollama"
        echo ""
        echo "安装模型:"
        echo "  ollama pull qwen2.5:3b-instruct"
        echo "  ollama pull nomic-embed-text"
    else
        check_ollama
    fi

    echo ""
    show_status
}

# ==================================================================
# 快速健康检查
# ==================================================================

health_check() {
    section "健康检查"

    local all_ok=true

    # Qdrant
    echo -n "Qdrant: "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:${QDRANT_REST_PORT}/collections 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAIL${NC}"
        all_ok=false
    fi

    # Dify
    echo -n "Dify Web: "
    if curl -sL -o /dev/null -w "%{http_code}" http://localhost:${DIFY_WEB_PORT} 2>/dev/null | grep -qE "^(200|302|307)$"; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAIL${NC}"
        all_ok=false
    fi

    # Ollama
    echo -n "Ollama: "
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:${OLLAMA_PORT}/api/tags 2>/dev/null | grep -q "200"; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAIL${NC}"
        all_ok=false
    fi

    echo ""
    if $all_ok; then
        log_success "所有服务运行正常"
        return 0
    else
        log_error "部分服务异常，请检查"
        return 1
    fi
}

# ==================================================================
# 访问信息
# ==================================================================

show_access_info() {
    section "访问地址"

    echo ""
    echo "  Ollama API:     http://localhost:${OLLAMA_PORT}"
    echo "  Qdrant:         http://localhost:${QDRANT_REST_PORT}"
    echo "  Qdrant gRPC:    localhost:${QDRANT_GRPC_PORT}"
    echo "  Dify (Web UI):  http://localhost:${DIFY_WEB_PORT}"
    echo ""
    echo "  Demo 页面:      file://${SCRIPT_DIR}/demo/index.html"
    echo "  管理后台:       file://${SCRIPT_DIR}/admin/login.html"
    echo ""
    echo "  Dify 初始账号:  在首次访问 http://localhost:${DIFY_WEB_PORT} 时创建"
    echo ""
}

# ==================================================================
# 主逻辑
# ==================================================================

main() {
    case "${1:-status}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        setup)
            setup_environment
            ;;
        health|check)
            health_check
            ;;
        info)
            show_access_info
            ;;
        help|--help|-h)
            echo "用法: $0 [command]"
            echo ""
            echo "命令:"
            echo "  status   查看服务状态 (默认)"
            echo "  start    启动所有服务"
            echo "  stop     停止所有服务"
            echo "  restart  重启所有服务"
            echo "  logs     查看日志 (可选: qdrant/api/web/worker/nginx)"
            echo "  setup    初始化环境"
            echo "  health   健康检查"
            echo "  info     显示访问地址"
            echo "  help     显示帮助"
            ;;
        *)
            show_status
            ;;
    esac
}

main "$@"
