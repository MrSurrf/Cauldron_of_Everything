import hashlib

from django.db.models import Count, Max, Q
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.views.decorators.http import condition
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Entity
from .serializers import EntityDetailSerializer, EntityListSerializer


def name_starts_with(name, prefix):
    """Сравнение названий для живого поиска, включая кириллицу и ё/е."""
    first_letter = next((index for index, char in enumerate(name) if char.isalpha()), len(name))
    return name[first_letter:].casefold().replace("ё", "е").startswith(
        prefix.casefold().replace("ё", "е")
    )


def filter_entities(base_queryset, query_params):
    """Применяет фильтры каталога из query params к базовому queryset."""
    queryset = base_queryset
    entity_type = query_params.get("type")
    if entity_type:
        queryset = queryset.filter(entity_type=entity_type)
    slug = query_params.get("slug")
    if slug:
        queryset = queryset.filter(slug=slug)
    name_prefix = query_params.get("name_prefix", "").strip()
    if name_prefix:
        # SQLite LIKE не учитывает регистр кириллицы. Названий пока немного,
        # поэтому фильтруем только id и name до пагинации.
        matching_ids = [
            entity_id
            for entity_id, name in queryset.values_list("id", "name")
            if name_starts_with(name, name_prefix)
        ]
        queryset = queryset.filter(id__in=matching_ids)
    query = query_params.get("q", "").strip()
    if query:
        # Каждое слово может встречаться в названии или внутри карточки.
        for word in query.split():
            queryset = queryset.filter(
                Q(name__icontains=word)
                | Q(name_en__icontains=word)
                | Q(content_text__icontains=word)
            )
    return queryset


def _etag_from_aggregate(scope, total, last):
    """ETag по числу записей и метке последнего изменения; None для пустого набора."""
    if last is None:
        return None
    return hashlib.md5(f"{scope}:{total}:{last.timestamp()}".encode()).hexdigest()


def catalog_etag(request, *args, **kwargs):
    """ETag списка сущностей: те же фильтры, что у вью, плюс query string."""
    queryset = filter_entities(
        Entity.objects.only("id", "updated_at"), request.query_params
    )
    aggregate = queryset.aggregate(total=Count("id"), last=Max("updated_at"))
    return _etag_from_aggregate(
        f"catalog:{request.META.get('QUERY_STRING', '')}",
        aggregate["total"],
        aggregate["last"],
    )


def entity_etag(request, pk, *args, **kwargs):
    """ETag карточки сущности по её метке изменения."""
    last = Entity.objects.filter(pk=pk).values_list("updated_at", flat=True).first()
    if last is None:
        return None
    return hashlib.md5(f"entity:{pk}:{last.timestamp()}".encode()).hexdigest()


def types_etag(request, *args, **kwargs):
    """ETag количества сущностей по типам."""
    aggregate = Entity.objects.aggregate(total=Count("id"), last=Max("updated_at"))
    return _etag_from_aggregate("types", aggregate["total"], aggregate["last"])


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


@method_decorator(cache_control(no_cache=True), name="get")
@method_decorator(condition(etag_func=catalog_etag), name="get")
class EntityListView(generics.ListAPIView):
    """
    GET /api/encyclopedia/ — список сущностей энциклопедии.
    Параметры: ?type=spell (фильтр по типу), ?slug=... (точная запись),
    ?name_prefix=... (начало названия), ?q=... (поиск по названию и тексту),
    ?page=, ?page_size=.
    Отдаёт ETag + Cache-Control: no-cache: браузер хранит ответ, но при
    повторном заходе делает короткий запрос на валидацию (304 без тела).
    """

    serializer_class = EntityListSerializer
    permission_classes = [AllowAny]
    pagination_class = EntityPagination

    def get_queryset(self):
        # Не извлекаем тяжёлые HTML и текст карточек при построении каталога.
        return filter_entities(
            Entity.objects.only(
                "id", "entity_type", "name", "name_en", "slug", "sources", "data"
            ),
            self.request.query_params,
        )


@method_decorator(cache_control(no_cache=True), name="get")
@method_decorator(condition(etag_func=entity_etag), name="get")
class EntityDetailView(generics.RetrieveAPIView):
    """GET /api/encyclopedia/<id>/ — карточка сущности со связями."""

    serializer_class = EntityDetailSerializer
    permission_classes = [AllowAny]
    queryset = Entity.objects.prefetch_related("links__to_entity")


@method_decorator(cache_control(no_cache=True), name="get")
@method_decorator(condition(etag_func=types_etag), name="get")
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
