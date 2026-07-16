import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from survey.models import Choice, Question


class Command(BaseCommand):
    help = (
        "Загружает/обновляет анкету из JSON-конфигов.\n"
        "Без аргументов — загружает все *.json из папки config/.\n"
        "Примеры:\n"
        "  python manage.py load_survey\n"
        "  python manage.py load_survey survey.json\n"
        "  python manage.py load_survey --replace"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "path",
            nargs="?",
            default=None,
            help="Имя файла из config/ или путь к JSON. Если не указан — все *.json из config/",
        )
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Деактивировать вопросы, которых нет в загружаемых файлах",
        )

    def handle(self, *args, **options):
        files = self._resolve_files(options["path"])
        seen_texts = []
        total_created = total_updated = 0

        for file in files:
            questions_data = self._read_json(file)
            created, updated = self._load_questions(questions_data, seen_texts, file.name)
            total_created += created
            total_updated += updated
            self.stdout.write(f"  {file.name}: создано — {created}, обновлено — {updated}")

        report = f"Итого: создано — {total_created}, обновлено — {total_updated}"
        if options["replace"]:
            deactivated = Question.objects.exclude(text__in=seen_texts).update(
                is_active=False
            )
            report += f", деактивировано — {deactivated}"
        self.stdout.write(self.style.SUCCESS(report))

    def _resolve_files(self, path):
        config_dir = Path(settings.SURVEY_CONFIG_DIR)
        if path is None:
            files = sorted(config_dir.glob("*.json"))
            if not files:
                raise CommandError(f"В папке {config_dir} нет *.json файлов")
            return files
        file = Path(path)
        if not file.exists():
            alt = config_dir / path
            if alt.exists():
                file = alt
            else:
                raise CommandError(
                    f"Файл не найден: {path} (искали также в {config_dir})"
                )
        return [file]

    def _read_json(self, file):
        try:
            data = json.loads(file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"{file.name}: ошибка в JSON: {exc}") from exc
        questions_data = data.get("questions")
        if not isinstance(questions_data, list) or not questions_data:
            raise CommandError(
                f"{file.name}: должен быть непустой список 'questions'"
            )
        return questions_data

    def _load_questions(self, questions_data, seen_texts, filename):
        created_q = updated_q = 0

        for q_order, q_data in enumerate(questions_data, start=1):
            text = q_data.get("text")
            if not text:
                raise CommandError(f"{filename}, вопрос №{q_order}: нет поля 'text'")
            choices_data = q_data.get("choices")
            if not isinstance(choices_data, list) or len(choices_data) < 2:
                raise CommandError(
                    f"{filename}, вопрос №{q_order} ('{text}'): "
                    "нужно минимум 2 варианта в 'choices'"
                )

            seen_texts.append(text)
            order = q_data.get("order", q_order)

            question, created = Question.objects.get_or_create(
                text=text, defaults={"order": order}
            )
            if created:
                created_q += 1
            else:
                question.order = order
                question.is_active = True
                question.save()
                updated_q += 1

            self._set_image(question, q_data.get("image"))

            for c_order, c_data in enumerate(choices_data, start=1):
                c_text = c_data.get("text")
                if not c_text:
                    raise CommandError(
                        f"{filename}, '{text}', вариант №{c_order}: нет поля 'text'"
                    )
                choice, _ = Choice.objects.get_or_create(
                    question=question, text=c_text, defaults={"order": c_order}
                )
                if choice.order != c_order:
                    choice.order = c_order
                    choice.save(update_fields=["order"])
                self._set_image(choice, c_data.get("image"))

        return created_q, updated_q

    @staticmethod
    def _set_image(obj, image):
        """Проставляет путь к картинке, если он задан в JSON и изменился."""
        if image is not None and str(obj.image) != image:
            obj.image = image
            obj.save(update_fields=["image"])
