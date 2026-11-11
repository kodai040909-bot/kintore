# 手元で動かすための静的サーバー。ブラウザに古いファイルを覚えさせない（Cache-Control: no-store）
# 開発の道具として、PUT で design/screenshots と icons に .png を保存できる（localhost からだけ）
# 使い方（ワークスペースの直下から）：python kintore/tools/serve.py 8124
import http.server, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_PUT(self):
        # 保存してよいのは design/screenshots と icons の .png だけ
        m = re.fullmatch(r'/(design/screenshots|icons)/([a-z0-9-]{1,40})\.png', self.path)
        n = int(self.headers.get('Content-Length', 0))
        if not m or n <= 0 or n > 5_000_000 or self.client_address[0] not in ('127.0.0.1', '::1'):
            self.send_response(403); self.end_headers(); return
        data = self.rfile.read(n)
        if not data.startswith(b'\x89PNG'):
            self.send_response(400); self.end_headers(); return
        folder = os.path.join(ROOT, *m.group(1).split('/'))
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, m.group(2) + '.png'), 'wb') as f:
            f.write(data)
        self.send_response(201); self.end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8124
    os.chdir(ROOT)
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
