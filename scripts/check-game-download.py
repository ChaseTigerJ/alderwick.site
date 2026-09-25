#!/usr/bin/env python3
"""Verify all extracted game files against a running local launcher."""
import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('game_directory', type=Path, help='Extracted Alderwick-Portable/game directory')
parser.add_argument('--url', default='http://127.0.0.1:4186/')
args = parser.parse_args()
root = args.game_directory.resolve()
assert (root / 'index.html').is_file(), 'Expected extracted game directory'
checked = []
for file in sorted(root.rglob('*')):
    if not file.is_file():
        continue
    url = args.url.rstrip('/') + '/' + file.relative_to(root).as_posix()
    with urlopen(url, timeout=10) as response:
        body = response.read()
        assert response.status == 200, url
        assert body == file.read_bytes(), url
        if file.suffix == '.js':
            assert 'javascript' in response.headers['Content-Type'], url
        if file.suffix == '.css':
            assert 'text/css' in response.headers['Content-Type'], url
        checked.append(file.relative_to(root).as_posix())
with urlopen(Request(args.url, method='HEAD'), timeout=10) as response:
    assert response.status == 200
print(json.dumps({'url':args.url, 'passed':True, 'assetCount':len(checked), 'checks':['200 responses', 'matching content bytes', 'JavaScript and CSS MIME types', 'HEAD index']}, indent=2))
