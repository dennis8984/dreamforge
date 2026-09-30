#!/usr/bin/env python3
"""Bearer-token reverse proxy for the greeter pod.

Binds one public port and forwards only the narration and conversation apps.
The LTX gateway, TTS engine, and LLM stay on localhost.
"""

from __future__ import annotations

import hmac
import os
import sys
from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROUTES = {
    "/narration": os.environ.get("NARRATION_UPSTREAM", "http://127.0.0.1:8782"),
    "/conversation": os.environ.get("CONVERSATION_UPSTREAM", "http://127.0.0.1:8791"),
}

MAX_BODY = 25_000_000
HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "authorization",
    "content-length",
}


def token() -> str:
    value = os.environ.get("GREETER_API_TOKEN", "").strip()
    if not value:
        sys.exit("GREETER_API_TOKEN is required. Refusing to listen without it.")
    return value


SECRET = token()


def match(path: str) -> tuple[str, str] | None:
    for prefix, origin in ROUTES.items():
        if path == prefix or path.startswith(prefix + "/"):
            rest = path[len(prefix):] or "/"
            return origin, rest
    return None


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self) -> None:
        self._proxy()

    def do_POST(self) -> None:
        self._proxy()

    def do_PATCH(self) -> None:
        self._proxy()

    def do_DELETE(self) -> None:
        self._proxy()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _authorized(self) -> bool:
        header = self.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return False
        given = header[7:].strip()
        return hmac.compare_digest(given, SECRET)

    def _proxy(self) -> None:
        if not self._authorized():
            body = b'{"error":"unauthorized"}\n'
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        parts = urlsplit(self.path)
        found = match(parts.path)
        if found is None:
            body = b'{"error":"not found"}\n'
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        origin, rest = found
        upstream = urlsplit(origin)
        target = rest
        if parts.query:
            target = f"{target}?{parts.query}"

        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > MAX_BODY:
            self.send_error(413)
            return
        payload = self.rfile.read(length) if length else b""

        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in HOP
        }
        if payload:
            headers["Content-Length"] = str(len(payload))

        conn = HTTPConnection(upstream.hostname or "127.0.0.1", upstream.port or 80, timeout=300)
        try:
            conn.request(self.command, target, body=payload, headers=headers)
            response = conn.getresponse()
            self.send_response(response.status)
            for key, value in response.getheaders():
                if key.lower() in HOP:
                    continue
                self.send_header(key, value)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            while True:
                chunk = response.read(64 * 1024)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
        except Exception as exc:  # upstream down
            if not self.wfile.closed:
                message = f'{{"error":"upstream unavailable","detail":"{exc}"}}\n'.encode()
                try:
                    self.send_response(502)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(message)))
                    self.end_headers()
                    self.wfile.write(message)
                except Exception:
                    pass
        finally:
            conn.close()


def main() -> None:
    host = os.environ.get("PROXY_HOST", "0.0.0.0")
    port = int(os.environ.get("PROXY_PORT", "8790"))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"greeter proxy listening on {host}:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
