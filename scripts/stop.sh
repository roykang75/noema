#!/usr/bin/env bash
# 백엔드(FastAPI) + 프론트엔드(Next.js) 개발 서버 중단
#
# 사용법:
#   ./scripts/stop.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PID_DIR="$ROOT_DIR/.run"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# 프로세스 트리 전체 종료 (자식 프로세스까지)
kill_tree() {
  local pid=$1
  local children
  children=$(pgrep -P "$pid" 2>/dev/null || true)
  for child in $children; do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

stop_service() {
  local name=$1
  local pid_file=$2

  if [[ ! -f "$pid_file" ]]; then
    log_warn "${name}: PID 파일이 없습니다 (이미 중단됨)"
    return
  fi

  local pid
  pid=$(cat "$pid_file")

  if ! kill -0 "$pid" 2>/dev/null; then
    log_warn "${name}: 프로세스가 실행 중이 아닙니다 (PID: $pid)"
    rm -f "$pid_file"
    return
  fi

  log_info "${name} 중단 중 (PID: $pid)..."
  kill_tree "$pid"

  # 최대 5초 대기
  local i=0
  while kill -0 "$pid" 2>/dev/null && [[ $i -lt 10 ]]; do
    sleep 0.5
    i=$((i + 1))
  done

  # 강제 종료
  if kill -0 "$pid" 2>/dev/null; then
    log_warn "${name}: 정상 종료 실패, 강제 종료"
    kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$pid_file"
  log_info "${name} 중단 완료"
}

stop_service "백엔드" "$BACKEND_PID_FILE"
stop_service "프론트엔드" "$FRONTEND_PID_FILE"

echo ""
log_info "모두 중단되었습니다."
echo ""
echo "Docker 인프라도 중단하려면:"
echo "  docker compose down"
