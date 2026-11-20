from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Choice, Question


@override_settings(AUTH_ALLOWED_EMAILS=[])
class QuestionListCacheTests(TestCase):
    """ETag/304 для списка вопросов анкеты."""

    def setUp(self):
        user = User.objects.create_user(username="gm@example.com")
        token = RefreshToken.for_user(user).access_token
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_questions_etag_304_and_invalidation(self):
        question = Question.objects.create(text="Какой уклон мира?", order=1)

        first = self.client.get("/api/questions/")
        self.assertEqual(first.status_code, 200)
        etag = first["ETag"]
        self.assertTrue(etag)
        self.assertEqual(first["Cache-Control"], "no-cache")

        second = self.client.get("/api/questions/", HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(second.status_code, 304)
        self.assertEqual(second.content, b"")

        # Новый вариант ответа меняет ETag (варианты входат в ответ).
        Choice.objects.create(question=question, text="Мрачный", order=1)
        third = self.client.get("/api/questions/", HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(third.status_code, 200)
