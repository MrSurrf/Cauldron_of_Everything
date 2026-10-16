from rest_framework import status
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
