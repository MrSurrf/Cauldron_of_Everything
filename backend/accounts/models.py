from django.contrib.auth.models import User
from django.db import models


class Profile(models.Model):
    """
    Профиль и настройки аккаунта.

    Все пользовательские данные (имя, био, приватность, настройки инструментов)
    хранятся в JSON-поле data: состав полей часто меняется, строгая схема не нужна.
    Структуру data валидирует accounts.serializers.ProfileSerializer.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "профиль"
        verbose_name_plural = "профили"

    def __str__(self):
        return f"Профиль {self.user.username}"
