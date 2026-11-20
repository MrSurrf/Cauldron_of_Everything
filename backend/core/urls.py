from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as static_serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from survey.views import RegisterView, RequestCodeView, SessionView, VerifyCodeView


def media_serve(request, path, document_root):
    """Раздача media/ в dev с явными заголовками кэша.

    Имена файлов аватаров уникальны на каждую загрузку, поэтому их можно
    кэшировать навсегда. Прочие медиа (картинки анкеты) живут под постоянными
    URL — их перепроверяем раз в сутки. private: кэширует только браузер.
    """
    response = static_serve(request, path, document_root=document_root)
    if path.startswith("accounts/portraits/"):
        response.headers["Cache-Control"] = "private, max-age=31536000, immutable"
    else:
        response.headers["Cache-Control"] = "private, max-age=86400"
    return response

urlpatterns = [
    path("admin/", admin.site.urls),
    # Авторизация
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/request-code/", RequestCodeView.as_view(), name="request-code"),
    path("api/auth/verify-code/", VerifyCodeView.as_view(), name="verify-code"),
    path("api/auth/session/", SessionView.as_view(), name="auth-session"),
    # Анкета
    path("api/", include("survey.urls")),
    # Профиль и настройки аккаунта
    path("api/me/", include("accounts.urls")),
    # Энциклопедия
    path("api/encyclopedia/", include("encyclopedia.urls")),
    # Документация API (для фронтендера)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

# В dev-режиме раздаём картинки из media/
if settings.DEBUG:
    urlpatterns += [
        re_path(
            r"^media/(?P<path>.*)$",
            media_serve,
            {"document_root": settings.MEDIA_ROOT},
            name="media-serve",
        ),
    ]
