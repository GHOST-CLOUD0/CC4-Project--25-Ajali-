from flask import jsonify


def success(data=None, status_code=200, **extra):
    payload = {"status": "success", **extra}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code


def error(message, status_code=400, **extra):
    return jsonify(status="error", message=message, **extra), status_code
