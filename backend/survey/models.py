from django.conf import settings
from django.db import models


class Question(models.Model):
    """Вопрос анкеты."""

    text = models.CharField("Текст вопроса", max_length=255)
    image = models.ImageField(
        "Картинка", upload_to="survey/", blank=True, null=True
    )
    order = models.PositiveIntegerField("Порядок", default=0)
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Вопрос"
        verbose_name_plural = "Вопросы"

    def __str__(self):
        return self.text


class Choice(models.Model):
    """Вариант ответа на вопрос."""

    question = models.ForeignKey(
        Question,
        related_name="choices",
        on_delete=models.CASCADE,
        verbose_name="Вопрос",
    )
    text = models.CharField("Текст варианта", max_length=255)
    image = models.ImageField(
        "Картинка", upload_to="survey/", blank=True, null=True
    )
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Вариант ответа"
        verbose_name_plural = "Варианты ответов"

    def __str__(self):
        return self.text


class Answer(models.Model):
    """Ответ пользователя на вопрос (один ответ на вопрос, перезаписывается)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="answers",
        on_delete=models.CASCADE,
        verbose_name="Пользователь",
    )
    question = models.ForeignKey(
        Question,
        related_name="answers",
        on_delete=models.CASCADE,
        verbose_name="Вопрос",
    )
    choice = models.ForeignKey(
        Choice,
        related_name="answers",
        on_delete=models.CASCADE,
        verbose_name="Выбранный вариант",
    )
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        ordering = ["question__order", "question_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "question"], name="unique_answer_per_question"
            )
        ]
        verbose_name = "Ответ"
        verbose_name_plural = "Ответы"

    def __str__(self):
        return f"{self.user} — {self.question} → {self.choice}"


class SurveySubmission(models.Model):
    """Результат прохождения анкеты целиком (сырой формат от фронтенда)."""

    survey_id = models.CharField("ID анкеты", max_length=50)
    player_name = models.CharField("Имя участника", max_length=50)
    answers = models.JSONField("Ответы")  # {"question_id": значение}
    created_at = models.DateTimeField("Пройдена", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Результат анкеты"
        verbose_name_plural = "Результаты анкет"

    def __str__(self):
        return f"{self.player_name} — {self.survey_id} ({self.created_at:%d.%m.%Y %H:%M})"
