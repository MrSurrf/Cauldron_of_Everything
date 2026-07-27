import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage"


def send_submission_notification(submission):
    """Отправляет уведомление в Telegram о новом прохождении анкеты."""

    token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
    chat_id = getattr(settings, "TELEGRAM_CHAT_ID", None)

    if not token or not chat_id:
        logger.warning("Telegram notification skipped: token or chat_id not configured")
        return

    answers_lines = []
    for key, value in submission.answers.items():
        answers_lines.append(f"• {key}: {value}")

    answers_text = "\n".join(answers_lines) if answers_lines else "—"

    message = (
        f"📝 Новый результат анкеты\n"
        f"\n"
        f"👤 Участник: {submission.player_name}\n"
        f"🧙 Персонаж: {submission.character_name or '—'}\n"
        f"🕐 Время: {submission.created_at:%d.%m.%Y %H:%M}\n"
        f"\n"
        f"Ответы:\n"
        f"{answers_text}"
    )

    url = TELEGRAM_API_URL.format(token=token)
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.exception("Failed to send Telegram notification: %s", exc)
