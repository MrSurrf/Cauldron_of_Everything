from django.urls import path

from .views import MyProfileView

urlpatterns = [
    path("profile/", MyProfileView.as_view(), name="my-profile"),
]
