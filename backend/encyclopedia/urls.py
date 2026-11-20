from django.urls import path

from .views import EntityDetailView, EntityListView, EntityTypesView

urlpatterns = [
    path("", EntityListView.as_view(), name="entity-list"),
    path("types/", EntityTypesView.as_view(), name="entity-types"),
    path("<int:pk>/", EntityDetailView.as_view(), name="entity-detail"),
]
