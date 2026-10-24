from django.contrib import admin

from .models import Entity, EntityLink


class EntityLinkInline(admin.TabularInline):
    model = EntityLink
    fk_name = "from_entity"
    extra = 0
    autocomplete_fields = ["to_entity"]
    verbose_name = "Исходящая связь"
    verbose_name_plural = "Исходящие связи"


@admin.register(Entity)
class EntityAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "name_en", "entity_type", "slug"]
    list_filter = ["entity_type"]
    search_fields = ["name", "name_en", "slug"]
    readonly_fields = ["content_html", "content_text", "data", "sources", "created_at"]
    inlines = [EntityLinkInline]


@admin.register(EntityLink)
class EntityLinkAdmin(admin.ModelAdmin):
    list_display = ["from_entity", "to_entity", "text"]
    list_filter = ["from_entity__entity_type", "to_entity__entity_type"]
    autocomplete_fields = ["from_entity", "to_entity"]
