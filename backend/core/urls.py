from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from survey.views import RegisterView, RequestCodeView, VerifyCodeView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Авторизация
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/request-code/", RequestCodeView.as_view(), name="request-code"),
    path("api/auth/verify-code/", VerifyCodeView.as_view(), name="verify-code"),
    # Анкета
    path("api/", include("survey.urls")),
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
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
