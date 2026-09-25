from django.db.models import Count, Q
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Entity
from .serializers import EntityDetailSerializer, EntityListSerializer


class EntityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_page_size(self, request):
        # Для лёгкого индекса существ достаточно примерно трёх страниц.
        if request.query_params.get("type") == Entity.Type.CREATURE:
            self.page_size = 1000
            self.max_page_size = 1000
        return super().get_page_size(request)


class EntityListView(generics.ListAPIView):
    """
    GET /api/encyclopedia/ — список сущностей энциклопедии.
    Параметры: ?type=spell (фильтр по типу), ?slug=... (точная запись),
    ?q=... (поиск по названию и тексту), ?page=, ?page_size=.
    """

    serializer_class = EntityListSerializer
    permission_classes = [AllowAny]
    pagination_class = EntityPagination

    def get_queryset(self):
        # Не извлекаем тяжёлые HTML и текст карточек при построении каталога.
        queryset = Entity.objects.only(
            "id", "entity_type", "name", "name_en", "slug", "sources", "data"
        )
        entity_type = self.request.query_params.get("type")
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        slug = self.request.query_params.get("slug")
        if slug:
            queryset = queryset.filter(slug=slug)
        query = self.request.query_params.get("q", "").strip()
        if query:
            # Как в прежнем клиентском поиске: каждое слово может быть в любом поле.
            words = query.split() if entity_type == Entity.Type.CREATURE else [query]
            for word in words:
                queryset = queryset.filter(
                    Q(name__icontains=word)
                    | Q(name_en__icontains=word)
                    | Q(content_text__icontains=word)
                )
        return queryset


class EntityDetailView(generics.RetrieveAPIView):
    """GET /api/encyclopedia/<id>/ — карточка сущности со связями."""

    serializer_class = EntityDetailSerializer
    permission_classes = [AllowAny]
    queryset = Entity.objects.prefetch_related("links__to_entity")


class EntityTypesView(APIView):
    """GET /api/encyclopedia/types/ — количество сущностей по типам."""

    permission_classes = [AllowAny]

    def get(self, request):
        counts = dict(
            Entity.objects.values_list("entity_type")
            .annotate(total=Count("id"))
            .order_by("entity_type")
        )
        return Response({
            "types": [
                {"entity_type": value, "label": label, "count": counts.get(value, 0)}
                for value, label in Entity.Type.choices
            ],
            "total": sum(counts.values()),
        })
