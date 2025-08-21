from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time

class SimpleRateLimiter(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 10, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients = {}

    async def dispatch(self, request: Request, call_next):
        import os
        client_ip = request.client.host
        env = os.getenv("ENV", "production").lower()
        # Skip rate limiting for localhost or if ENV=development
        if client_ip in ("127.0.0.1", "::1") or env == "development":
            return await call_next(request)
        now = time.time()
        window = int(now // self.window_seconds)
        key = f"{client_ip}:{window}"
        self.clients.setdefault(key, 0)
        self.clients[key] += 1
        if self.clients[key] > self.max_requests:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
        response = await call_next(request)
        return response
