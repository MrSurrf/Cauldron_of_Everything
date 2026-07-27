from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Answer, Question, SurveySubmission
from .serializers import (
    AnswerSerializer,
    QuestionSerializer,
    RegisterSerializer,
    SurveySubmissionSerializer,
)
from .notifications import send_submission_notification


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — регистрация (username + password)."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class QuestionListView(generics.ListAPIView):
    """GET /api/questions/ — список активных вопросов с вариантами ответов."""

    serializer_class = QuestionSerializer
    queryset = Question.objects.filter(is_active=True).prefetch_related("choices")


class SurveySubmissionListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/submissions/ — список результатов прохождения анкеты.
    POST /api/submissions/ — сохранить результат прохождения анкеты целиком.
    Тело: {
        "survey_id": "...",
        "player_name": "...",
        "character_name": "...",
        "answers": {"question_id": значение, ...}
    }.
    Пока без авторизации: фронтенд идентифицирует участника по имени.
    """

    serializer_class = SurveySubmissionSerializer
    permission_classes = [AllowAny]
    queryset = SurveySubmission.objects.all().order_by("-created_at")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        send_submission_notification(submission)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AnswerListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/answers/ — ответы текущего пользователя.
    POST /api/answers/ — сохранить ответ {"question": <id>, "choice": <id>}.
                         Повторный ответ на тот же вопрос перезаписывает предыдущий.
    """

    serializer_class = AnswerSerializer

    def get_queryset(self):
        return Answer.objects.filter(user=self.request.user).select_related(
            "question", "choice"
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answer, created = Answer.objects.update_or_create(
            user=request.user,
            question=serializer.validated_data["question"],
            defaults={"choice": serializer.validated_data["choice"]},
        )
        output = self.get_serializer(answer)
        return Response(
            output.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

