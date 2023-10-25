from http.server import HTTPServer, BaseHTTPRequestHandler
from base64 import b64decode

def decode(payload):
    maps = { 0x02: '[BT]', 0x03: '[ET]', 0x1c: '[FS]', 0x1f: '[US]' }
    data = b64decode(payload.encode('utf-8'))
    for byte in data:
        print(maps[byte] if byte in maps else chr(byte), end='', flush=True)
    print()


class RequestHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        payload = self.path.lstrip('/?')
        decode(payload)
        self.send_response_only(200)
        self.end_headers()


with HTTPServer(('0.0.0.0', 10009), RequestHandler) as server:
    server.serve_forever()