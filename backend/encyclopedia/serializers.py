from rest_framework import serializers

from .models import Entity, EntityLink


class EntityListSerializer(serializers.ModelSerializer):
    """Краткое представление сущности для списка и поиска."""

    summary = serializers.SerializerMethodField()

    class Meta:
        model = Entity
        fields = ["id", "entity_type", "name", "name_en", "slug", "sources", "summary"]

    def get_summary(self, obj):
        """Ключевые поля типа для превью в списке (уровень, редкость, CR и т.п.)."""
        keys_by_type = {
            Entity.Type.SPELL: ["level", "school", "ritual", "concentration"],
            Entity.Type.CREATURE: ["challenge_rating", "size", "creature_type", "alignment"],
            Entity.Type.ITEM: ["rarity", "classification", "requires_attunement"],
            Entity.Type.RACE: ["size", "speed"],
            Entity.Type.CLASS: ["hit_die"],
            Entity.Type.FEAT: ["prerequisite"],
            Entity.Type.BACKGROUND: ["skill_proficiencies"],
        }
        return {
            key: obj.data[key]
            for key in keys_by_type.get(obj.entity_type, [])
            if obj.data.get(key) not in (None, "", [])
        }


class LinkedEntitySerializer(serializers.ModelSerializer):
    """Краткая карточка связанной сущности."""

    class Meta:
        model = Entity
        fields = ["id", "entity_type", "name", "slug"]


class EntityLinkSerializer(serializers.ModelSerializer):
    """Связь с развёрнутой целевой сущностью."""

    to_entity = LinkedEntitySerializer(read_only=True)

    class Meta:
        model = EntityLink
        fields = ["to_entity", "text"]


class EntityDetailSerializer(serializers.ModelSerializer):
    """Полная карточка сущности."""

    links = EntityLinkSerializer(many=True, read_only=True)
    linked_from = serializers.SerializerMethodField()

    class Meta:
        model = Entity
        fields = [
            "id",
            "entity_type",
            "name",
            "name_en",
            "slug",
            "sources",
            "content_html",
            "content_text",
            "data",
            "links",
            "linked_from",
        ]

    def get_linked_from(self, obj):
        """Сущности, ссылающиеся на эту карточку."""
        incoming = (
            EntityLink.objects.filter(to_entity=obj)
            .select_related("from_entity")
            .order_by("from_entity__entity_type", "from_entity__name")
        )
        return [
            LinkedEntitySerializer(link.from_entity).data
            for link in incoming
        ]
