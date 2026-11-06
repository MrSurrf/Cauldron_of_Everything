"""Нормализация школы заклинания при импорте энциклопедии."""

import re
import unicodedata
from typing import Any


SPELL_SCHOOL_LABELS = {
    "abjuration": "Ограждение",
    "conjuration": "Вызов",
    "divination": "Прорицание",
    "enchantment": "Очарование",
    "evocation": "Воплощение",
    "illusion": "Иллюзия",
    "necromancy": "Некромантия",
    "transmutation": "Преобразование",
}

_ALIASES = {
    "abjuration": "abjuration",
    "ограждение": "abjuration",
    "ограждения": "abjuration",
    "преграждение": "abjuration",
    "преграждения": "abjuration",
    "conjuration": "conjuration",
    "вызов": "conjuration",
    "вызова": "conjuration",
    "призыв": "conjuration",
    "призывание": "conjuration",
    "divination": "divination",
    "прорицание": "divination",
    "прорицания": "divination",
    "предсказание": "divination",
    "enchantment": "enchantment",
    "очарование": "enchantment",
    "очарования": "enchantment",
    "evocation": "evocation",
    "воплощение": "evocation",
    "воплощения": "evocation",
    "эвокация": "evocation",
    "illusion": "illusion",
    "иллюзия": "illusion",
    "иллюзии": "illusion",
    "necromancy": "necromancy",
    "некромантия": "necromancy",
    "некромантии": "necromancy",
    "transmutation": "transmutation",
    "преобразование": "transmutation",
    "преобразования": "transmutation",
    "превращение": "transmutation",
    "превращения": "transmutation",
    "трансмутация": "transmutation",
}


def _display_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        for key in ("name", "title", "label", "value", "index", "key"):
            text = _display_text(value.get(key))
            if text:
                return text
    if isinstance(value, (list, tuple)):
        for item in value:
            text = _display_text(item)
            if text:
                return text
    return ""


def _school_key(value: str) -> str:
    key = unicodedata.normalize("NFKC", value).strip().lower().replace("ё", "е")
    key = re.sub(r"^школа\s*:?\s*", "", key)
    key = re.sub(r"^school\s+(?:of\s+)?", "", key)
    return re.sub(r"\s+", " ", key)


def normalize_spell_school(value: Any) -> Any:
    """Канонизирует восемь базовых школ, сохраняя неизвестное значение."""
    text = _display_text(value)
    if not text:
        return value
    candidates = [text, *re.split(r"[()[\]{}/,;|]+", text)]
    for candidate in candidates:
        school = _ALIASES.get(_school_key(candidate))
        if school:
            return SPELL_SCHOOL_LABELS[school]
    return text
