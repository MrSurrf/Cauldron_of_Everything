from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import EmailAuthCode
from .views import _hash_code


@override_settings(AUTH_ALLOWED_EMAILS=["allowed@example.com"])
class SiteAccessTests(APITestCase):
    paths = [
        "/api/auth/session/", "/api/encyclopedia/", "/api/encyclopedia/types/",
        "/api/encyclopedia/1/", "/api/submissions/", "/api/questions/", "/api/answers/",
    ]

    def authenticate(self, email):
        user = User.objects.create_user(username=email, email=email)
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_anonymous_cannot_read_site_data(self):
        for path in self.paths:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 401)

    def test_authenticated_outside_whitelist_is_denied(self):
        self.authenticate("outsider@example.com")
        for path in self.paths:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 403)

    def test_allowed_member_can_read(self):
        self.authenticate("allowed@example.com")
        for path in self.paths:
            if path == "/api/encyclopedia/1/":
                continue
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_revoked_email_cannot_use_existing_token(self):
        self.authenticate("allowed@example.com")
        with override_settings(AUTH_ALLOWED_EMAILS=["other@example.com"]):
            self.assertEqual(self.client.get("/api/auth/session/").status_code, 403)

    def test_revoked_email_cannot_use_previously_sent_code(self):
        EmailAuthCode.objects.create(email="outsider@example.com", code_hash=_hash_code("123456"))
        response = self.client.post("/api/auth/verify-code/", {"email": "outsider@example.com", "code": "123456"})
        self.assertEqual(response.status_code, 403)
        self.assertNotIn("access", response.data)

    @override_settings(AUTH_ALLOWED_EMAILS=[])
    def test_empty_whitelist_still_requires_authentication(self):
        self.assertEqual(self.client.get("/api/auth/session/").status_code, 401)
        self.authenticate("member@example.com")
        self.assertEqual(self.client.get("/api/auth/session/").status_code, 200)
