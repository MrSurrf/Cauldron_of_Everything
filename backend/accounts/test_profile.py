from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile


@override_settings(AUTH_ALLOWED_EMAILS=[])
class ProfileApiTests(APITestCase):
    url = "/api/me/profile/"

    def authenticate(self, email):
        user, _ = User.objects.get_or_create(username=email, defaults={"email": email})
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return user

    def test_anonymous_gets_401(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertEqual(
            self.client.patch(self.url, {"data": {"name": "X"}}, format="json").status_code,
            401,
        )

    def test_get_creates_empty_profile(self):
        user = self.authenticate("one@example.com")
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"], {})
        self.assertTrue(Profile.objects.filter(user=user).exists())

    def test_patch_saves_and_get_returns_saved_data(self):
        self.authenticate("one@example.com")
        payload = {"name": "Babaika", "theme": "blue", "privacy": {"online": False}}
        response = self.client.patch(self.url, {"data": payload}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["name"], "Babaika")

        response = self.client.get(self.url)
        self.assertEqual(response.data["data"]["theme"], "blue")
        self.assertEqual(response.data["data"]["privacy"], {"online": False})

    def test_patch_merges_without_dropping_other_fields(self):
        self.authenticate("one@example.com")
        self.client.patch(self.url, {"data": {"name": "Babaika"}}, format="json")
        self.client.patch(self.url, {"data": {"theme": "gold"}}, format="json")
        response = self.client.get(self.url)
        self.assertEqual(response.data["data"]["name"], "Babaika")
        self.assertEqual(response.data["data"]["theme"], "gold")

    def test_profiles_are_isolated_between_users(self):
        self.authenticate("one@example.com")
        self.client.patch(self.url, {"data": {"name": "One"}}, format="json")
        self.authenticate("two@example.com")
        self.client.patch(self.url, {"data": {"name": "Two"}}, format="json")
        self.assertEqual(self.client.get(self.url).data["data"]["name"], "Two")
        self.authenticate("one@example.com")
        self.assertEqual(self.client.get(self.url).data["data"]["name"], "One")

    def test_unknown_field_rejected(self):
        self.authenticate("one@example.com")
        response = self.client.patch(
            self.url, {"data": {"is_admin": True}}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.get(self.url).data["data"], {})

    def test_invalid_field_types_rejected(self):
        self.authenticate("one@example.com")
        bad_payloads = [
            {"name": 42},
            {"name": "x" * 41},
            {"systems": "D&D"},
            {"links": [{"label": "Discord"}]},
            {"privacy": {"online": "да"}},
            {"privacy": {"root": True}},
            {"settings": []},
        ]
        for payload in bad_payloads:
            with self.subTest(payload=payload):
                response = self.client.patch(self.url, {"data": payload}, format="json")
                self.assertEqual(response.status_code, 400)
