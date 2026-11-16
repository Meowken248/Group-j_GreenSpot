"""Readable validation errors for the twelve community and reporting features."""
from fastapi import Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

FEATURE_PATHS = (
    "/posts", "/comments", "/chat", "/groups", "/birthday", "/incidents",
    "/offline", "/fundraisers", "/events", "/waste-categories",
    "/recycling-facilities", "/ai/chatbot",
)
LABELS = {
    "name": "Tên", "title": "Tiêu đề", "content": "Nội dung",
    "description": "Mô tả", "message": "Lời nhắn", "question": "Câu hỏi",
    "category_code": "Mã danh mục", "category_id": "Danh mục rác",
    "default_severity": "Mức ưu tiên", "severity": "Mức khẩn cấp",
    "sla_hours": "Thời hạn SLA", "sla_warning_hours": "Thời gian cảnh báo",
    "unit_id": "Quận/huyện", "address": "Địa chỉ", "address_text": "Địa chỉ",
    "latitude": "Vĩ độ", "longitude": "Kinh độ", "version": "Phiên bản dữ liệu",
    "updated_at": "Phiên bản dữ liệu", "accepted_waste_types": "Loại rác tiếp nhận",
    "open_time": "Giờ mở cửa", "close_time": "Giờ đóng cửa", "page": "Trang",
    "limit": "Số mục mỗi trang", "amount": "Số tiền", "max_participants": "Số người tham gia",
    "start_time": "Thời gian bắt đầu", "end_time": "Thời gian kết thúc",
}


def validation_message(error: dict) -> str:
    field = next((p for p in reversed(error.get("loc", ())) if isinstance(p, str)), "")
    label = LABELS.get(field, "Dữ liệu")
    kind, ctx = error["type"], error.get("ctx", {})
    if kind == "value_error":
        return error["msg"].removeprefix("Value error, ")
    if field in {"version", "updated_at"}:
        return "Phiên bản dữ liệu không hợp lệ. Vui lòng tải lại trang trước khi cập nhật."
    if kind == "missing":
        return f"{label}: vui lòng nhập hoặc chọn giá trị."
    if kind in {"string_too_long", "too_long"}:
        return f"{label}: tối đa {ctx.get('max_length', '')} {'ký tự' if kind == 'string_too_long' else 'mục'}."
    if kind in {"string_too_short", "too_short"}:
        return f"{label}: cần ít nhất {ctx.get('min_length', 1)} {'ký tự' if kind == 'string_too_short' else 'mục'}."
    if kind in {"int_parsing", "int_type", "int_from_float"}:
        return f"{label}: vui lòng nhập số nguyên bằng chữ số 0–9."
    if kind in {"float_parsing", "float_type", "finite_number"}:
        return f"{label}: vui lòng nhập số hợp lệ bằng chữ số 0–9."
    if kind in {"greater_than_equal", "less_than_equal", "greater_than", "less_than"}:
        bounds = {"greater_than_equal": ("từ", "ge"), "less_than_equal": ("không quá", "le"),
                  "greater_than": ("lớn hơn", "gt"), "less_than": ("nhỏ hơn", "lt")}
        word, key = bounds[kind]
        return f"{label}: giá trị phải {word} {ctx.get(key, '')}."
    if kind in {"enum", "literal_error"}:
        return f"{label}: vui lòng chọn giá trị hợp lệ trong danh sách."
    return f"{label}: giá trị không hợp lệ. Vui lòng kiểm tra lại."


async def crud_validation_error_handler(request: Request, exc: RequestValidationError):
    path = request.url.path.removeprefix("/api/v1")
    if not any(path == p or path.startswith(p + "/") for p in FEATURE_PATHS):
        return await request_validation_exception_handler(request, exc)
    errors = exc.errors()
    if any(e.get("loc", (None,))[0] == "path" for e in errors):
        return JSONResponse(status_code=404, content={"detail": "Không tìm thấy trang hoặc dữ liệu bạn yêu cầu."})
    messages = list(dict.fromkeys(validation_message(e) for e in errors))
    return JSONResponse(status_code=422, content={"detail": "\n".join(messages)})
