#!/bin/bash
set -euo pipefail
TASK_ROOT=$(cd "$(dirname "$0")" && pwd)
TASK_BIN="$HOME/.local/bin"
mkdir -p "$TASK_BIN"
chmod +x "$TASK_ROOT/scripts/serve.py"
if [ -e "$TASK_BIN/comp1110-sim" ] || [ -L "$TASK_BIN/comp1110-sim" ]; then
  if [ "$(readlink "$TASK_BIN/comp1110-sim")" != "$TASK_ROOT/scripts/serve.py" ]; then
    printf '已有同名启动命令，未覆盖。\n'; exit 1
  fi
else
  ln -s "$TASK_ROOT/scripts/serve.py" "$TASK_BIN/comp1110-sim"
fi
printf '已注册本地命令：%s/comp1110-sim\n也可双击 start.command 启动。\n' "$TASK_BIN"
