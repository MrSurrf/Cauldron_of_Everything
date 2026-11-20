from django.urls import path

from .views import MyProfileAvatarView, MyProfileView

urlpatterns = [
    path("profile/", MyProfileView.as_view(), name="my-profile"),
    path("profile/avatar/", MyProfileAvatarView.as_view(), name="my-profile-avatar"),
]
