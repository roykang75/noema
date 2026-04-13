#!/usr/bin/env bash
# 백엔드(FastAPI) + 프론트엔드(Next.js) 개발 서버 시작
#
# 사용법:
#   ./scripts/start.sh
#
# 인프라(Docker)는 미리 실행되어 있어야 함: `docker compose up -d`

set -euo pipefail

# 프로젝트 루트로 이동
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# PID/로그 디렉토리
PID_DIR="$ROOT_DIR/.run"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# ANSI 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# 이미 실행 중인지 확인
is_running() {
  local pid_file=$1
  [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

# Docker 인프라 확인
log_info "Docker 인프라 상태 확인 중..."
if ! docker compose ps --format '{{.Status}}' | grep -q "Up"; then
  log_warn "Docker 인프라가 실행 중이 아닙니다. 먼저 실행하세요:"
  log_warn "  docker compose up -d"
  exit 1
fi
log_info "Docker 인프라 정상 실행 중"

# 백엔드 실행
if is_running "$BACKEND_PID_FILE"; then
  log_warn "백엔드가 이미 실행 중입니다 (PID: $(cat "$BACKEND_PID_FILE"))"
else
  log_info "백엔드 시작 중..."
  cd "$ROOT_DIR/backend"
  nohup uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 \
    > "$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
  cd "$ROOT_DIR"
  log_info "백엔드 시작됨 (PID: $(cat "$BACKEND_PID_FILE"), 로그: $BACKEND_LOG)"
fi

# 프론트엔드 실행
if is_running "$FRONTEND_PID_FILE"; then
  log_warn "프론트엔드가 이미 실행 중입니다 (PID: $(cat "$FRONTEND_PID_FILE"))"
else
  log_info "프론트엔드 시작 중..."
  cd "$ROOT_DIR/frontend"
  nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
  cd "$ROOT_DIR"
  log_info "프론트엔드 시작됨 (PID: $(cat "$FRONTEND_PID_FILE"), 로그: $FRONTEND_LOG)"
fi

echo ""
log_info "모두 실행되었습니다."
echo "  백엔드:    http://localhost:8000 (API 문서: /docs)"
echo "  프론트엔드: http://localhost:3000"
echo ""
echo "로그 확인:"
echo "  tail -f $BACKEND_LOG"
echo "  tail -f $FRONTEND_LOG"
echo ""
echo "중단: ./scripts/stop.sh"
