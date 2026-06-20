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


def sheet_name_for_date(date_value: str) -> str:
    month = datetime.strptime(date_value, "%d.%m.%Y").strftime("%m")
    return MONTH_SHEETS[month]


def update_consultation_sheet(extracted: dict, lead_id: str) -> dict:
    if not settings.google_sheets_enabled:
        return {"skipped": True, "reason": "google_sheets_enabled=false"}
    import gspread
    from google.oauth2.service_account import Credentials

    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    if settings.google_service_account_json:
        credentials = Credentials.from_service_account_info(json.loads(settings.google_service_account_json), scopes=scopes)
    else:
        credentials = Credentials.from_service_account_file(settings.google_service_account_file, scopes=scopes)
    client = gspread.authorize(credentials)
    sheet = client.open_by_key(settings.google_sheets_spreadsheet_id).worksheet(
        sheet_name_for_date(extracted["consultation_date"])
    )
    rows = sheet.get_all_records()
    row_number = None
    for index, row in enumerate(rows, start=2):
        if row.get("Дата") == extracted["consultation_date"] and row.get("Время") == extracted["consultation_time"]:
            row_number = index
            break
    if row_number is None:
        return {"updated": False, "reason": "slot row not found"}
    sheet.update(
        f"A{row_number}:G{row_number}",
        [[
            extracted["consultation_date"],
            extracted["consultation_time"],
            extracted.get("name"),
            extracted.get("consultation_format"),
            extracted.get("contacts"),
            lead_id,
            "AI",
        ]],
    )
    return {"updated": True, "row_number": row_number}
