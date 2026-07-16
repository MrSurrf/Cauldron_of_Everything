import json

from django.contrib import admin

from .models import Answer, Choice, Question, SurveySubmission


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


@admin.register(SurveySubmission)
class SurveySubmissionAdmin(admin.ModelAdmin):
    list_display = (
        "player_name",
        "character_name",
        "survey_id",
        "created_at",
        "answers_preview",
    )
    list_filter = ("survey_id",)
    search_fields = ("player_name", "character_name")
    readonly_fields = (
        "survey_id",
        "player_name",
        "character_name",
        "answers",
        "created_at",
    )

    @admin.display(description="Ответы")
    def answers_preview(self, obj):
        text = json.dumps(obj.answers, ensure_ascii=False)
        return text[:80] + ("…" if len(text) > 80 else "")
