from django.db import models


class Entity(models.Model):
    """Сущность энциклопедии (заклинание, существо, предмет и т.д.)."""

    class Type(models.TextChoices):
        SPELL = "spell", "Заклинание"
        CREATURE = "creature", "Существо"
        ITEM = "item", "Предмет"
        CLASS = "class", "Класс"
        RACE = "race", "Раса"
        FEAT = "feat", "Черта"
        BACKGROUND = "background", "Предыстория"
        SIDEKICK = "sidekick", "Сайдкик"

    entity_type = models.CharField(
        "Тип", max_length=20, choices=Type.choices, db_index=True
    )
    # Имя НЕ уникально: в датасете встречаются повторы.
    name = models.CharField("Название", max_length=255, db_index=True)
    name_en = models.CharField(
        "Название (англ.)", max_length=255, blank=True, default=""
    )
    slug = models.SlugField("Слаг", max_length=280, unique=True)
    sources = models.JSONField("Источники", default=list)
    content_html = models.TextField("HTML карточки")
    content_text = models.TextField("Текст для поиска")
    # Специфичные поля типа + tables/sections/tooltips/interactive_blocks.
    data = models.JSONField("Данные типа", default=dict)
    created_at = models.DateTimeField("Создана", auto_now_add=True)

    class Meta:
        ordering = ["entity_type", "name", "id"]
        verbose_name = "Сущность энциклопедии"
        verbose_name_plural = "Сущности энциклопедии"

    def __str__(self):
        return f"{self.get_entity_type_display()}: {self.name}"


class EntityLink(models.Model):
    """Связь между сущностями по нашим ID."""

    from_entity = models.ForeignKey(
        Entity,
        related_name="links",
        on_delete=models.CASCADE,
        verbose_name="От сущности",
    )
    to_entity = models.ForeignKey(
        Entity,
        related_name="linked_from",
        on_delete=models.CASCADE,
        verbose_name="К сущности",
    )
    text = models.CharField("Текст ссылки", max_length=255, blank=True, default="")

    class Meta:
        ordering = ["from_entity_id", "to_entity_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["from_entity", "to_entity", "text"],
                name="unique_entity_link",
            )
        ]
        verbose_name = "Связь сущностей"
        verbose_name_plural = "Связи сущностей"

    def __str__(self):
        return f"{self.from_entity} → {self.to_entity}"
