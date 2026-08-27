from flask import jsonify


def success(data=None, status_code=200, message=None, pagination=None):
    payload = {"status": "success"}
    if message is not None:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    if pagination is not None:
        payload["pagination"] = pagination
    return jsonify(payload), status_code


def error(message, status_code=400, errors=None):
    payload = {"status": "error", "message": message}
    if errors is not None:
        payload["errors"] = errors
    return jsonify(payload), status_code
def success(data=None, status_code=200, **extra):
    payload = {"status": "success", **extra}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code


def error(message, status_code=400, **extra):
    return jsonify(status="error", message=message, **extra), status_code
