# Путеводитель по проекту Cauldron of Everything

Этот файл помогает ориентироваться в архитектуре, запускать проект, добавлять
новую функциональность и готовить бэкенд к росту.

---

## 1. Общий обзор

Проект — монорепозиторий из двух частей:

- **backend/** — Django + Django REST Framework. Хранит данные, раздаёт API,
  управляет админкой и конфигурациями анкет.
- **frontend/** — React + TypeScript + Vite. Пользовательский интерфейс.
- **config/** — JSON-файлы с вопросами для команды `load_survey`.

Правило разделения зон:

- **Фронтенд-разработчик** работает только в `frontend/`.
- **Бэкенд-разработчик** работает только в `backend/`.
- **Конфигуратор/контент-менеджер** редактирует `config/*.json` и
  `backend/media/survey/`.

---

## 2. Структура проекта

```
Cauldron_of_Everything/
├── backend/
│   ├── core/                   # настройки Django
│   ├── survey/                 # приложение анкеты
│   │   ├── models.py           # модели базы данных
│   │   ├── views.py            # API-обработчики
│   │   ├── serializers.py      # DRF-сериализаторы
│   │   ├── urls.py             # маршруты API
│   │   ├── admin.py            # Django-админка
│   │   ├── notifications.py    # email/Telegram уведомления
│   │   └── migrations/         # миграции PostgreSQL
│   ├── media/                  # загружаемые файлы (volume в Dokploy)
│   ├── Dockerfile              # образ бэкенда
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── public/                 # статика
│   ├── src/                    # исходный код React
│   ├── Dockerfile              # образ фронтенда
│   ├── nginx.conf
│   └── package.json
├── config/                     # JSON-конфиги анкет
│   └── survey.json
├── docker-compose.yml          # локальный стек
├── .github/workflows/deploy.yml # CI/CD
├── .env.example
├── AGENTS.md
├── README.md
└── PROJECT_GUIDE.md            # этот файл
```

---

## 3. Как запускать проект

### Локально (Docker Compose)

```bash
cp .env.example .env
# отредактируй .env

docker-compose up --build
```

Поднимется:

- PostgreSQL на `localhost:5432`
- Django backend на `localhost:8000`
- frontend (nginx) на `localhost:80`

### Создание суперпользователя

```bash
docker-compose exec backend python manage.py createsuperuser
```

### Загрузка анкеты

```bash
docker-compose exec backend python manage.py load_survey
```

### Без Docker (только для разработки бэкенда)

```bash
cd backend
source venv/Scripts/activate      # Windows Git Bash
# venv\Scripts\activate           # Windows cmd
# source venv/bin/activate        # Linux/macOS

pip install -r requirements.txt
python manage.py migrate
python manage.py load_survey
python manage.py createsuperuser
python manage.py runserver
```

---

## 4. Архитектура деплоя

### CI/CD

1. Разработчик пушит в `main`.
2. GitHub Actions собирает два Docker-образа и пушит в GHCR:
   - `ghcr.io/<user>/cauldron_of_everything-backend`
   - `ghcr.io/<user>/cauldron_of_everything-frontend`
3. Actions дергает вебхуки Dokploy.
4. Dokploy стягивает `latest` и перезапускает контейнеры.

### Контейнеры в Dokploy

- **backend**: Python 3.10 + Gunicorn, порт 8000.
- **frontend**: nginx, раздаёт собранный Vite-бандл, порт 80.
- **database**: managed PostgreSQL от Dokploy.

### Важные env-переменные

См. `.env.example` и `README.md`. Критичные для бэкенда:

- `SECRET_KEY`
- `DEBUG=False`
- `DATABASE_URL`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `EMAIL_*` и `NOTIFICATION_EMAIL`

---

## 5. Архитектура бэкенда

### Модели (`backend/survey/models.py`)

| Модель | Назначение |
|---|---|
| `Question` | Вопрос анкеты |
| `Choice` | Вариант ответа |
| `Answer` | Ответ авторизованного пользователя |
| `SurveySubmission` | Результат прохождения от фронтенда |

### API (`backend/survey/views.py`, `urls.py`)

- `POST /api/submissions/` — сохранить результат целиком (открыт, без авторизации).
- `GET /api/submissions/` — список результатов.
- `GET /api/questions/` — активные вопросы с вариантами.
- `POST /api/answers/` — сохранить ответ авторизованного пользователя.
- `POST /api/auth/register/`, `POST /api/auth/token/` — регистрация и JWT-логин.

### Уведомления (`backend/survey/notifications.py`)

При сохранении `SurveySubmission` бэкенд отправляет email на адреса из
`NOTIFICATION_EMAIL`.

Логика отправки синхронная. Для высокой нагрузки её стоит вынести в очередь
(см. раздел «Масштабирование»).

### Админка (`backend/survey/admin.py`)

Через `/admin/` можно просматривать и редактировать вопросы, варианты, ответы
и результаты прохождения анкеты.

---

## 6. Конфигурация анкеты

Анкета задаётся JSON-файлом в `config/`. При деплое бэкенд автоматически
выполняет:

```bash
python manage.py load_survey
```

Это значит, что для изменения вопросов не нужен деплой кода — достаточно
изменить `config/survey.json` и запушить.

### Принцип Config-as-Code

- Единый источник истины — файл в git.
- История изменений вопросов хранится в git.
- Для обновления анкеты не нужна админка или CMS.

### Когда понадобится CMS

Если мастера сами захотят создавать анкеты без разработчика, `config/*.json`
станет неудобен. Тогда стоит добавить:

- UI для создания вопросов/вариантов;
- API для CRUD анкет;
- перенос canonical source из JSON в базу данных;
- `load_survey` оставить как команду импорта, а не обязательный шаг деплоя.

---

## 7. Как добавить новый API-эндпоинт

### Шаг 1. Сериализатор

`backend/survey/serializers.py`:

```python
class MyModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = ('id', 'name', 'created_at')
```

### Шаг 2. View

`backend/survey/views.py`:

```python
from rest_framework.permissions import AllowAny

class MyModelListCreateView(generics.ListCreateAPIView):
    queryset = MyModel.objects.all()
    serializer_class = MyModelSerializer
    permission_classes = [AllowAny]  # или IsAuthenticated
```

### Шаг 3. URL

`backend/survey/urls.py`:

```python
path('my-models/', MyModelListCreateView.as_view(), name='my-model-list-create'),
```

### Шаг 4. Миграции

```bash
cd backend
python manage.py makemigrations survey
python manage.py migrate
```

### Шаг 5. Админка (опционально)

`backend/survey/admin.py`:

```python
@admin.register(MyModel)
class MyModelAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at')
```

---

## 8. Подготовка бэкенда к масштабированию

Текущая реализация подходит для небольшого числа пользователей. Чтобы
подготовиться к росту, стоит сделать следующее.

### 8.1. Тесты

Сейчас `backend/survey/tests.py` пустой. Добавьте тесты:

- моделей и сериализаторов;
- API-эндпоинтов (`/api/submissions/`, `/api/questions/`);
- команды `load_survey`;
- отправки уведомлений (с моком SMTP).

Фреймворк: `django.test.TestCase` + DRF `APITestCase`.

### 8.2. Асинхронные задачи

Уведомления и другие побочные эффекты сейчас выполняются синхронно:

```python
# Плохо при нагрузке
send_submission_notification(submission)
```

Лучше вынести в очередь:

```python
# Хорошо
send_submission_notification.delay(submission.id)
```

Стек: **Celery + Redis** или **Django-Q**.

### 8.3. Кэширование

Добавьте Redis и кэшируйте:

- список активных вопросов `/api/questions/`;
- часто запрашиваемые справочники.

### 8.4. Object Storage для медиа

Сейчас картинки анкеты лежат в volume на сервере (`/app/backend/media`).
При масштабировании за несколько инстансов это не работает.

Решения:

- **AWS S3** + `django-storages`
- **Yandex Object Storage**
- **MinIO** (self-hosted S3)

### 8.5. Мониторинг и health checks

Добавьте эндпоинт:

```python
# backend/core/urls.py
path('health/', lambda r: JsonResponse({'status': 'ok'})),
```

И подключите:

- логирование запросов;
- метрики (Prometheus + Grafana);
- алёртинг на ошибки деплоя и 5xx.

### 8.6. Rate limiting

Для открытых эндпоинтов (`/api/submissions/`) добавьте throttling:

```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10/minute',
    },
}
```

### 8.7. Версионирование API

Когда появятся внешние интеграции, добавьте префикс версии:

```python
# urls.py
path('api/v1/', include('survey.urls')),
```

### 8.8. Аутентификация и авторизация

Сейчас `/api/submissions/` открыт. Для настоящего продукта:

- требовать авторизацию;
- ограничивать доступ к результатам по правам (мастер/игрок);
- добавить роли и группы.

### 8.9. Резервное копирование

Настроить бэкапы:

- PostgreSQL (Dokploy имеет встроенные бэкапы или pg_dump по расписанию);
- медиафайлов (если остаются на volume) или S3-версионирование.

### 8.10. Подключение frontend к API вопросов

Сейчас фронтенд использует статический конфиг анкеты из
`frontend/src/tools/survey/surveys/`. Это дублирует данные в базе и JSON.

Будущий шаг:

- фронтенд при старте делает `GET /api/questions/`;
- удалить статическое определение анкеты;
- `/api/questions/` открыть без авторизации или с токеном сессии.

---

## 9. Полезные команды

### Бэкенд

```bash
# Миграции
python manage.py makemigrations survey
python manage.py migrate

# Суперпользователь
python manage.py createsuperuser

# Загрузить анкету
python manage.py load_survey

# Проверка конфигурации
python manage.py check

# Shell
python manage.py shell
```

### Фронтенд

```bash
npm install
npm run dev
npm run build
npm run lint
```

### Docker

```bash
# Локальный запуск
docker-compose up --build

# Выполнить команду внутри backend-контейнера
docker-compose exec backend python manage.py shell
```

---

## 10. Кому что трогать

- **Владелец/менеджер:** смотрит результат в браузере, даёт задачи, проверяет
  данные в админке `/admin/`.
- **Фронтенд-разработчик:** работает только в `frontend/`.
- **Бэкенд-разработчик:** работает только в `backend/`.
- **AI-агент:** правит обе части только по явному запросу или для связки
  фронтенда с бэкендом.

---

Если что-то непонятно или нужно добавить новый функционал — описывай страницу
или действие, и мы разберём пошагово.
