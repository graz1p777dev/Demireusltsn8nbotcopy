import json
from datetime import datetime

from app.core.config import settings

MONTH_SHEETS = {
    "01": "Записи-январь",
    "02": "Записи-февраль",
    "03": "Записи-март",
    "04": "Записи-апрель",
    "05": "Записи-май",
    "06": "Записи-июнь",
    "07": "Записи-июль",
    "08": "Записи-август",
    "09": "Записи-сентябрь",
    "10": "Записи-октябрь",
    "11": "Записи-ноябрь",
    "12": "Записи-декабрь",
}

HEADERS = ["Дата", "Время", "Имя", "Телефон", "Формат", "Lead ID", "Источник"]


def _get_or_create_worksheet(spreadsheet, name: str):
    try:
        return spreadsheet.worksheet(name)
    except Exception:
        ws = spreadsheet.add_worksheet(title=name, rows=1000, cols=len(HEADERS))
        ws.append_row(HEADERS)
        return ws


def update_consultation_sheet(extracted: dict, lead_id: str) -> dict:
    if not settings.google_sheets_enabled:
        return {"skipped": True, "reason": "google_sheets_enabled=false"}

    import gspread
    from google.oauth2.service_account import Credentials

    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    if settings.google_service_account_json:
        credentials = Credentials.from_service_account_info(
            json.loads(settings.google_service_account_json), scopes=scopes
        )
    else:
        credentials = Credentials.from_service_account_file(
            settings.google_service_account_file, scopes=scopes
        )

    client = gspread.authorize(credentials)
    spreadsheet = client.open_by_key(settings.google_sheets_spreadsheet_id)

    date_str = extracted.get("consultation_date", "")
    month = datetime.strptime(date_str, "%d.%m.%Y").strftime("%m") if date_str else None
    sheet_name = MONTH_SHEETS.get(month, "Записи") if month else "Записи"
    ws = _get_or_create_worksheet(spreadsheet, sheet_name)

    row = [
        date_str,
        extracted.get("consultation_time", ""),
        extracted.get("name") or "",
        extracted.get("contacts") or "",
        extracted.get("consultation_format") or "Офлайн",
        lead_id,
        "AI Bot",
    ]
    ws.append_row(row, value_input_option="USER_ENTERED")
    return {"appended": True, "sheet": sheet_name, "row": row}
