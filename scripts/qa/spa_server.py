import http.server, os, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 4173

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)
    def translate_path(self, path):
        p = super().translate_path(path)
        if not os.path.exists(p):
            return os.path.join(ROOT, 'index.html')
        return p

http.server.test(HandlerClass=Handler, port=PORT)
