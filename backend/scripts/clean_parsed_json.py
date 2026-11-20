"""Очистка parsed JSON от технических полей и внешних URL источника.

Удаляет:
- source_url, raw_file
- absolute_url, target_section, target_id, href из links-массивов
- data-source-href из HTML
- чистые URL внешнего источника из текста HTML

Сохраняет:
- source_key, source_id (нужны для импортера)
- target_key, target_type, text в links (нужны для импортера)
"""

import json
import re
from pathlib import Path

EXTERNAL_URL_RE = re.compile(r"https?://[^\s\"<>]*", re.IGNORECASE)
DATA_SOURCE_HREF_RE = re.compile(r'\sdata-source-href="[^"]*"', re.IGNORECASE)


def clean_html_string(html: str) -> str:
    if not isinstance(html, str):
        return html
    html = DATA_SOURCE_HREF_RE.sub("", html)
    html = EXTERNAL_URL_RE.sub("", html)
    return html


def clean_links(links: list | None) -> list | None:
    if not isinstance(links, list):
        return links
    cleaned = []
    for link in links:
        if not isinstance(link, dict):
            continue
        cleaned_link = {
            key: value
            for key, value in link.items()
            if key in {"text", "target_key", "target_type", "title"}
        }
        if cleaned_link:
            cleaned.append(cleaned_link)
    return cleaned


def clean_value(value):
    if isinstance(value, str):
        return clean_html_string(value)
    if isinstance(value, list):
        return [clean_value(item) for item in value]
    if isinstance(value, dict):
        return clean_dict(value)
    return value


def clean_dict(data: dict) -> dict:
    cleaned = {}
    for key, value in data.items():
        if key in {"source_url", "raw_file", "absolute_url", "target_section", "target_id", "href"}:
            continue
        if key == "links" and isinstance(value, list):
            cleaned[key] = clean_links(value)
        else:
            cleaned[key] = clean_value(value)
    return cleaned


def main():
    base = Path("Encyclopedia-data/Encyclopedia-data/parsed")
    files = sorted(base.glob("*/*.json"))
    total = len(files)
    cleaned_files = 0

    for index, path in enumerate(files, 1):
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)

        cleaned = clean_dict(raw)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(cleaned, f, ensure_ascii=False, indent=2)

        cleaned_files += 1
        if index % 500 == 0:
            print(f"Очищено {index}/{total}")

    print(f"Готово. Очищено файлов: {cleaned_files}")


if __name__ == "__main__":
    main()
