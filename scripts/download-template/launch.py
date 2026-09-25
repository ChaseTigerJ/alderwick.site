#!/usr/bin/env python3
"""Launch Alderwick's compiled browser game on this computer only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import sys
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent / 'game'
PORT = 4186
URL = f'http://127.0.0.1:{PORT}/'

class LocalGameHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript',
                      '.wasm': 'application/wasm', '.glb': 'model/gltf-binary',
                      '.webmanifest': 'application/manifest+json',
                      '.svg': 'image/svg+xml', '.webp': 'image/webp'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

if not (ROOT / 'index.html').is_file():
    sys.exit('The game folder is missing. Extract the complete ZIP before launching.')
try:
    server = ThreadingHTTPServer(('127.0.0.1', PORT), partial(LocalGameHandler, directory=str(ROOT)))
except OSError as exc:
    sys.exit(f'Could not start Alderwick: {exc}\nClose another Alderwick launcher and try again. The fixed port preserves your local saves.')
print(f'\nALDERWICK\nOpen {URL} in a current desktop browser.\nKeep this window open while playing. Press Ctrl+C to stop.\n', flush=True)
if os.environ.get('ALDERWICK_NO_BROWSER') != '1':
    threading.Timer(0.6, lambda: webbrowser.open(URL)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\nAlderwick closed. Your browser keeps your saved settlements.')
finally:
    server.server_close()
