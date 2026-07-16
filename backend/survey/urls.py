from django.urls import path

from .views import (
    AnswerListCreateView,
    QuestionListView,
    SurveySubmissionListCreateView,
)

urlpatterns = [
    path("questions/", QuestionListView.as_view(), name="question-list"),
    path("answers/", AnswerListCreateView.as_view(), name="answer-list-create"),
    path(
        "submissions/",
        SurveySubmissionListCreateView.as_view(),
        name="submission-list-create",
    ),
]
