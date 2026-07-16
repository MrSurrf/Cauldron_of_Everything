from django.contrib import admin

from .models import Answer, Choice, Question


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("order", "text", "is_active", "choices_count")
    list_display_links = ("text",)
    list_editable = ("order", "is_active")
    inlines = [ChoiceInline]

    @admin.display(description="Вариантов")
    def choices_count(self, obj):
        return obj.choices.count()


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("user", "question", "choice", "updated_at")
    list_filter = ("question",)
    search_fields = ("user__username",)
