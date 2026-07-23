# Cauldron_of_Everything

Сервис анкетирования: регистрация/авторизация (JWT), экраны вопросов с вариантами
ответов, сохранение результатов. Монорепозиторий: бэкенд + фронтенд + конфиги.

**Стек бэкенда:** Python 3.10, Django 5.2, DRF, SimpleJWT, drf-spectacular (Swagger), SQLite (dev).

## Структура репозитория — куда что класть

```
Cauldron_of_Everything/
├── backend/                 # БЭКЕНД (Django) — зона бэкенд-разработчика
│   ├── core/                # настройки и роутинг проекта
│   ├── survey/              # приложение анкеты (модели, API, админка)
│   ├── media/survey/        # КАРТИНКИ ДЛЯ АНКЕТЫ (вопросов/вариантов)
│   ├── requirements.txt
│   └── manage.py
├── frontend/                # ФРОНТЕНД — зона фронтенд-разработчика
│   └── assets/              # его иконки, фоны, шрифты и прочие ресурсы
├── config/                  # КОНФИГИ — JSON-файлы анкет
│   └── survey.json          # вопросы, варианты, картинки
└── README.md
```

**Правило простое:**
- фронтендер кладёт **всё своё** (код, иконки, фоны, шрифты) в `frontend/` — эта папка полностью его, бэкенд её не трогает;
- тексты вопросов и варианты — в `config/*.json`;
- картинки, на которые ссылается анкета, — в `backend/media/survey/`.

## Запуск всего проекта (сценарий «пользователь по ссылке»)

Полный флоу: пользователь открывает сайт → вводит имя → проходит анкету →
результат сохраняется в базе под введённым именем. Нужны два запущенных сервера:

```bash
# Терминал 1 — бэкенд
cd backend
source venv/Scripts/activate
python manage.py runserver          # http://127.0.0.1:8000

# Терминал 2 — фронтенд (нужен Node.js)
cd frontend
npm install                         # один раз
npm run dev                         # http://localhost:5173
```

Открыть в браузере: **http://localhost:5173**

Результаты прохождений — в админке: http://127.0.0.1:8000/admin/ →
«Результаты анкет» (имя участника, анкета, дата, все ответы).

**Дать ссылку другому человеку в той же Wi-Fi сети:**
1. `npm run dev -- --host` — фронт станет доступен по адресу вида `http://192.168.x.x:5173`;
2. `python manage.py runserver 0.0.0.0:8000` — бэкенд слушает сеть;
3. в `frontend/src/tools/survey/api.ts` поменять `API_BASE_URL` на `http://192.168.x.x:8000`;
4. в `backend/core/settings.py` в `CORS_ALLOWED_ORIGINS` добавить `http://192.168.x.x:5173`.

## Быстрый старт: бэкенд

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash)
# venv\Scripts\activate           # Windows (cmd)
# source venv/bin/activate        # Linux/macOS

pip install -r requirements.txt
python manage.py migrate
python manage.py load_survey      # загрузит ВСЕ *.json из папки config/
python manage.py createsuperuser  # создать админа (один раз)
python manage.py runserver        # http://127.0.0.1:8000
```

- Админка: http://127.0.0.1:8000/admin/ — вопросы, ответы пользователей
- Swagger (документация API): http://127.0.0.1:8000/api/docs/

## Быстрый старт: фронтенд

Стянул репозиторий → работаешь в папке `frontend/`, больше ничего не нужно.
Общие ресурсы размещай в `frontend/src/shared/`, а ресурсы отдельного инструмента
— внутри `frontend/src/tools/<tool-id>/` или его каталога в `frontend/public/tools/`.
API бэкенда: см. Swagger http://127.0.0.1:8000/api/docs/ (попроси бэкендера запустить сервер).

## Анкета из JSON-конфига (без правок кода)

Все вопросы лежат в `config/survey.json`. Изменил файл → применил команду:

```bash
cd backend
python manage.py load_survey             # все *.json из config/
python manage.py load_survey survey.json # конкретный файл
python manage.py load_survey --replace   # + скрыть вопросы, которых нет в файлах
```

Формат:

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

- порядок вопросов на сайте = порядок в файле;
- вариантов столько, сколько написано в `choices` (минимум 2);
- `image` — необязательно и у вопроса, и у варианта; файл кладётся в `backend/media/survey/`, в конфиге пишется `survey/имя_файла.png`;
- команда идемпотентна: повторный запуск обновляет существующее, дублей нет;
- вопрос ищется по тексту: изменил формулировку → создастся новый вопрос, старый скрывай через `--replace`. Ответы пользователей не теряются;
- можно держать несколько анкет: `config/survey.json`, `config/onboarding.json` и т.д. — `load_survey` без аргументов подхватит все.

## API

Все эндпоинты, кроме регистрации и логина, требуют `Authorization: Bearer <access_token>`.

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/auth/register/` | Регистрация: `{"username": "...", "password": "..."}` (пароль ≥ 8) |
| POST | `/api/auth/token/` | Логин → `{"access": "...", "refresh": "..."}` |
| POST | `/api/auth/token/refresh/` | Обновить access-токен: `{"refresh": "..."}` |
| GET | `/api/questions/` | Вопросы с вариантами (по порядку) |
| POST | `/api/answers/` | Ответ: `{"question": <id>, "choice": <id>}`, повтор перезаписывает |
| GET | `/api/answers/` | Ответы текущего пользователя |
| POST | `/api/submissions/` | **Без авторизации.** Сохранить результат прохождения анкеты целиком (формат фронтенда) |

### Отправка результата анкеты (основной сценарий)

Фронтенд проходит анкету по своему конфигу и в конце отправляет результат одним запросом:

```ts
fetch('http://127.0.0.1:8000/api/submissions/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    survey_id: result.surveyId,      // 'zero-session'
    player_name: result.playerName,  // имя со стартового экрана
    answers: result.answers,         // {engagement: 3, mechanic: -2, ...}
  }),
})
```

Ответ `201` — сохранено, `400` — ошибка валидации (текст в теле ответа).
Сохранённые результаты смотреть в админке: `/admin/` → «Результаты анкет».

### Флоу для фронтенда (режим с авторизацией, Фаза 2)

1. Регистрация/логин → сохранить `access` + `refresh`;
2. `GET /api/questions/` → экраны вопросов (по одному, в полученном порядке);
3. Выбор варианта → `POST /api/answers/`;
4. Результаты → `GET /api/answers/`;
5. Access-токен истёк (60 мин) → `POST /api/auth/token/refresh/`.

### Пример: вопрос

```json
{
  "id": 6,
  "text": "Как часто вы пользуетесь нашим сервисом?",
  "image": "http://127.0.0.1:8000/media/survey/example.png",
  "choices": [
    {"id": 21, "text": "Каждый день", "image": null},
    {"id": 22, "text": "Несколько раз в неделю", "image": null}
  ]
}
```

`image` — готовый URL для `<img src>` либо `null`.

## CORS

В `backend/core/settings.py` в `CORS_ALLOWED_ORIGINS` разрешены `localhost:3000`
и `localhost:5173`. Другой порт фронта — добавьте туда.
