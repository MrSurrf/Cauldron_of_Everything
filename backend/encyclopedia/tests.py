from django.test import TestCase

from .models import Entity


class CreatureListApiTests(TestCase):
    def setUp(self):
        self.creature = Entity.objects.create(
            entity_type=Entity.Type.CREATURE,
            name="Горный орёл",
            slug="mountain-eagle",
            sources=["Бестиарий"],
            content_html="<p>Тяжёлая карточка</p>",
            content_text="Опытный исследователь высоких гор",
            data={
                "challenge_rating": "1/4",
                "size": "Маленький",
                "creature_type": "Зверь",
                "alignment": "без мировоззрения",
                "languages": ["Общий"],
                "environments": ["Горы"],
                "movement": {"fly": "60 фт."},
                "named_npc": False,
                "is_homebrew": False,
                "armor_class": 15,
                "hit_points": 18,
            },
        )

    def test_list_contains_only_catalog_fields(self):
        response = self.client.get("/api/encyclopedia/?type=creature&page_size=1000")

        self.assertEqual(response.status_code, 200)
        item = response.json()["results"][0]
        self.assertEqual(item["id"], self.creature.id)
        self.assertEqual(item["summary"], {
            "challenge_rating": "1/4",
            "size": "Маленький",
            "creature_type": "Зверь",
            "alignment": "без мировоззрения",
            "languages": ["Общий"],
            "environments": ["Горы"],
            "movement": {"fly": "60 фт."},
            "named_npc": False,
            "is_homebrew": False,
        })
        self.assertNotIn("data", item)
        self.assertNotIn("content_text", item)
        self.assertNotIn("content_html", item)
        self.assertNotIn("armor_class", item["summary"])
        self.assertNotIn("hit_points", item["summary"])

    def test_creature_page_size_exceeds_old_limit(self):
        Entity.objects.bulk_create([
            Entity(
                entity_type=Entity.Type.CREATURE,
                name=f"Существо {number}",
                slug=f"creature-{number}",
                content_html="",
                content_text="",
                data={},
            )
            for number in range(101)
        ])

        response = self.client.get("/api/encyclopedia/?type=creature")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 102)
        self.assertEqual(len(response.json()["results"]), 102)

    def test_searches_each_word_in_name_or_content_text(self):
        response = self.client.get(
            "/api/encyclopedia/",
            {"type": "creature", "q": "Горный исследователь"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)
        self.assertEqual(response.json()["results"][0]["id"], self.creature.id)
