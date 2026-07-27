import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_submission_notification(submission):
    """Отправляет email-уведомление о новом прохождении анкеты."""

    notification_emails = [
        email.strip()
        for email in settings.NOTIFICATION_EMAIL.split(",")
        if email.strip()
    ]
    required = [
        settings.EMAIL_HOST,
        settings.EMAIL_HOST_USER,
        settings.EMAIL_HOST_PASSWORD,
        notification_emails,
    ]
    if not all(required):
        logger.warning("Email notification skipped: SMTP not fully configured")
        return

    answers_lines = []
    for key, value in submission.answers.items():
        answers_lines.append(f"{key}: {value}")
    answers_text = "\n".join(answers_lines) if answers_lines else "—"

    subject = f"Новый результат анкеты от {submission.player_name}"
    message = (
        f"Участник: {submission.player_name}\n"
        f"Персонаж: {submission.character_name or '—'}\n"
        f"Время: {submission.created_at:%d.%m.%Y %H:%M}\n"
        f"\n"
        f"Ответы:\n"
        f"{answers_text}"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=notification_emails,
            fail_silently=False,
        )
    except Exception as exc:
        logger.exception("Failed to send email notification: %s", exc)
