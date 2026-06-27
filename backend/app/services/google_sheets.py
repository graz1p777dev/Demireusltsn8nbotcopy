import json
from datetime import date, datetime
from zoneinfo import ZoneInfo

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

HEADERS = [
    "Дата", "Время", "Имя", "Телефон", "Instagram",
    "ID чата", "ID сделки", "Статус", "Источник",
    "Напоминание", "Пришёл", "Итог", "Комментарий", "Следующий шаг",
]

# Column letter helpers
_COL = {h: chr(ord("A") + i) for i, h in enumerate(HEADERS)}


def _auth_client():
    import gspread
    from google.oauth2.service_account import Credentials

    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    if settings.google_service_account_json:
        creds = Credentials.from_service_account_info(
            json.loads(settings.google_service_account_json), scopes=scopes
        )
    else:
        creds = Credentials.from_service_account_file(
            settings.google_service_account_file, scopes=scopes
        )
    return gspread.authorize(creds)


def _open_spreadsheet():
    return _auth_client().open_by_key(settings.google_sheets_spreadsheet_id)


def _sheet_name_for(date_str: str) -> str:
    month = datetime.strptime(date_str, "%d.%m.%Y").strftime("%m")
    return MONTH_SHEETS.get(month, "Записи")


def _get_or_create_worksheet(spreadsheet, name: str):
    try:
        return spreadsheet.worksheet(name)
    except Exception:
        ws = spreadsheet.add_worksheet(title=name, rows=1000, cols=len(HEADERS))
        ws.append_row(HEADERS)
        return ws


# ─── Write ────────────────────────────────────────────────────────────────────

def update_consultation_sheet(
    extracted: dict,
    lead_id: str,
    chat_id: str = "",
    instagram: str = "",
) -> dict:
    if not settings.google_sheets_enabled:
        return {"skipped": True, "reason": "google_sheets_enabled=false"}

    date_str = extracted.get("consultation_date", "")
    sheet_name = _sheet_name_for(date_str) if date_str else "Записи"
    ss = _open_spreadsheet()
    ws = _get_or_create_worksheet(ss, sheet_name)

    row = [
        date_str,
        extracted.get("consultation_time", ""),
        extracted.get("name") or "",
        extracted.get("contacts") or "",
        instagram,
        chat_id,
        lead_id,
        "Записан",
        extracted.get("consultation_format") or "Офлайн",
        "Нет",   # Напоминание
        "",      # Пришёл
        "",      # Итог
        "",      # Комментарий
        "",      # Следующий шаг
    ]
    ws.append_row(row, value_input_option="USER_ENTERED")
    return {"appended": True, "sheet": sheet_name, "row": row}


# ─── Read ─────────────────────────────────────────────────────────────────────

def _rows_for_date(date_str: str) -> tuple:
    """Returns (worksheet, list_of_row_dicts_with_row_number) for the given date."""
    ss = _open_spreadsheet()
    sheet_name = _sheet_name_for(date_str)
    try:
        ws = ss.worksheet(sheet_name)
    except Exception:
        return None, []
    all_rows = ws.get_all_records()
    matching = [
        {**r, "_row": idx + 2}
        for idx, r in enumerate(all_rows)
        if str(r.get("Дата", "")).strip() == date_str
    ]
    return ws, matching


def get_todays_consultations() -> list[dict]:
    """Returns today's consultations with Статус=Записан."""
    if not settings.google_sheets_enabled:
        return []
    today = datetime.now(ZoneInfo(settings.timezone)).strftime("%d.%m.%Y")
    try:
        ws, rows = _rows_for_date(today)
        return [
            {
                "row_number": r["_row"],
                "sheet_name": ws.title if ws else "",
                "date": r.get("Дата", ""),
                "time": r.get("Время", ""),
                "name": r.get("Имя", ""),
                "phone": r.get("Телефон", ""),
                "instagram": r.get("Instagram", ""),
                "chat_id": r.get("ID чата", ""),
                "lead_id": r.get("ID сделки", ""),
                "status": r.get("Статус", ""),
                "source": r.get("Источник", ""),
                "reminder_sent": r.get("Напоминание", "Нет"),
                "came": r.get("Пришёл", ""),
                "result": r.get("Итог", ""),
                "comment": r.get("Комментарий", ""),
            }
            for r in rows
            if r.get("Статус", "") in ("Записан", "Напомнено")
        ]
    except Exception:
        return []


def get_all_consultations_for_date(date_str: str) -> list[dict]:
    """Returns all consultations for given date (all statuses), for /consult command."""
    if not settings.google_sheets_enabled:
        return []
    try:
        ws, rows = _rows_for_date(date_str)
        return [
            {
                "row_number": r["_row"],
                "sheet_name": ws.title if ws else "",
                "date": r.get("Дата", ""),
                "time": r.get("Время", ""),
                "name": r.get("Имя", ""),
                "phone": r.get("Телефон", ""),
                "instagram": r.get("Instagram", ""),
                "chat_id": r.get("ID чата", ""),
                "lead_id": r.get("ID сделки", ""),
                "status": r.get("Статус", ""),
                "came": r.get("Пришёл", ""),
                "result": r.get("Итог", ""),
                "comment": r.get("Комментарий", ""),
            }
            for r in rows
        ]
    except Exception:
        return []


def get_past_consultations_without_result() -> list[dict]:
    """Returns past consultations (time already passed) where result (Пришёл) not yet recorded."""
    if not settings.google_sheets_enabled:
        return []
    now = datetime.now(ZoneInfo(settings.timezone))
    today = now.strftime("%d.%m.%Y")
    try:
        ws, rows = _rows_for_date(today)
        result = []
        for r in rows:
            if r.get("Статус", "") not in ("Записан", "Напомнено"):
                continue
            if r.get("Пришёл", "").strip():
                continue  # Already filled
            time_str = r.get("Время", "")
            if not time_str:
                continue
            try:
                consult_hour, consult_min = [int(x) for x in time_str.split(":")]
                consult_end = now.replace(hour=consult_hour, minute=consult_min, second=0)
                # Only check if consultation ended 30+ min ago
                if (now - consult_end).total_seconds() < 30 * 60:
                    continue
            except ValueError:
                continue
            result.append({
                "row_number": r["_row"],
                "sheet_name": ws.title if ws else "",
                "date": r.get("Дата", ""),
                "time": r.get("Время", ""),
                "name": r.get("Имя", ""),
                "phone": r.get("Телефон", ""),
                "lead_id": r.get("ID сделки", ""),
                "came": r.get("Пришёл", ""),
                "result": r.get("Итог", ""),
                "comment": r.get("Комментарий", ""),
            })
        return result
    except Exception:
        return []


# ─── Update helpers ───────────────────────────────────────────────────────────

def mark_reminder_sent(sheet_name: str, row_number: int) -> None:
    if not settings.google_sheets_enabled:
        return
    try:
        ss = _open_spreadsheet()
        ws = ss.worksheet(sheet_name)
        col_letter = _COL.get("Напоминание", "J")
        ws.update(f"{col_letter}{row_number}", [["Да"]])
        # Also update Статус to "Напомнено"
        status_col = _COL.get("Статус", "H")
        ws.update(f"{status_col}{row_number}", [["Напомнено"]])
    except Exception:
        pass


def update_came_status(sheet_name: str, row_number: int, came: str, result: str = "") -> None:
    if not settings.google_sheets_enabled:
        return
    try:
        ss = _open_spreadsheet()
        ws = ss.worksheet(sheet_name)
        came_col = _COL.get("Пришёл", "K")
        status_col = _COL.get("Статус", "H")
        ws.update(f"{came_col}{row_number}", [[came]])
        ws.update(f"{status_col}{row_number}", [["Пришёл" if came == "Да" else "Не пришёл"]])
        if result:
            result_col = _COL.get("Итог", "L")
            ws.update(f"{result_col}{row_number}", [[result]])
    except Exception:
        pass
