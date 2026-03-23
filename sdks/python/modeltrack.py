"""
ModelTrack Python SDK - Auto-instrument LLM calls.

Usage:
    import modeltrack  # Add this one line at the top of your app

    # All Anthropic/OpenAI calls are now tracked automatically.
    # Configure via environment variables:
    #   MODELTRACK_PROXY_URL=http://localhost:8080
    #   MODELTRACK_TEAM=my-team
    #   MODELTRACK_APP=my-app
    #   MODELTRACK_FEATURE=my-feature
    #   MODELTRACK_CUSTOMER_TIER=enterprise
    #   MODELTRACK_SESSION_ID=session-123  (optional)
    #   MODELTRACK_TRACE_ID=trace-456  (optional)
    #   MODELTRACK_PROMPT_TEMPLATE=template-id  (optional)
"""

import contextlib
import logging
import os
import threading

logger = logging.getLogger("modeltrack")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_config = {
    "proxy_url": os.environ.get("MODELTRACK_PROXY_URL", "http://localhost:8080"),
    "team": os.environ.get("MODELTRACK_TEAM", ""),
    "app": os.environ.get("MODELTRACK_APP", ""),
    "feature": os.environ.get("MODELTRACK_FEATURE", ""),
    "customer_tier": os.environ.get("MODELTRACK_CUSTOMER_TIER", ""),
    "session_id": os.environ.get("MODELTRACK_SESSION_ID", ""),
    "trace_id": os.environ.get("MODELTRACK_TRACE_ID", ""),
    "prompt_template": os.environ.get("MODELTRACK_PROMPT_TEMPLATE", ""),
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
    trace_id: str = "",
    prompt_template: str = "",
) -> None:
    """Explicitly configure ModelTrack. Overrides environment variables."""
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
    if trace_id:
        _config["trace_id"] = trace_id
    if prompt_template:
        _config["prompt_template"] = prompt_template

    # Re-patch with updated config so new clients pick up the changes.
    _patch_all()


@contextlib.contextmanager
def session(session_id: str, trace_id: str = ""):
    """Context manager that tags all LLM calls within the block with a session ID.

    Usage:
        with modeltrack.session("user-query-123"):
            response = client.messages.create(...)

        with modeltrack.session("session-123", trace_id="trace-456"):
            response = client.messages.create(...)
    """
    previous_session = getattr(_local, "session_id", None)
    previous_trace = getattr(_local, "trace_id", None)
    _local.session_id = session_id
    if trace_id:
        _local.trace_id = trace_id
    try:
        yield
    finally:
        _local.session_id = previous_session
        _local.trace_id = previous_trace


# ---------------------------------------------------------------------------
# Header building
# ---------------------------------------------------------------------------

def _build_headers() -> dict:
    """Build the X-ModelTrack-* headers from current config and thread-local state."""
    headers = {}
    mapping = {
        "X-ModelTrack-Team": "team",
        "X-ModelTrack-App": "app",
        "X-ModelTrack-Feature": "feature",
        "X-ModelTrack-Customer-Tier": "customer_tier",
        "X-ModelTrack-Session-ID": "session_id",
        "X-ModelTrack-Trace-ID": "trace_id",
        "X-ModelTrack-Prompt-Template": "prompt_template",
    }
    for header, key in mapping.items():
        value = _config.get(key, "")
        if value:
            headers[header] = value

    # Thread-local session overrides the global config.
    thread_session = getattr(_local, "session_id", None)
    if thread_session:
        headers["X-ModelTrack-Session-ID"] = thread_session

    # Thread-local trace ID overrides the global config.
    thread_trace = getattr(_local, "trace_id", None)
    if thread_trace:
        headers["X-ModelTrack-Trace-ID"] = thread_trace

    return headers


# ---------------------------------------------------------------------------
# Anthropic patching
# ---------------------------------------------------------------------------

_anthropic_original_init = None


def _patch_anthropic():
    """Monkey-patch the Anthropic SDK to route through the ModelTrack proxy."""
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

        # Merge ModelTrack headers into default_headers.
        modeltrack_headers = _build_headers()
        if modeltrack_headers:
            existing = kwargs.get("default_headers") or {}
            merged = {**modeltrack_headers, **existing}
            kwargs["default_headers"] = merged

        original_init(self, *args, **kwargs)

    anthropic.Anthropic.__init__ = patched_init
    logger.info("ModelTrack: patched anthropic.Anthropic")


# ---------------------------------------------------------------------------
# OpenAI patching
# ---------------------------------------------------------------------------

_openai_original_init = None


def _patch_openai():
    """Monkey-patch the OpenAI SDK to route through the ModelTrack proxy."""
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

        # Merge ModelTrack headers into default_headers.
        modeltrack_headers = _build_headers()
        if modeltrack_headers:
            existing = kwargs.get("default_headers") or {}
            merged = {**modeltrack_headers, **existing}
            kwargs["default_headers"] = merged

        original_init(self, *args, **kwargs)

    openai.OpenAI.__init__ = patched_init
    logger.info("ModelTrack: patched openai.OpenAI")


# ---------------------------------------------------------------------------
# Auto-patch on import
# ---------------------------------------------------------------------------

def _patch_all():
    """Attempt to patch all supported LLM SDKs."""
    for patcher in (_patch_anthropic, _patch_openai):
        try:
            patcher()
        except Exception as exc:
            logger.warning("ModelTrack: failed to patch: %s", exc)


# Run automatically on import.
_patch_all()
