"""CORS origin resolution for the Flask API.

The frontend is deployed separately from the API, so the browser sends an
``Origin`` header on every request. Flask-CORS only echoes
``Access-Control-Allow-Origin`` when the origin matches one of the
configured values, so an incorrect entry here is what makes a perfectly
healthy backend look like "Failed to fetch" in the browser.

Two details matter and are easy to get wrong:

* ``https://*.netlify.app`` is **not** a wildcard for Flask-CORS. It is
  compiled as a regular expression (``*`` applies to the preceding ``/``)
  and therefore never matches ``https://my-site.netlify.app``. Wildcards are
  converted into a proper anchored pattern here instead.
* An empty origin list must never fall back to ``*`` while credentials are
  enabled, because the CORS spec forbids that combination.
"""

import re

from config import DEFAULT_DEV_ORIGINS

# The Netlify-hosted frontend. `*` is expanded into an anchored regex.
NETLIFY_APP_ORIGIN = "https://*.netlify.app"

PLACEHOLDER_ORIGINS = ("your-netlify-site", "your-render-service", "example.com")


def _wildcard_to_regex(origin):
    """Convert an origin that contains ``*`` into an anchored regex pattern."""
    pieces = []
    for index, chunk in enumerate(origin.split("*")):
        if index:
            pieces.append(r"[^/]*")
        pieces.append(re.escape(chunk))
    return re.compile("^" + "".join(pieces) + "$", re.IGNORECASE)


def parse_origin_entry(entry):
    entry = (entry or "").strip()
    if not entry:
        return None
    if "*" in entry:
        return _wildcard_to_regex(entry)
    return entry


def build_cors_origins(raw_value, include_netlify_default=True):
    """Build the list of allowed origins from the ``CORS_ORIGINS`` setting.

    Explicit configuration always wins. When nothing is configured the
    local development servers and the Netlify-hosted frontend are allowed so
    a fresh deployment is not dead on arrival; production deployments should
    set ``CORS_ORIGINS`` to the exact frontend origin.
    """
    entries = [parse_origin_entry(item) for item in (raw_value or "").split(",")]
    entries = [entry for entry in entries if entry]

    if entries:
        return entries

    origins = list(DEFAULT_DEV_ORIGINS)
    if include_netlify_default:
        origins.append(_wildcard_to_regex(NETLIFY_APP_ORIGIN))
    return origins


def describe_cors_origins(origins):
    """Human readable description of the configured origins (for startup logs)."""
    described = []
    for origin in origins or []:
        if isinstance(origin, re.Pattern):
            described.append(origin.pattern)
        else:
            described.append(str(origin))
    return described


def contains_placeholder(origin):
    lowered = (origin or "").lower()
    return any(marker in lowered for marker in PLACEHOLDER_ORIGINS)
