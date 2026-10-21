"""A small fixed-window rate limiter used by the authentication endpoints.

The API runs as a stateless Flask app, so the counter lives in the worker
process. That is good enough to blunt credential stuffing and accidental
retry storms; it is not a replacement for a shared store when several
instances run at once.

Failed sign-ins are counted per client address. Successful sign-ins reset the
counter, so a shared classroom IP is never punished for signing in correctly.
"""

import threading
import time
from collections import defaultdict


class FixedWindowRateLimiter:
    def __init__(self, limit, window_seconds):
        self.limit = int(limit or 0)
        self.window_seconds = int(window_seconds or 0)
        self._hits = defaultdict(list)
        self._lock = threading.Lock()

    @property
    def enabled(self):
        return self.limit > 0 and self.window_seconds > 0

    def peek(self, key):
        """Return ``(allowed, retry_after_seconds)`` without recording a hit."""
        if not self.enabled:
            return True, 0

        now = time.time()
        with self._lock:
            bucket = [stamp for stamp in self._hits[key] if now - stamp < self.window_seconds]
            self._hits[key] = bucket

            if len(bucket) >= self.limit:
                retry_after = int(self.window_seconds - (now - bucket[0])) + 1
                return False, max(retry_after, 1)

        return True, 0

    def record(self, key):
        """Record one failed attempt for the given key."""
        if not self.enabled:
            return

        now = time.time()
        with self._lock:
            bucket = [stamp for stamp in self._hits[key] if now - stamp < self.window_seconds]
            bucket.append(now)
            self._hits[key] = bucket

            if len(self._hits) > 2048:
                self._prune(now)

    def reset(self, key):
        with self._lock:
            self._hits.pop(key, None)

    def _prune(self, now):
        for key in list(self._hits.keys()):
            bucket = [stamp for stamp in self._hits[key] if now - stamp < self.window_seconds]
            if bucket:
                self._hits[key] = bucket
            else:
                self._hits.pop(key, None)
