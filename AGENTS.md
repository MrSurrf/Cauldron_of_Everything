# Cauldron of Everything — справка для AI-агента

Этот файл содержит фактическую информацию о проекте, нужную для работы с кодом. Проект — монорепозиторий бэкенда (Django) и фронтенда (React + TypeScript + Vite) для сервиса анкетирования.

Основной язык документации, комментариев и UI-копии — русский.

---

## 1. Обзор проекта

`Cauldron_of_Everything` — сервис прохождения анкеты:

- Пользователь открывает сайт, вводит имя на стартовом экране.
- Проходит анкету из фиксированного набора тем (шкала от -5 до +5).
- Результат отправляется на бэкенд и сохраняется в базе данных.
- Результаты можно просматривать в Django-админке.

Монорепозиторий разделён на три зоны:

- `backend/` — Django + DRF, хранение результатов, админка, API.
- `frontend/` — React-приложение (Vite), код и ресурсы фронтенд-разработчика.
- `config/` — JSON-файлы с вопросами/вариантами для команды `load_survey`.

Важное правило рабочего процесса: фронтенд-разработчик работает только в `frontend/`, бэкенд-разработчик не трогает эту папку. Тексты вопросов — в `config/*.json`, картинки анкеты — в `backend/media/survey/`.

---

## 2. Технологический стек

### Бэкенд

| Компонент | Версия / инструмент |
|---|---|
| Python | 3.10 |
| Django | 5.2.16 |
| Django REST Framework | 3.17.1 |
| Аутентификация | djangorestframework-simplejwt 5.5.1 |
| CORS | django-cors-headers 4.9.0 |
| Документация API | drf-spectacular 0.30.0 (Swagger UI) |
| Изображения | Pillow 12.3.0 |
| База данных (dev) | SQLite (`backend/db.sqlite3`) |

Полный список зависимостей — `backend/requirements.txt`.

### Фронтенд

| Компонент | Версия / инструмент |
|---|---|
| React | 19.2.7 |
| React DOM | 19.2.7 |
| TypeScript | ~6.0.2 |
| Сборщик | Vite 8.1.1 |
| Линтер | ESLint 10 (flat config) + typescript-eslint + react-hooks + react-refresh |
| Менеджер пакетов | npm |

Полный список зависимостей — `frontend/package.json`.

---

## 3. Структура репозитория

```
Cauldron_of_Everything/
├── backend/                 # Django-проект
│   ├── core/                # настройки проекта (settings, urls, wsgi, asgi)
│   ├── survey/              # приложение анкеты: модели, API, админка, команды
│   │   ├── management/
│   │   │   └── commands/
│   │   │       └── load_survey.py
│   │   ├── migrations/
│   │   ├── admin.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── views.py
│   │   └── tests.py         # пустой заглушка
│   ├── media/               # загружаемые файлы (картинки анкеты)
│   │   └── survey/
│   ├── db.sqlite3
│   ├── manage.py
│   ├── requirements.txt
│   ├── test_resp2.json      # артефакт тестового запроса
│   └── test_resp3.json      # артефакт тестового запроса
├── frontend/                # React + TypeScript + Vite
│   ├── public/              # статика, доступная по корневому пути
│   │   ├── favicon.svg
│   │   ├── fonts/
│   │   ├── icons.svg
│   │   ├── start/           # изображения стартовой страницы
│   │   └── survey/          # иллюстрации вопросов
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── index.css
│   │   ├── App.css          # не используется App.tsx (остаток шаблона Vite)
│   │   ├── pages/
│   │   │   ├── StartPage.tsx
│   │   │   ├── StartPage.css
│   │   │   ├── SurveyPage.tsx
│   │   │   ├── SurveyPage.css
│   │   │   ├── GmResultsPage.tsx
│   │   │   └── GmResultsPage.css
│   │   ├── results/
│   │   │   └── mockSurveyResults.ts
│   │   └── surveys/
│   │       ├── surveyTypes.ts
│   │       └── zeroSessionSurvey.ts
│   ├── assets/              # зарезервировано под ресурсы (пока пусто)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── eslint.config.js
├── config/                  # JSON-конфиги анкет
│   └── survey.json
├── .vscode/                 # настройки VS Code
│   ├── settings.json
│   └── launch.json
├── .gitignore
├── README.md
└── AGENTS.md                # этот файл
```

---

## 4. Архитектура бэкенда

### 4.1. Django-проект и приложение

- Проект: `core` (`backend/core/`).
- Единственное приложение: `survey` (`backend/survey/`).
- Всё доменное поведение (модели, API, админка, management-команда) сосредоточено в `survey`.

### 4.2. Модели (`backend/survey/models.py`)

| Модель | Назначение | Ключевые поля |
|---|---|---|
| `Question` | Вопрос анкеты | `text`, `image`, `order`, `is_active` |
| `Choice` | Вариант ответа | FK `question` (related_name `choices`), `text`, `image`, `order` |
| `Answer` | Ответ авторизованного пользователя | FK `user`, FK `question`, FK `choice`, `created_at`, `updated_at` |
| `SurveySubmission` | Результат прохождения от фронтенда | `survey_id`, `player_name`, `character_name`, `answers` (JSON), `created_at` |

- `Question` и `Choice` упорядочены по `order`, затем `id`.
- У `Answer` есть unique-констрейнт на пару `(user, question)` — повторный ответ перезаписывается.
- `SurveySubmission` не требует авторизации и хранит сырые ответы фронтенда.

### 4.3. API-эндпоинты

Аутентификация — JWT. По умолчанию требуется авторизация (`IsAuthenticated`), кроме явно открытых эндпоинтов.

| Метод | URL | Авторизация | Описание |
|---|---|---|---|
| POST | `/api/auth/register/` | нет | Регистрация: `{"username", "password"}` (пароль ≥ 8) |
| POST | `/api/auth/token/` | нет | Получение access/refresh токенов |
| POST | `/api/auth/token/refresh/` | нет | Обновление access-токена |
| GET | `/api/questions/` | JWT | Список активных вопросов с вариантами |
| GET | `/api/answers/` | JWT | Ответы текущего пользователя |
| POST | `/api/answers/` | JWT | Сохранить/перезаписать ответ `{"question", "choice"}` |
| GET | `/api/submissions/` | нет | Список результатов прохождения анкеты |
| POST | `/api/submissions/` | нет | Сохранить результат целиком от фронтенда |
| GET | `/api/schema/` | нет | OpenAPI-схема |
| GET | `/api/docs/` | нет | Swagger UI |

### 4.4. Загрузка анкеты из JSON

Команда: `python manage.py load_survey [имя_файла] [--replace]`

- Без аргументов загружает все `*.json` из `config/`.
- Можно указать конкретный файл из `config/` или полный путь.
- `--replace` деактивирует вопросы, тексты которых отсутствуют в загруженных файлах.
- Идемпотентна: существующие вопросы обновляются, дублей не создаёт.
- Вопрос ищется по полю `text`, вариант — по паре `(question, text)`.

Формат JSON:

```json
{
  "title": "Анкета обратной связи",
  "questions": [
    {
      "text": "Текст вопроса",
      "image": "survey/example.png",
      "choices": [
        { "text": "Вариант 1" },
        { "text": "Вариант 2", "image": "survey/choice2.png" }
      ]
    }
  ]
}
```

- `image` необязательно и у вопроса, и у варианта.
- Путь к картинке пишется относительно `backend/media/`, то есть `survey/имя_файла.png`.

### 4.5. Настройки (`backend/core/settings.py`)

- `DEBUG = True`, `ALLOWED_HOSTS = []`.
- `SECRET_KEY` захардкожен — только для разработки.
- БД: SQLite в `backend/db.sqlite3`.
- `LANGUAGE_CODE = 'ru-ru'`, `TIME_ZONE = 'Europe/Moscow'`.
- CORS разрешён для `localhost:3000`, `127.0.0.1:3000`, `localhost:5173`, `127.0.0.1:5173`.
- JWT: access — 60 минут, refresh — 7 дней.
- Медиафайлы: `MEDIA_URL = 'media/'`, `MEDIA_ROOT = BASE_DIR / 'media'`.
- `SURVEY_CONFIG_DIR` указывает на корневую папку `config/`.

---

## 5. Архитектура фронтенда

### 5.1. Общее устройство

- Одностраничное React-приложение без роутера.
- Переключение экранов реализовано в `App.tsx` через локальный стейт:
  - `StartPage` — пока не введено имя.
  - `SurveyPage` — прохождение анкеты.
  - Экран завершения — после получения результата.
- Глобальный стейт отсутствует (нет Redux, Context и т.п.), используется `useState`.

### 5.2. Прохождение анкеты

- Анкета определена статически в `frontend/src/surveys/zeroSessionSurvey.ts`.
- `id` анкеты: `'zero-session'`.
- 10 тем: `engagement`, `mechanic`, `seriousness`, `romance`, `violence`, `lore`, `sandbox`, `horror`, `partyConflict`, `characterDeath`, `discrimination`.
- Шкала: 11 значений от `-5` до `+5`.
- У каждого значения есть описание, у каждого вопроса — набор иллюстраций.
- После последнего вопроса результат отправляется на бэкенд и показывается summary.

### 5.3. Взаимодействие с бэкендом

- Используемые эндпоинты: `POST /api/submissions/` (сохранение) и `GET /api/submissions/` (список результатов).
- Адрес бэкенда захардкожен в `frontend/src/api.ts`:
  ```ts
  const API_BASE_URL = 'http://127.0.0.1:8000'
  ```
- Тело запроса:
  ```json
  {
    "survey_id": "zero-session",
    "player_name": "Имя участника",
    "character_name": "Имя персонажа",
    "answers": { "engagement": 3, "mechanic": -2, ... }
  }
  ```
- Страница результатов мастера (`#/gm`) загружает список через `GET /api/submissions/`.
- Ошибки сохранения логируются в консоль, UI всё равно показывает завершение.

### 5.4. Стили и ресурсы

- Глобальные стили: `frontend/src/index.css` (шрифты, сброс, тёмный фон).
- Компонентные стили: `StartPage.css`, `SurveyPage.css`, `GmResultsPage.css`.
- `App.css` не импортируется в `App.tsx` — остаток от шаблона Vite.
- Изображения и шрифты лежат в `frontend/public/` и доступны по абсолютным путям (`/start/...`, `/survey/...`, `/fonts/...`).
- `frontend/assets/` зарезервирована под будущие ресурсы, сейчас пуста.

---

## 6. Команды сборки и запуска

### Бэкенд

```bash
cd backend
python -m venv venv
source venv/Scripts/activate        # Windows Git Bash
# venv\Scripts\activate             # Windows cmd
# source venv/bin/activate          # Linux/macOS

pip install -r requirements.txt
python manage.py migrate
python manage.py load_survey        # загружает config/*.json
python manage.py createsuperuser    # один раз
python manage.py runserver          # http://127.0.0.1:8000
```

Полезные URL:

- Админка: `http://127.0.0.1:8000/admin/`
- Swagger: `http://127.0.0.1:8000/api/docs/`

### Фронтенд

```bash
cd frontend
npm install          # один раз
npm run dev          # http://localhost:5173
npm run build        # production-сборка в dist/
npm run preview      # превью собранного приложения
npm run lint         # запуск ESLint
```

### Запуск всего проекта локально

```bash
# Терминал 1 — бэкенд
cd backend
source venv/Scripts/activate
python manage.py runserver

# Терминал 2 — фронтенд
cd frontend
npm run dev
```

Открывать `http://localhost:5173`.

### Доступ по локальной сети

1. `npm run dev -- --host` — фронт станет доступен по IP.
2. `python manage.py runserver 0.0.0.0:8000` — бэкенд слушает сеть.
3. В `frontend/src/api.ts` изменить `API_BASE_URL` на IP бэкенда.
4. В `backend/core/settings.py` в `CORS_ALLOWED_ORIGINS` добавить адрес фронтенда.

---

## 7. Стиль кода и соглашения

### Python / Django

- Стандартный Django-стиль: PEP 8.
- Импорты: сначала стандартная библиотека, затем сторонние пакеты, затем локальные модули.
- Docstring'и и комментарии — на русском.
- Классы админки, сериализаторов и вью — явно именованы.
- Вью наследуются от `generics.*` DRF.

### TypeScript / React

- Функциональные компоненты и хуки.
- Типы импортируются отдельно: `import type { ... }`.
- Компоненты страниц расположены в `src/pages/`, определения анкет — в `src/surveys/`.
- CSS-файлы располагаются рядом с компонентами.
- BEM-подобные имена классов: `.start-page__scene`, `.survey-scale__button--selected`.

### Общие правила расположения файлов

- Фронтенд-разработчик работает только в `frontend/`.
- JSON-конфиги анкет — только в `config/`.
- Картинки анкеты (те, на которые ссылается `config/*.json`) — в `backend/media/survey/`.

---

## 8. Тестирование

- В бэкенде `backend/survey/tests.py` существует, но пуст (только импорт `TestCase`).
- Во фронтенде тестов нет.
- Для запуска Django-тестов (когда они появятся):
  ```bash
  cd backend
  source venv/Scripts/activate
  python manage.py test
  ```
- Для линтинга фронтенда: `cd frontend && npm run lint`.

---

## 9. Безопасность и развёртывание

### Что нужно исправить перед продакшеном

1. **SECRET_KEY захардкожен** в `backend/core/settings.py`. Нужно брать из переменной окружения.
2. **`DEBUG = True`** и `ALLOWED_HOSTS = []` — неприемлемо для продакшена.
3. **CORS** настроен только на dev-адреса `localhost`/`127.0.0.1`.
4. **База данных** — SQLite, подходит только для разработки.
5. **Медиафайлы** в dev раздаются Django (`static()` в `urls.py`). В продакшене нужен nginx/CDN.
6. **`SurveySubmissionListCreateView` доступен без авторизации** — это осознанный выбор для текущего флоу, но при включении авторизации нужно будет пересмотреть.

### Развёртывание

Проект не содержит готовых конфигов деплоя (Docker, CI/CD, nginx, systemd и т.п.). Текущий способ запуска — локальные dev-серверы Django и Vite.

---

## 10. Известные проблемы и странности кода

Эти моменты стоит знать перед правками:

1. **Фронтенд не использует JWT-эндпоинты**: регистрация, логин, `/api/questions/`, `/api/answers/` реализованы на бэкенде, но фронтенд шлёт результат напрямую в `/api/submissions/` без авторизации.

2. **Артефакты в корне `backend/`**: `test_resp2.json` и `test_resp3.json` — это, по-видимому, остатки ручных тестовых запросов, не часть приложения.

3. **`App.css` не используется** в `App.tsx`.

4. **`<title>` в `frontend/index.html`** — стандартный `frontend`, не переименован под проект.

---

## 11. Полезные ссылки внутри проекта

- Корневой `README.md` — подробная инструкция по запуску и формату JSON-конфига.
- `frontend/README.md` — краткие правила для фронтенд-разработчика.
- `backend/requirements.txt` — Python-зависимости.
- `frontend/package.json` — npm-зависимости и скрипты.
- `config/survey.json` — пример конфигурации анкеты для `load_survey`.
