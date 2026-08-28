from flask import jsonify


def success(data=None, status_code=200, message=None, *, status=None, pagination=None, meta=None, **extra):
    http_status = status if status is not None else status_code
    payload = {"status": "success"}
    if message is not None:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    if meta is not None:
        payload["meta"] = meta
    if pagination is not None:
        payload["pagination"] = pagination
    payload.update(extra)
    return jsonify(payload), http_status


def error(message, status_code=400, errors=None, *, status=None, **extra):
    http_status = status if status is not None else status_code
    payload = {"status": "error", "message": message}
    if errors is not None:
        payload["errors"] = errors
    payload.update(extra)
    return jsonify(payload), http_status
