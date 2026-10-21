#!/usr/bin/env python3
"""Run the local public-page preview; reuse an existing matching server."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
import os, webbrowser, urllib.request
root = Path(__file__).resolve().parents[1]
port = int(os.environ.get('COMP1110_PORT', '8765'))
url = f'http://127.0.0.1:{port}/'
try:
    server = ThreadingHTTPServer(('127.0.0.1', port), partial(SimpleHTTPRequestHandler, directory=str(root)))
except OSError:
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            if 'HKU A2' not in response.read().decode('utf-8'):
                raise RuntimeError('端口被其他应用占用，请设置 COMP1110_PORT 换一个端口')
    except Exception as error:
        raise SystemExit(f'无法启动：{error}')
    webbrowser.open(url)
    print(f'已有服务正在运行：{url}')
else:
    webbrowser.open(url)
    print(f'本地仿真：{url}；按 Ctrl+C 停止')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
