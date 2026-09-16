"""Импорт энциклопедии из JSON-датасета (backend/Encyclopedia-data/.../parsed/).

Три прохода:
1. Создание сущностей со своими ID (технические поля источника отбрасываются).
2. Очистка content_html: перелинковка на наши ID, удаление data-* и чужих URL.
3. Построение связей EntityLink через временное сопоставление source_key → наш ID.

Импорт одноразовый: source_key в БД не сохраняется, поэтому повторный запуск
возможен только с --replace (полная очистка и загрузка заново).
"""

import json
import re
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from encyclopedia.models import Entity, EntityLink

# Поля, уходящие в отдельные колонки модели.
BASE_FIELDS = {"entity_type", "name", "name_en", "sources", "content_html", "content_text"}
# Технические поля миграционного источника — в БД не нужны.
TECH_FIELDS = {"source_id", "source_key", "source_url", "source_section", "raw_file", "links"}

# href вида /<section>/<id>-<slug>/ (с опциональным доменом, якорем и query).
HREF_RE = re.compile(r"^(?:https?://[^/]+)?/([a-z0-9_-]+)/(\d+)(?:-[^/#?]*)?/?(?:[#?].*)?$", re.IGNORECASE)

BATCH_SIZE = 500


class Command(BaseCommand):
    help = "Импорт энциклопедии из JSON-датасета в БД"

    def add_arguments(self, parser):
        parser.add_argument(
            "path",
            nargs="?",
            default=None,
            help="Путь к папке parsed/ (по умолчанию settings.ENCYCLOPEDIA_DATA_DIR)",
        )
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Полностью очистить энциклопедию перед импортом",
        )

    def handle(self, *args, **options):
        base_dir = Path(options["path"] or settings.ENCYCLOPEDIA_DATA_DIR)
        if not base_dir.is_dir():
            raise CommandError(f"Папка датасета не найдена: {base_dir}")

        if Entity.objects.exists():
            if not options["replace"]:
                raise CommandError(
                    "Энциклопедия уже импортирована. "
                    "Повторный импорт возможен только с --replace (данные будут очищены)."
                )
            self.stdout.write("Очистка существующих данных...")
            EntityLink.objects.all().delete()
            Entity.objects.all().delete()

        files = sorted(base_dir.glob("*/*.json"))
        if not files:
            raise CommandError(f"JSON-файлы не найдены в {base_dir}")
        self.stdout.write(f"Найдено файлов: {len(files)}")

        with transaction.atomic():
            records = self._pass1_create_entities(files)
            unresolved = self._pass2_rewrite_html(records)
            links_count = self._pass3_create_links(records)

        stats = Counter(r["entity_type"] for r in records)
        self.stdout.write(self.style.SUCCESS("Импорт завершён:"))
        for entity_type, count in sorted(stats.items()):
            self.stdout.write(f"  {entity_type}: {count}")
        self.stdout.write(f"  связей: {links_count}")
        self.stdout.write(f"  нерешённых ссылок в HTML (убраны, оставлен текст): {unresolved}")

    def _pass1_create_entities(self, files):
        """Создаёт сущности, возвращает записи {source_key, slug, links, entity_type}."""
        records = []
        used_slugs = set()
        entities = []

        for path in files:
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)

            slug = self._make_slug(raw, used_slugs)
            data = {
                key: value
                for key, value in raw.items()
                if key not in BASE_FIELDS and key not in TECH_FIELDS
            }
            records.append({
                "source_key": raw.get("source_key"),
                "slug": slug,
                "entity_type": raw["entity_type"],
                "links": raw.get("links") or [],
            })
            entities.append(Entity(
                entity_type=raw["entity_type"],
                name=raw["name"],
                name_en=raw.get("name_en") or "",
                slug=slug,
                sources=raw.get("sources") or [],
                content_html=raw.get("content_html") or "",
                content_text=raw.get("content_text") or "",
                data=data,
            ))

        Entity.objects.bulk_create(entities, batch_size=BATCH_SIZE)

        # Надёжно получаем ID независимо от поддержки RETURNING бэкендом.
        id_by_slug = dict(Entity.objects.values_list("slug", "id"))
        source_to_id = {}
        for record in records:
            record["id"] = id_by_slug[record["slug"]]
            if record["source_key"]:
                source_to_id[record["source_key"]] = record["id"]
        self._source_to_id = source_to_id
        self._slug_by_id = {r["id"]: r["slug"] for r in records}
        self._type_by_id = {r["id"]: r["entity_type"] for r in records}
        self.stdout.write(f"Сущности созданы: {len(records)}")
        return records

    def _pass2_rewrite_html(self, records):
        """Чистит content_html и перелинковывает его на наши ID."""
        unresolved = 0
        batch = []
        total = len(records)

        for index, record in enumerate(records, 1):
            entity = Entity.objects.only("id", "content_html").get(id=record["id"])
            cleaned, missed = self._clean_html(entity.content_html)
            unresolved += missed
            entity.content_html = cleaned
            batch.append(entity)

            if len(batch) >= BATCH_SIZE:
                Entity.objects.bulk_update(batch, ["content_html"])
                batch = []
            if index % 500 == 0:
                self.stdout.write(f"  HTML обработан: {index}/{total}")

        if batch:
            Entity.objects.bulk_update(batch, ["content_html"])
        self.stdout.write("HTML очищен и перелинкован")
        return unresolved

    def _pass3_create_links(self, records):
        """Строит EntityLink по сопоставлению source_key → наш ID."""
        links = []
        seen = set()
        for record in records:
            for link in record["links"]:
                target_id = self._source_to_id.get(link.get("target_key") or "")
                if not target_id:
                    continue
                key = (record["id"], target_id, link.get("text") or "")
                if key in seen:
                    continue
                seen.add(key)
                links.append(EntityLink(
                    from_entity_id=record["id"],
                    to_entity_id=target_id,
                    text=(link.get("text") or "")[:255],
                ))
        EntityLink.objects.bulk_create(links, batch_size=BATCH_SIZE, ignore_conflicts=True)
        self.stdout.write(f"Связи созданы: {len(links)}")
        return len(links)

    def _clean_html(self, html):
        """Возвращает (очищенный HTML, число нерешённых ссылок)."""
        if not html:
            return html, 0

        soup = BeautifulSoup(html, "html.parser")
        unresolved = 0

        for anchor in soup.find_all("a"):
            target_id = self._resolve_href(anchor.get("href") or anchor.get("data-source-href") or "")
            if target_id:
                anchor.attrs = {
                    "href": f"/encyclopedia/{self._type_by_id[target_id]}/{self._slug_by_id[target_id]}/",
                    "data-entity-id": str(target_id),
                }
            else:
                # Ссылка вне датасета — убираем тег, оставляем текст.
                unresolved += 1
                anchor.replace_with_children()

        for tag in soup.find_all(True):
            # Удаляем технические data-*, оставляя наш data-entity-id.
            for attr in [a for a in tag.attrs if a.startswith("data-") and a != "data-entity-id"]:
                del tag[attr]
            classes = tag.get("class")
            if classes and "tooltipstered" in classes:
                classes.remove("tooltipstered")
                if classes:
                    tag["class"] = classes
                else:
                    del tag["class"]

        return str(soup), unresolved

    def _resolve_href(self, href):
        """Извлекает source_key из href и возвращает наш ID или None."""
        match = HREF_RE.match(href.strip())
        if not match:
            return None
        return self._source_to_id.get(f"{match.group(1).lower()}:{match.group(2)}")

    @staticmethod
    def _make_slug(raw, used_slugs):
        base = slugify(raw.get("name_en") or "") or f"{raw['entity_type']}-{raw.get('source_id', 'x')}"
        slug = base[:270]
        counter = 2
        while slug in used_slugs:
            slug = f"{base[:265]}-{counter}"
            counter += 1
        used_slugs.add(slug)
        return slug
