from rest_framework import serializers

# Строковые поля профиля и ограничения длины (совпадают с лимитами полей на фронтенде).
STRING_FIELDS = {
    "name": 40,
    "tagline": 120,
    "city": 80,
    "title": 30,
    "role": 20,
    "bio": 2000,
    "quote": 300,
    "theme": 40,
    "visibility": 20,
    "messages": 20,
}

# Массивы строк (выбранные системы, стили игры, жанры).
STRING_LIST_FIELDS = ("systems", "styles", "genres")
STRING_LIST_MAX_ITEMS = 30
STRING_LIST_ITEM_MAX_LENGTH = 100

# Ключи приватности (зеркало privacyFields на фронтенде).
PRIVACY_KEYS = ("online", "activity", "articles", "characters", "followers", "city")

LINK_MAX_ITEMS = 10
LINK_LABEL_MAX_LENGTH = 50
LINK_VALUE_MAX_LENGTH = 200

ALLOWED_KEYS = (
    set(STRING_FIELDS)
    | set(STRING_LIST_FIELDS)
    | {"links", "privacy", "settings"}
)


def validate_profile_data(value):
    """Проверяет структуру JSON-поля Profile.data. Возвращает очищенный dict."""
    if not isinstance(value, dict):
        raise serializers.ValidationError("Ожидается объект с полями профиля.")

    unknown = set(value) - ALLOWED_KEYS
    if unknown:
        raise serializers.ValidationError(
            f"Неизвестные поля профиля: {', '.join(sorted(unknown))}."
        )

    cleaned = {}

    for field, max_length in STRING_FIELDS.items():
        if field not in value:
            continue
        item = value[field]
        if not isinstance(item, str):
            raise serializers.ValidationError({field: "Ожидается строка."})
        if len(item) > max_length:
            raise serializers.ValidationError(
                {field: f"Не более {max_length} символов."}
            )
        cleaned[field] = item

    for field in STRING_LIST_FIELDS:
        if field not in value:
            continue
        items = value[field]
        if (
            not isinstance(items, list)
            or len(items) > STRING_LIST_MAX_ITEMS
            or any(
                not isinstance(item, str) or len(item) > STRING_LIST_ITEM_MAX_LENGTH
                for item in items
            )
        ):
            raise serializers.ValidationError(
                {field: "Ожидается список коротких строк."}
            )
        cleaned[field] = items

    if "links" in value:
        links = value["links"]
        if not isinstance(links, list) or len(links) > LINK_MAX_ITEMS:
            raise serializers.ValidationError({"links": "Ожидается список ссылок."})
        for link in links:
            if (
                not isinstance(link, dict)
                or not isinstance(link.get("label"), str)
                or not isinstance(link.get("value"), str)
                or len(link["label"]) > LINK_LABEL_MAX_LENGTH
                or len(link["value"]) > LINK_VALUE_MAX_LENGTH
            ):
                raise serializers.ValidationError(
                    {"links": "Каждая ссылка — объект вида {label, value}."}
                )
        cleaned["links"] = [
            {"label": link["label"], "value": link["value"]} for link in links
        ]

    if "privacy" in value:
        privacy = value["privacy"]
        if not isinstance(privacy, dict):
            raise serializers.ValidationError({"privacy": "Ожидается объект."})
        unknown_privacy = set(privacy) - set(PRIVACY_KEYS)
        if unknown_privacy:
            raise serializers.ValidationError(
                {"privacy": f"Неизвестные ключи: {', '.join(sorted(unknown_privacy))}."}
            )
        if any(not isinstance(flag, bool) for flag in privacy.values()):
            raise serializers.ValidationError(
                {"privacy": "Значения должны быть true/false."}
            )
        cleaned["privacy"] = privacy

    if "settings" in value:
        # Свободный namespace настроек инструментов: {"survey": {...}, ...}.
        if not isinstance(value["settings"], dict):
            raise serializers.ValidationError({"settings": "Ожидается объект."})
        cleaned["settings"] = value["settings"]

    return cleaned


class ProfileSerializer(serializers.Serializer):
    """Профиль текущего пользователя: чтение и частичное обновление data."""

    data = serializers.JSONField()
    updated_at = serializers.DateTimeField(read_only=True)

    def validate_data(self, value):
        return validate_profile_data(value)

    def update(self, instance, validated_data):
        # PATCH: новые поля накладываются поверх сохранённых, остальные не трогаем.
        instance.data = {**instance.data, **validated_data["data"]}
        instance.save(update_fields=["data", "updated_at"])
        return instance
