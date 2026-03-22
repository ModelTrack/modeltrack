"""
CostTrack Python SDK - Auto-instrument LLM calls.

Usage:
    import costtrack  # Add this one line at the top of your app

    # All Anthropic/OpenAI calls are now tracked automatically.
    # Configure via environment variables:
    #   COSTTRACK_PROXY_URL=http://localhost:8080
    #   COSTTRACK_TEAM=my-team
    #   COSTTRACK_APP=my-app
    #   COSTTRACK_FEATURE=my-feature
    #   COSTTRACK_CUSTOMER_TIER=enterprise
    #   COSTTRACK_SESSION_ID=session-123  (optional)
"""

import contextlib
import logging
import os
import threading

logger = logging.getLogger("costtrack")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_config = {
    "proxy_url": os.environ.get("COSTTRACK_PROXY_URL", "http://localhost:8080"),
    "team": os.environ.get("COSTTRACK_TEAM", ""),
    "app": os.environ.get("COSTTRACK_APP", ""),
    "feature": os.environ.get("COSTTRACK_FEATURE", ""),
    "customer_tier": os.environ.get("COSTTRACK_CUSTOMER_TIER", ""),
    "session_id": os.environ.get("COSTTRACK_SESSION_ID", ""),
}

# Thread-local storage for session context.
_local = threading.local()


def configure(
    proxy_url: str = "",
    team: str = "",
    app: str = "",
    feature: str = "",
    customer_tier: str = "",
    session_id: str = "",
) -> None:
    """Explicitly configure CostTrack. Overrides environment variables."""
    if proxy_url:
        _config["proxy_url"] = proxy_url
    if team:
        _config["team"] = team
    if app:
        _config["app"] = app
    if feature:
        _config["feature"] = feature
    if customer_tier:
        _config["customer_tier"] = customer_tier
    if session_id:
        _config["session_id"] = session_id

    # Re-patch with updated config so new clients pick up the changes.
    _patch_all()


@contextlib.contextmanager
def session(session_id: str):
    """Context manager that tags all LLM calls within the block with a session ID.

    Usage:
        with costtrack.session("user-query-123"):
            response = client.messages.create(...)
    """
    previous = getattr(_local, "session_id", None)
    _local.session_id = session_id
    try:
        yield
    finally:
        _local.session_id = previous


# ---------------------------------------------------------------------------
# Header building
# ---------------------------------------------------------------------------

def _build_headers() -> dict:
    """Build the X-CostTrack-* headers from current config and thread-local state."""
    headers = {}
    mapping = {
        "X-CostTrack-Team": "team",
        "X-CostTrack-App": "app",
        "X-CostTrack-Feature": "feature",
        "X-CostTrack-Customer-Tier": "customer_tier",
        "X-CostTrack-Session-ID": "session_id",
    }
    for header, key in mapping.items():
        value = _config.get(key, "")
        if value:
            headers[header] = value

    # Thread-local session overrides the global config.
    thread_session = getattr(_local, "session_id", None)
    if thread_session:
        headers["X-CostTrack-Session-ID"] = thread_session

    return headers


# ---------------------------------------------------------------------------
# Anthropic patching
# ---------------------------------------------------------------------------

_anthropic_original_init = None


def _patch_anthropic():
    """Monkey-patch the Anthropic SDK to route through the CostTrack proxy."""
    global _anthropic_original_init

    try:
        import anthropic
    except ImportError:
        logger.debug("anthropic package not installed, skipping patch")
        return

    if _anthropic_original_init is None:
        _anthropic_original_init = anthropic.Anthropic.__init__

    original_init = _anthropic_original_init

    def patched_init(self, *args, **kwargs):
        # Set base_url to proxy unless the caller explicitly provided one.
        if "base_url" not in kwargs:
            proxy = _config["proxy_url"].rstrip("/")
            kwargs["base_url"] = proxy + "/"

        # Merge CostTrack headers into default_headers.
        costtrack_headers = _build_headers()
        if costtrack_headers:
            existing = kwargs.get("default_headers") or {}
            merged = {**costtrack_headers, **existing}
            kwargs["default_headers"] = merged

        original_init(self, *args, **kwargs)

    anthropic.Anthropic.__init__ = patched_init
    logger.info("CostTrack: patched anthropic.Anthropic")


# ---------------------------------------------------------------------------
# OpenAI patching
# ---------------------------------------------------------------------------

_openai_original_init = None


def _patch_openai():
    """Monkey-patch the OpenAI SDK to route through the CostTrack proxy."""
    global _openai_original_init

    try:
        import openai
    except ImportError:
        logger.debug("openai package not installed, skipping patch")
        return

    if _openai_original_init is None:
        _openai_original_init = openai.OpenAI.__init__

    original_init = _openai_original_init

    def patched_init(self, *args, **kwargs):
        # Set base_url to proxy unless the caller explicitly provided one.
        if "base_url" not in kwargs:
            proxy = _config["proxy_url"].rstrip("/")
            kwargs["base_url"] = proxy + "/"

        # Merge CostTrack headers into default_headers.
        costtrack_headers = _build_headers()
        if costtrack_headers:
            existing = kwargs.get("default_headers") or {}
            merged = {**costtrack_headers, **existing}
            kwargs["default_headers"] = merged

        original_init(self, *args, **kwargs)

    openai.OpenAI.__init__ = patched_init
    logger.info("CostTrack: patched openai.OpenAI")


# ---------------------------------------------------------------------------
# Auto-patch on import
# ---------------------------------------------------------------------------

def _patch_all():
    """Attempt to patch all supported LLM SDKs."""
    for patcher in (_patch_anthropic, _patch_openai):
        try:
            patcher()
        except Exception as exc:
            logger.warning("CostTrack: failed to patch: %s", exc)


# Run automatically on import.
_patch_all()
