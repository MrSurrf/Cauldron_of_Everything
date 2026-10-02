from django.conf import settings
from rest_framework.permissions import BasePermission


def email_is_allowed(email):
    """Проверяем актуальный белый список; пустой список снимает ограничение по email."""
    allowed = {value.strip().lower() for value in settings.AUTH_ALLOWED_EMAILS}
    return not allowed or email.strip().lower() in allowed


class IsSiteMember(BasePermission):
    """Материалы сайта доступны только активным пользователям из белого списка."""

    message = "Доступ к сайту временно ограничен."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.is_active
            and email_is_allowed(user.email)
        )
