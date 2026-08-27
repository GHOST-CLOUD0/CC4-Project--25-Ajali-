from flask import request


def paginate(query, default_per_page=10, max_per_page=100):
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", default_per_page, type=int)
    per_page = min(max(per_page, 1), max_per_page)
    page = max(page, 1)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    meta = {
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
    }
    return pagination, meta
