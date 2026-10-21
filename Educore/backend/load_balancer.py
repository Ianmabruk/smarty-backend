import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib import request as urllib_request

UPSTREAMS = [
    "http://127.0.0.1:5001",
    "http://127.0.0.1:5002",
    "http://127.0.0.1:5003",
    "http://127.0.0.1:5004",
]

_proxy_index = 0
_proxy_lock = threading.Lock()


def next_upstream(client_ip=None):
    global _proxy_index
    if client_ip:
        return UPSTREAMS[abs(hash(client_ip)) % len(UPSTREAMS)]

    with _proxy_lock:
        upstream = UPSTREAMS[_proxy_index]
        _proxy_index = (_proxy_index + 1) % len(UPSTREAMS)
        return upstream


class ProxyHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        self._proxy_request()

    def do_POST(self):
        self._proxy_request()

    def do_PUT(self):
        self._proxy_request()

    def do_DELETE(self):
        self._proxy_request()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Connection", "close")
        self.send_header("Content-Length", "0")
        self.end_headers()
        self.close_connection = True

    def _proxy_request(self):
        client_ip = self.client_address[0]
        target = next_upstream(client_ip)
        target_url = f"{target}{self.path}"

        body = None
        content_length = self.headers.get("Content-Length")
        if content_length:
            try:
                body = self.rfile.read(int(content_length))
            except ValueError:
                body = b""

        headers = {k: v for k, v in self.headers.items() if k.lower() not in {"host", "content-length", "connection"}}
        headers["Host"] = target.split("//")[-1]
        headers["Connection"] = "close"

        try:
            req = urllib_request.Request(target_url, data=body, headers=headers, method=self.command)
            with urllib_request.urlopen(req, timeout=30) as resp:
                payload = resp.read()
                status = resp.status
                content_type = resp.headers.get_content_type()
                content_length = resp.headers.get("Content-Length")
                self.send_response(status)
                self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
                self.send_header("Connection", "close")
                if content_length is not None:
                    self.send_header("Content-Length", content_length)
                else:
                    self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                if payload:
                    self.wfile.write(payload)
                self.wfile.flush()
                self.close_connection = True
        except Exception as exc:
            payload = json.dumps({"success": False, "error": f"Backend unavailable: {exc}"}).encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Connection", "close")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            self.wfile.flush()
            self.close_connection = True

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    host = os.getenv("LB_HOST", "0.0.0.0")
    port = int(os.getenv("LB_PORT", "8080"))
    HTTPServer((host, port), ProxyHandler).serve_forever()
