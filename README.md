# Cauldron of Everything

Монорепозиторий веб-сервиса для настольных ролевых игр. Сейчас реализован первый
модуль — опросник «Zero Session», который собирает предпочтения игроков перед
началом кампании.

**Стек:**

- Backend: Python 3.10, Django 5.2, Django REST Framework, SimpleJWT, PostgreSQL
- Frontend: React 19, TypeScript, Vite
- DevOps: Docker, GitHub Actions, GHCR, Dokploy
- Конфигурация анкет: JSON-файлы в `config/`

---

## Структура репозитория

```
Cauldron_of_Everything/
├── backend/                 # Django + DRF
│   ├── core/                # настройки проекта
│   ├── survey/              # приложение анкеты (модели, API, админка)
│   ├── media/               # загружаемые файлы (картинки анкеты)
│   ├── Dockerfile           # образ бэкенда
│   ├── requirements.txt
│   └── manage.py
├── frontend/                # React + TypeScript + Vite
│   ├── src/
│   ├── public/
│   ├── Dockerfile           # образ фронтенда
│   ├── nginx.conf
│   └── package.json
├── config/                  # JSON-конфиги анкет
│   └── survey.json
├── docker-compose.yml       # локальный запуск всего стека
├── .github/workflows/       # CI/CD
│   └── deploy.yml
├── .env.example             # пример переменных окружения
├── AGENTS.md                # справка для AI-агента
├── PROJECT_GUIDE.md         # путеводитель по проекту
└── README.md                # этот файл
```

### Правила зон ответственности

- **Бэкенд-разработчик** работает в `backend/`.
- **Фронтенд-разработчик** работает в `frontend/`.
- **Конфиги анкет** — в `config/*.json`.
- **Картинки анкеты** — в `backend/media/survey/`.

---

## Быстрый старт (локально)

Локально проект запускается через Docker Compose — поднимается PostgreSQL,
бэкенд и фронтенд.

```bash
# 1. Скопируй пример переменных окружения
cp .env.example .env

# 2. Отредактируй .env (минимум SECRET_KEY и VITE_API_BASE_URL)

# 3. Запусти стек
docker-compose up --build
```

После запуска:

- Фронтенд: http://localhost
- Бэкенд API: http://localhost:8000/api/
- Админка: http://localhost:8000/admin/
- Swagger: http://localhost:8000/api/docs/

### Создание суперпользователя

```bash
docker-compose exec backend python manage.py createsuperuser
```

### Загрузка анкеты из JSON

```bash
docker-compose exec backend python manage.py load_survey
```

---

## Деплой (Dokploy + GitHub Actions)

Проект собирается в GitHub Actions и деплоится в Dokploy из GHCR.

### Архитектура деплоя

```
GitHub → GitHub Actions → GHCR → Dokploy → контейнеры
                                      ├── backend (Django + Gunicorn)
                                      ├── frontend (nginx + статика)
                                      └── PostgreSQL (managed DB в Dokploy)
```

### Настройка

1. **GitHub Secrets / Variables:**
   - `VITE_API_BASE_URL` (Variable) — публичный URL бэкенда, например
     `https://api.cauldronofeverything.ru`

2. **Dokploy — backend:**
   - Provider: Docker
   - Image: `ghcr.io/<user>/cauldron_of_everything-backend:latest`
   - Port: `8000`
   - Env: `SECRET_KEY`, `DEBUG=False`, `DATABASE_URL`, `ALLOWED_HOSTS`,
     `CORS_ALLOWED_ORIGINS`, `EMAIL_HOST`, `EMAIL_PORT`,
     `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `NOTIFICATION_EMAIL`
   - Volume: `/app/backend/media` — для загружаемых файлов
   - Domain: `api.cauldronofeverything.ru`

3. **Dokploy — frontend:**
   - Provider: Docker
   - Image: `ghcr.io/<user>/cauldron_of_everything-frontend:latest`
   - Port: `80`
   - Domain: `cauldronofeverything.ru`

4. **DNS:**
   - `A @ → IP сервера`
   - `A api → IP сервера`

Подробные инструкции по каждому шагу — в `PROJECT_GUIDE.md`.

---

## Переменные окружения

```env
# Django
SECRET_KEY=               # случайный ключ, минимум 50 символов
DEBUG=False               # в продакшене всегда False
ALLOWED_HOSTS=api.cauldronofeverything.ru

# База данных
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# CORS
CORS_ALLOWED_ORIGINS=https://cauldronofeverything.ru

# Email-уведомления о прохождении анкеты
EMAIL_HOST=smtp.yandex.ru
EMAIL_PORT=465
EMAIL_HOST_USER=your@yandex.ru
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=False
EMAIL_USE_SSL=True
DEFAULT_FROM_EMAIL=your@yandex.ru
NOTIFICATION_EMAIL=your@yandex.ru,another@example.com

# Telegram-уведомления (опционально; могут не работать из-за блокировок)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Vite
VITE_API_BASE_URL=https://api.cauldronofeverything.ru
```

Полный пример — в `.env.example`.

---

## API

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/auth/register/` | Регистрация |
| POST | `/api/auth/token/` | Получить JWT access/refresh |
| POST | `/api/auth/token/refresh/` | Обновить access |
| GET | `/api/questions/` | Список активных вопросов |
| GET | `/api/answers/` | Ответы текущего пользователя |
| POST | `/api/answers/` | Сохранить/обновить ответ |
| GET | `/api/submissions/` | Результаты прохождения анкеты |
| POST | `/api/submissions/` | Сохранить результат целиком |
| GET | `/api/docs/` | Swagger UI |

### Сохранение результата анкеты

```bash
curl -X POST https://api.cauldronofeverything.ru/api/submissions/ \
  -H "Content-Type: application/json" \
  -d '{
    "survey_id": "zero-session",
    "player_name": "Алекс",
    "character_name": "Торвин",
    "answers": {"engagement": 3, "mechanic": -2}
  }'
```

---

## Конфигурация анкеты (config-as-code)

Анкета определяется в `config/survey.json`. При деплое бэкенд автоматически
синхронизирует этот файл с базой данных командой `load_survey`.

```json
{
  "title": "Zero Session",
  "questions": [
    {
      "text": "Текст вопроса",
      "image": "survey/example.png",
      "choices": [
        {"text": "Вариант 1"},
        {"text": "Вариант 2", "image": "survey/choice2.png"}
      ]
    }
  ]
}
```

- `image` — опционально, путь относительно `backend/media/`.
- Команда идемпотентна: существующие вопросы обновляются, дублей нет.
- Вопрос ищется по полю `text`.
- `--replace` деактивирует вопросы, отсутствующие в конфиге.

---

## Уведомления

При каждом новом прохождении анкеты бэкенд отправляет email на адреса из
`NOTIFICATION_EMAIL`.

Требования:

- Настроить SMTP (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`,
  `EMAIL_HOST_PASSWORD`).
- Для Yandex/Gmail использовать **пароль приложения**, а не основной пароль.
- Telegram-уведомления реализованы, но могут не работать, если сервер
  блокирует исходящие соединения к `api.telegram.org`.

---

## Безопасность

- `SECRET_KEY`, пароли и токены передаются только через env.
- `DEBUG=False` в продакшене.
- JWT-эндпоинты готовы; `/api/submissions/` пока открыт для удобства
  анонимного прохождения.
- Медиафайлы хранятся в volume Dokploy, при пересоздании контейнера
  не теряются.

---

## Известные ограничения

- Фронтенд пока использует статическое определение анкеты из
  `frontend/src/tools/survey/surveys/`. В будущем вопросы должны
  загружаться с `/api/questions/`.
- Уведомления отправляются синхронно при сохранении результата. При высокой
  нагрузке лучше вынести в очередь (Celery).
- Медиафайлы хранятся на локальном volume, не в S3.
- Автотестов пока нет (`backend/survey/tests.py` пустой).

---

## Что почитать дальше

- `PROJECT_GUIDE.md` — архитектура, добавление новых моделей/API, подготовка
  бэкенда к масштабированию.
- `AGENTS.md` — соглашения по коду и структуре.
