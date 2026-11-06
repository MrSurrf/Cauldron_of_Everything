from unittest import TestCase

from encyclopedia.spell_schools import normalize_spell_school


class NormalizeSpellSchoolTests(TestCase):
    def test_normalizes_eight_base_schools(self):
        schools = {
            "Abjuration": "Ограждение",
            "Conjuration": "Вызов",
            "Divination": "Прорицание",
            "Enchantment": "Очарование",
            "Evocation": "Воплощение",
            "Illusion": "Иллюзия",
            "Necromancy": "Некромантия",
            "Transmutation": "Преобразование",
        }
        for source, expected in schools.items():
            with self.subTest(source=source):
                self.assertEqual(normalize_spell_school(source), expected)

    def test_supports_source_shapes_and_russian_aliases(self):
        values = [
            ({"name": "Преграждение"}, "Ограждение"),
            ({"index": "evocation"}, "Воплощение"),
            ([{"label": "Превращение"}], "Преобразование"),
            ("Школа: Некромантии", "Некромантия"),
            ("Illusion / Иллюзия", "Иллюзия"),
        ]
        for source, expected in values:
            with self.subTest(source=source):
                self.assertEqual(normalize_spell_school(source), expected)

    def test_preserves_unknown_school(self):
        self.assertEqual(normalize_spell_school("  Хрономантия  "), "Хрономантия")
        self.assertEqual(normalize_spell_school({"name": "Гравитургия"}), "Гравитургия")
