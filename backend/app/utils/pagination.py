from flask import request

from app.extensions import db

DEFAULT_PAGE = 1
DEFAULT_PER_PAGE = 10
MAX_PER_PAGE = 100


def pagination_arguments(default_per_page=DEFAULT_PER_PAGE, max_per_page=MAX_PER_PAGE):
    def as_int(value, fallback):
        try:
            return int(value)
        except (TypeError, ValueError):
            return fallback

    page = max(as_int(request.args.get("page"), DEFAULT_PAGE), 1)
    per_page = as_int(request.args.get("per_page"), default_per_page)
    per_page = min(max(per_page, 1), max_per_page)
    return page, per_page


pagination_params = pagination_arguments


def paginate(select, serialize=lambda item: item, default_per_page=DEFAULT_PER_PAGE):
    page, per_page = pagination_arguments(default_per_page)
    result = db.paginate(select, page=page, per_page=per_page, error_out=False)
    items = [serialize(item) for item in result.items]
    meta = {
        "page": result.page,
        "per_page": result.per_page,
        "total": result.total,
        "pages": result.pages,
        "has_next": result.has_next,
        "has_prev": result.has_prev,
        "has_previous": result.has_prev,
    }
    return items, meta
