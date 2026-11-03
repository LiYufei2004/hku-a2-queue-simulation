#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v gh >/dev/null; then
  printf '请先安装 GitHub 官方 CLI：brew install gh\n'
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then gh auth login --web --git-protocol https; fi
OWNER=$(gh api user --jq .login)
REPO=${1:-hku-a2-queue-simulation}
if ! [[ "$REPO" =~ ^[a-zA-Z0-9._-]+$ ]]; then printf '仓库名无效\n'; exit 1; fi
FULL="$OWNER/$REPO"
# Use an isolated export checkout; do not publish neighbouring course documents.
BUILD_DIR="$PWD/.publish-checkout"
if [ -e "$BUILD_DIR" ]; then
  if [ ! -d "$BUILD_DIR/.git" ]; then printf '导出目录不是 Git 仓库\n'; exit 1; fi
  REMOTE=$(git -C "$BUILD_DIR" remote get-url origin)
  case "$REMOTE" in
    "https://github.com/$FULL"|"https://github.com/$FULL.git"|"git@github.com:$FULL.git") ;;
    *) printf '导出目录属于其他仓库，请使用原仓库名或更换导出目录\n'; exit 1 ;;
  esac
  git -C "$BUILD_DIR" pull --ff-only
else
  if gh repo view "$FULL" >/dev/null 2>&1; then
    printf '仓库 %s 已存在。请改用新的仓库名，避免覆盖其他项目。\n' "$FULL"
    exit 1
  fi
  gh repo create "$FULL" --public --description 'HKU A2 queue choice simulator and Monte Carlo experiments'
  gh repo clone "$FULL" "$BUILD_DIR"
fi
mkdir -p "$BUILD_DIR/backend" "$BUILD_DIR/frontend/assets" "$BUILD_DIR/scripts" "$BUILD_DIR/tests"
# Copy the explicit public source set; never export neighbouring course files.
cp index.html README.md .gitignore start.command register.command publish.command "$BUILD_DIR/"
cp backend/model-core.js backend/time-profile.js backend/advisor.js backend/simulation-service.js backend/worker.js backend/API.md "$BUILD_DIR/backend/"
cp frontend/index.html frontend/user.html frontend/user.js frontend/campus-map.js frontend/app.js frontend/batch-ui.js frontend/api-client.js frontend/map-geometry.js "$BUILD_DIR/frontend/"
cp frontend/assets/corridor_layout.png frontend/assets/campus-map.svg "$BUILD_DIR/frontend/assets/"
cp scripts/serve.py "$BUILD_DIR/scripts/"
cp tests/model.test.js tests/api.test.js tests/advisor.test.js tests/worker-benchmark.js tests/worker-harness.js "$BUILD_DIR/tests/"
touch "$BUILD_DIR/.nojekyll"
cd "$BUILD_DIR"
git checkout -B main
# Remove obsolete tracked entry points after migrating the previous flat layout.
git rm --ignore-unmatch app.js model-core.js batch-worker.js batch-ui.js assets/corridor_layout.png
git add index.html backend frontend .nojekyll README.md .gitignore start.command register.command publish.command scripts/serve.py tests
if ! git diff --cached --quiet; then
  git -c user.name="$OWNER" -c user.email="$OWNER@users.noreply.github.com" commit -m 'Separate simulation backend and visualization frontend with a versioned API'
fi
gh auth setup-git
git push -u origin main
CONFIG='{"build_type":"legacy","source":{"branch":"main","path":"/"}}'
if gh api "repos/$FULL/pages" >/dev/null 2>&1; then
  printf '%s' "$CONFIG" | gh api --method PUT "repos/$FULL/pages" --input - >/dev/null
else
  printf '%s' "$CONFIG" | gh api --method POST "repos/$FULL/pages" --input - >/dev/null
fi
printf '已提交发布，GitHub 构建完成后访客无需登录：\nhttps://%s.github.io/%s/\n' "$OWNER" "$REPO"
