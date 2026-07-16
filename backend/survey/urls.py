from django.urls import path

from .views import (
    AnswerListCreateView,
    QuestionListView,
    SurveySubmissionCreateView,
)

urlpatterns = [
    path("questions/", QuestionListView.as_view(), name="question-list"),
    path("answers/", AnswerListCreateView.as_view(), name="answer-list-create"),
    path(
        "submissions/",
        SurveySubmissionCreateView.as_view(),
        name="submission-create",
    ),
]
