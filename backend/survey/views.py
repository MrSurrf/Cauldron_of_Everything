import hashlib
import logging
import secrets
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Answer, EmailAuthCode, Question, SurveySubmission
from .serializers import (
    AnswerSerializer,
    QuestionSerializer,
    RegisterSerializer,
    RequestCodeSerializer,
    SurveySubmissionSerializer,
    VerifyCodeSerializer,
)
from .notifications import send_submission_notification

logger = logging.getLogger(__name__)

# Параметры одноразовых кодов входа.
CODE_TTL = timedelta(minutes=10)      # срок жизни кода
CODE_RESEND_COOLDOWN = timedelta(seconds=60)  # пауза между отправками
CODE_MAX_ATTEMPTS = 5                  # максимум попыток ввода


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — регистрация (username + password)."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class RequestCodeView(generics.GenericAPIView):
    """
    POST /api/auth/request-code/ — отправить одноразовый код входа на email.
    Тело: {"email": "..."}.
    """

    serializer_class = RequestCodeSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        last_code = (
            EmailAuthCode.objects.filter(email=email, is_used=False)
            .order_by("-created_at")
            .first()
        )
        if last_code and timezone.now() - last_code.created_at < CODE_RESEND_COOLDOWN:
            return Response(
                {"detail": "Код уже отправлен. Повторите через минуту."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        code = f"{secrets.randbelow(1_000_000):06d}"
        EmailAuthCode.objects.filter(email=email, is_used=False).update(is_used=True)
        EmailAuthCode.objects.create(email=email, code_hash=_hash_code(code))

        try:
            send_mail(
                subject="Код входа в анкету",
                message=f"Ваш код входа: {code}\n\nОн действует 10 минут.",
                from_email=None,  # DEFAULT_FROM_EMAIL
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Не удалось отправить код входа на %s", email)
            return Response(
                {"detail": "Не удалось отправить письмо. Попробуйте позже."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"detail": "Код отправлен на почту."})


class VerifyCodeView(generics.GenericAPIView):
    """
    POST /api/auth/verify-code/ — проверить код и получить JWT-токены.
    Тело: {"email": "...", "code": "123456"}.
    """

    serializer_class = VerifyCodeSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        code = serializer.validated_data["code"]

        auth_code = (
            EmailAuthCode.objects.filter(email=email, is_used=False)
            .order_by("-created_at")
            .first()
        )
        invalid_response = Response(
            {"detail": "Неверный или просроченный код."},
            status=status.HTTP_400_BAD_REQUEST,
        )

        if not auth_code:
            return invalid_response
        if timezone.now() - auth_code.created_at > CODE_TTL:
            auth_code.is_used = True
            auth_code.save(update_fields=["is_used"])
            return invalid_response
        if auth_code.attempts >= CODE_MAX_ATTEMPTS:
            auth_code.is_used = True
            auth_code.save(update_fields=["is_used"])
            return Response(
                {"detail": "Превышено число попыток. Запросите новый код."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if auth_code.code_hash != _hash_code(code):
            auth_code.attempts += 1
            auth_code.save(update_fields=["attempts"])
            return invalid_response

        auth_code.is_used = True
        auth_code.save(update_fields=["is_used"])

        user, created = User.objects.get_or_create(
            username=email,
            defaults={"email": email},
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh)}
        )


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
    GET открыт (страница результатов мастера), POST требует JWT —
    отправлять результат могут только вошедшие по email-коду пользователи.
    """

    serializer_class = SurveySubmissionSerializer
    queryset = SurveySubmission.objects.all().order_by("-created_at")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

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

