import json
import logging

from apps.core.logging import JsonFormatter


def test_json_formatter_emits_stable_structured_fields():
    record = logging.LogRecord(
        name="apps.core",
        level=logging.INFO,
        pathname=__file__,
        lineno=10,
        msg="service ready",
        args=(),
        exc_info=None,
    )

    payload = json.loads(JsonFormatter().format(record))

    assert payload["level"] == "INFO"
    assert payload["logger"] == "apps.core"
    assert payload["message"] == "service ready"
    assert "timestamp" in payload
