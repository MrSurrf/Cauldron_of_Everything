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


class EntityListView(generics.ListAPIView):
    """
    GET /api/encyclopedia/ — список сущностей энциклопедии.
    Параметры: ?type=spell (фильтр по типу), ?q=... (поиск по названию и тексту),
    ?page=, ?page_size=.
    """

    serializer_class = EntityListSerializer
    permission_classes = [AllowAny]
    pagination_class = EntityPagination

    def get_queryset(self):
        queryset = Entity.objects.all()
        entity_type = self.request.query_params.get("type")
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(name__icontains=query)
                | Q(name_en__icontains=query)
                | Q(content_text__icontains=query)
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
