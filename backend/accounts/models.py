import uuid

from django.contrib.auth.models import User
from django.db import models


def portrait_upload_path(instance, filename):
    """Уникальное имя на каждую загрузку: URL меняется вместе с файлом,
    поэтому браузер не показывает старую картинку из кэша."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    return f"accounts/portraits/user_{instance.user_id}/{name}"


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
    portrait = models.ImageField(
        upload_to=portrait_upload_path,
        blank=True,
        null=True,
        verbose_name="аватар",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "профиль"
        verbose_name_plural = "профили"

    def __str__(self):
        return f"Профиль {self.user.username}"
