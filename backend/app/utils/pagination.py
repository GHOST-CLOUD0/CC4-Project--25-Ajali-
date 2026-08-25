from flask import request


DEFAULT_PER_PAGE = 20
MAX_PER_PAGE = 100


def pagination_arguments():
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = request.args.get("per_page", DEFAULT_PER_PAGE, type=int)
    return page, min(max(per_page, 1), MAX_PER_PAGE)


def paginate(query):
    page, per_page = pagination_arguments()
    result = query.paginate(page=page, per_page=per_page, error_out=False)
    return result, {
        "page": result.page,
        "per_page": result.per_page,
        "total": result.total,
        "pages": result.pages,
        "has_next": result.has_next,
        "has_previous": result.has_prev,
    }
