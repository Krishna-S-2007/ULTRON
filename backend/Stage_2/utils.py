"""
utils.py — Domain blocklist, domain parsing helpers, and content length checkers.
"""

from urllib.parse import urlparse

# Domain blocklist as spec'd in flowpath.md / backend.md
BLOCKED_DOMAINS: set[str] = {
    "tiktok.com",
    "pinterest.com",
    "quora.com"
}


def get_domain(url: str) -> str:
    """Extract domain from a URL (e.g. https://www.google.com/search -> google.com)."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain
    except Exception:
        return ""


def is_blocked(url: str) -> bool:
    """Return True if the URL domain is in the blocklist or a subdomain of a blocked domain."""
    domain = get_domain(url)
    if not domain:
        return True  # If we can't parse it, treat it as blocked/invalid
    for blocked in BLOCKED_DOMAINS:
        if domain == blocked or domain.endswith("." + blocked):
            return True
    return False
