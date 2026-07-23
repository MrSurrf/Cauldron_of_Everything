# Cauldron of Everything — справка для AI-агента

Этот файл содержит фактическую информацию о проекте, нужную для работы с кодом. Проект — монорепозиторий бэкенда (Django) и фронтенда (React + TypeScript + Vite) для модульного веб-сервиса настольных ролевых игр.

Основной язык документации, комментариев и UI-копии — русский.

---

## 1. Обзор проекта

`Cauldron of Everything` — будущий веб-сервис и мультитул для настольных ролевых игр, в первую очередь D&D. Он предназначен для игроков, мастеров и авторов материалов и должен объединить связанные инструменты в одном настраиваемом рабочем пространстве.

Основные направления развития:

- база правил и материалов, статьи и обучающие курсы с возможностью публикации контента;
- интерактивные листы персонажей, стат-блоки монстров, подборки заклинаний и другие связанные игровые сущности;
- подготовка и проведение игр: расчёт энкаунтеров, генерация наград и поиск игроков;
- визуальный редактор кампаний в формате интерактивной схемы, связывающей персонажей, NPC, локации, квесты, монстров, энкаунтеры и отношения между ними.

Опросники и голосования — вспомогательные инструменты для мастеров и сбора статистики, а не основа продукта. Текущий опросник — первый почти завершённый пробный модуль, на котором проверялись архитектура, дизайн и взаимодействие фронтенда с бэкендом. Остальные перечисленные возможности пока являются планами и не должны считаться реализованными.

Монорепозиторий разделён на три зоны:

- `backend/` — Django + DRF; сейчас в основном содержит API, хранение результатов и админку пробного опросника.
- `frontend/` — модульное React-приложение (Vite), где опросник изолирован как первый инструмент и заложена структура будущего workspace.
- `config/` — JSON-файлы пробного опросника для команды `load_survey`.

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
│   │   └── tools/
│   │       └── survey/      # изображения автономного опросника
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app/             # корневая оболочка и глобальные стили
│   │   ├── pages/           # будущие тонкие точки входа URL
│   │   ├── workspace/       # контракты и будущая плиточная платформа
│   │   ├── tools/
│   │   │   └── survey/      # изолированный рабочий опросник
│   │   │       ├── pages/
│   │   │       ├── results/
│   │   │       ├── surveys/
│   │   │       ├── App.tsx
│   │   │       └── api.ts
│   │   ├── entities/        # будущие общие предметные сущности
│   │   ├── shared/          # дизайн-токены и общий UI
│   │   └── ARCHITECTURE.md
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
- `frontend/src/app/App.tsx` — тонкая корневая оболочка.
- Рабочий опросник изолирован в `frontend/src/tools/survey/`.
- Пока workspace не реализован, оболочка запускает `SurveyApp`.
- Переключение экранов опросника реализовано в `tools/survey/App.tsx` через локальный стейт:
  - `StartPage` — пока не введено имя.
  - `SurveyPage` — прохождение анкеты.
  - Экран завершения — после получения результата.
- Глобальный стейт отсутствует (нет Redux, Context и т.п.), используется `useState`.

### 5.2. Прохождение анкеты

- Анкета определена статически в `frontend/src/tools/survey/surveys/zeroSessionSurvey.ts`.
- `id` анкеты: `'zero-session'`.
- 11 тем: `engagement`, `mechanic`, `seriousness`, `romance`, `violence`, `lore`, `sandbox`, `horror`, `partyConflict`, `characterDeath`, `discrimination`.
- Шкала: 11 значений от `-5` до `+5`.
- У каждого значения есть описание, у каждого вопроса — набор иллюстраций.
- После последнего вопроса результат отправляется на бэкенд и показывается summary.

### 5.3. Взаимодействие с бэкендом

- Используемые эндпоинты: `POST /api/submissions/` (сохранение) и `GET /api/submissions/` (список результатов).
- Адрес бэкенда захардкожен в `frontend/src/tools/survey/api.ts`:
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

- Глобальные стили: `frontend/src/app/styles/global.css`.
- Дизайн-токены: `frontend/src/shared/styles/tokens.css`.
- Компонентные стили опросника лежат рядом с компонентами в `tools/survey/pages/`.
- Изображения опросника доступны по путям `/tools/survey/start/...` и `/tools/survey/illustrations/...`.
- Общие шрифты доступны по пути `/fonts/...`.

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
3. В `frontend/src/tools/survey/api.ts` изменить `API_BASE_URL` на IP бэкенда.
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
- Компоненты URL-страниц располагаются в `src/pages/`.
- Код сложных инструментов располагается в `src/tools/<tool-id>/`.
- Текущий опросник находится в `src/tools/survey/`, его определения — в `src/tools/survey/surveys/`.
- Инструменты подключаются через публичный `index.ts` и не импортируют внутренние файлы друг друга.
- Общие UI-примитивы размещаются в `src/shared/ui/`, платформенные компоненты плиток — в `src/workspace/ui/`.
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

3. **`<title>` в `frontend/index.html`** — стандартный `frontend`, не переименован под проект.

---

## 11. Полезные ссылки внутри проекта

- Корневой `README.md` — подробная инструкция по запуску и формату JSON-конфига.
- `frontend/README.md` — краткие правила для фронтенд-разработчика.
- `backend/requirements.txt` — Python-зависимости.
- `frontend/package.json` — npm-зависимости и скрипты.
- `config/survey.json` — пример конфигурации анкеты для `load_survey`.
