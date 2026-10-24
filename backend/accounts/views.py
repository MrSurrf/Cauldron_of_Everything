from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import ProfileSerializer


class MyProfileView(APIView):
    """
    GET   /api/me/profile/ — профиль текущего пользователя.
    PATCH /api/me/profile/ — частично обновить поля профиля (merge поверх сохранённых).
    Тело PATCH: {"data": {"name": "...", ...}}.
    """

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response(ProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class MyProfileAvatarView(APIView):
    """
    POST /api/me/profile/avatar/ — загрузить или заменить аватар профиля.
    Принимает multipart/form-data, поле 'portrait'.
    Возвращает {"portrait": "<absolute_url>"}.
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        portrait = request.FILES.get("portrait")
        if not portrait:
            return Response(
                {"detail": "Необходимо передать файл в поле portrait."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not portrait.content_type or not portrait.content_type.startswith("image/"):
            return Response(
                {"detail": "Допускаются только изображения."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = 5 * 1024 * 1024
        if portrait.size > max_size:
            return Response(
                {"detail": "Размер файла не должен превышать 5 МБ."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile, _ = Profile.objects.get_or_create(user=request.user)

        # Удаляем предыдущий файл, чтобы не оставлять мусор в media/.
        if profile.portrait:
            profile.portrait.delete(save=False)

        profile.portrait = portrait
        profile.save(update_fields=["portrait", "updated_at"])

        return Response({"portrait": request.build_absolute_uri(profile.portrait.url)})
