from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Answer, Choice, Question, SurveySubmission


class RegisterSerializer(serializers.ModelSerializer):
    """Регистрация пользователя."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "password")

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ("id", "text", "image")


class QuestionSerializer(serializers.ModelSerializer):
    """Вопрос с вложенными вариантами ответов."""

    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ("id", "text", "image", "choices")


class AnswerSerializer(serializers.ModelSerializer):
    """Ответ пользователя. Принимает id вопроса и id выбранного варианта."""

    question_text = serializers.CharField(source="question.text", read_only=True)
    choice_text = serializers.CharField(source="choice.text", read_only=True)

    class Meta:
        model = Answer
        fields = (
            "id",
            "question",
            "question_text",
            "choice",
            "choice_text",
            "updated_at",
        )
        read_only_fields = ("updated_at",)

    def validate(self, attrs):
        if attrs["choice"].question_id != attrs["question"].id:
            raise serializers.ValidationError(
                {"choice": "Этот вариант ответа не относится к выбранному вопросу."}
            )
        return attrs


class SurveySubmissionSerializer(serializers.ModelSerializer):
    """Результат прохождения анкеты от фронтенда."""

    class Meta:
        model = SurveySubmission
        fields = (
            "id",
            "survey_id",
            "player_name",
            "character_name",
            "answers",
            "created_at",
        )
        read_only_fields = ("created_at",)

    def validate_answers(self, value):
        if not isinstance(value, dict) or not value:
            raise serializers.ValidationError(
                "Ожидается непустой объект вида {\"question_id\": значение}."
            )
        return value

