# Путеводитель по проекту Cauldron of Everything

Этот файл поможет тебе ориентироваться в проекте, понимать, откуда что запускается, и расширять функциональность.

---

## 1. Общий обзор

Проект — монорепозиторий из двух частей:

- **backend/** — серверная часть на Django + Django REST Framework. Хранит данные, раздаёт API, есть админка.
- **frontend/** — клиентская часть на React + TypeScript + Vite. То, что видит пользователь в браузере.
- **config/** — JSON-файлы с вопросами для команды загрузки анкеты.

Правило разделения зон:

- **Фронтенд-разработчик** работает только в `frontend/`.
- **Бэкенд-разработчик** работает только в `backend/`.
- Тексты вопросов и картинки анкеты — в `config/` и `backend/media/survey/`.

---

## 2. Структура папок

```
Cauldron_of_Everything/
├── backend/                    # Django-проект
│   ├── core/                   # настройки Django (settings, urls)
│   ├── survey/                 # приложение анкеты
│   │   ├── models.py           # модели базы данных
│   │   ├── views.py            # API-обработчики
│   │   ├── urls.py             # маршруты API
│   │   ├── serializers.py      # преобразование данных для API
│   │   ├── admin.py            # настройка Django-админки
│   │   └── migrations/         # миграции базы данных
│   ├── media/survey/           # картинки анкеты
│   ├── db.sqlite3              # файл базы данных
│   ├── manage.py               # главная команда Django
│   ├── requirements.txt        # Python-зависимости
│   └── venv/                   # виртуальное окружение
├── frontend/                   # React-приложение
│   ├── public/                 # статика (шрифты, картинки, favicon)
│   │   ├── fonts/              # шрифты Gilroy и GothicRus
│   │   ├── start/              # картинки стартовой страницы
│   │   └── survey/             # иллюстрации вопросов
│   ├── src/                    # исходный код
│   │   ├── main.tsx            # точка входа
│   │   ├── App.tsx             # главный компонент, переключает экраны
│   │   ├── api.ts              # функции для общения с бэкендом
│   │   ├── index.css           # глобальные стили + @font-face
│   │   ├── pages/              # страницы приложения
│   │   │   ├── StartPage.tsx
│   │   │   ├── SurveyPage.tsx
│   │   │   ├── GmResultsPage.tsx
│   │   │   └── *.css           # стили рядом с компонентами
│   │   ├── surveys/            # конфигурации анкет
│   │   │   ├── surveyTypes.ts
│   │   │   └── zeroSessionSurvey.ts
│   │   └── results/            # вспомогательные данные для результатов
│   │       └── mockSurveyResults.ts
│   ├── index.html              # HTML-шаблон
│   ├── package.json            # зависимости и скрипты npm
│   └── vite.config.ts          # настройки Vite
├── config/                     # JSON-конфиги анкет
│   └── survey.json
└── AGENTS.md                   # справка для AI-агента
```

---

## 3. Как запускать проект

### Бэкенд

```bash
cd backend
source venv/Scripts/activate      # Windows Git Bash
# venv\Scripts\activate           # Windows cmd
# source venv/bin/activate        # Linux/macOS

python manage.py runserver        # http://127.0.0.1:8000
```

Полезные URL:

- Админка: `http://127.0.0.1:8000/admin/` (логин `admin`, пароль `admin`)
- API: `http://127.0.0.1:8000/api/`
- Документация API: `http://127.0.0.1:8000/api/docs/`

### Фронтенд

```bash
cd frontend
npm install          # один раз
npm run dev          # http://localhost:5173
```

Другие скрипты:

```bash
npm run build        # собрать production-версию в dist/
npm run preview      # посмотреть собранную версию
npm run lint         # проверить код линтером
```

### Запуск всего вместе

1. Терминал 1: запусти бэкенд (`python manage.py runserver`).
2. Терминал 2: запусти фронтенд (`npm run dev`).
3. Открывай `http://localhost:5173`.

---

## 4. Архитектура фронтенда

### Точка входа

Файл `frontend/src/main.tsx` рендерит `App` и подключает глобальные стили `index.css`.

### Главный компонент

`frontend/src/App.tsx` управляет состоянием приложения:

- Показывает `StartPage`, пока не введено имя.
- Показывает `SurveyPage` для прохождения опроса.
- Показывает экран завершения после опроса.
- Если URL содержит `#/gm`, показывает `GmResultsPage`.

Переключение экранов реализовано через `useState`, а не через роутер.

### Страницы

Каждая страница — отдельный компонент в `frontend/src/pages/`:

- `StartPage.tsx` — стартовый экран с вводом имени и персонажа.
- `SurveyPage.tsx` — прохождение анкеты.
- `GmResultsPage.tsx` — страница результатов для мастера.

Каждая страница имеет свой CSS-файл рядом.

### API

Все запросы к бэкенду собраны в `frontend/src/api.ts`:

- `sendSurveyResult(result)` — отправляет результат опроса.
- `fetchSubmissions()` — получает список результатов для `#/gm`.

Адрес бэкенда захардкожен:

```ts
const API_BASE_URL = 'http://127.0.0.1:8000'
```

Если бэкенд переедет на другой адрес — меняй здесь.

---

## 5. Архитектура бэкенда

### Модели

Все модели в `backend/survey/models.py`:

- `Question` — вопрос анкеты.
- `Choice` — вариант ответа.
- `Answer` — ответ авторизованного пользователя.
- `SurveySubmission` — результат прохождения от фронтенда.

### API

Эндпоинты настроены в `backend/survey/urls.py` и `backend/core/urls.py`:

- `POST /api/submissions/` — сохранить результат.
- `GET /api/submissions/` — получить список результатов.
- `GET /api/questions/` — список вопросов (требует авторизации JWT).
- `POST /api/auth/register/`, `POST /api/auth/token/` — регистрация и вход.

### Админка

`backend/survey/admin.py` настраивает, как модели выглядят в админке.

---

## 6. Как добавить новую страницу

### Шаг 1. Создать компонент страницы

Создай файл `frontend/src/pages/MyNewPage.tsx`:

```tsx
import './MyNewPage.css'

type MyNewPageProps = {
  onBack: () => void
}

function MyNewPage({ onBack }: MyNewPageProps) {
  return (
    <main className="my-new-page">
      <h1>Новая страница</h1>
      <button onClick={onBack}>Назад</button>
    </main>
  )
}

export default MyNewPage
```

### Шаг 2. Добавить стили

Создай файл `frontend/src/pages/MyNewPage.css`:

```css
.my-new-page {
  padding: 40px;
  color: #ffffff;
}
```

### Шаг 3. Подключить страницу в App.tsx

```tsx
import { useState } from 'react'
import StartPage from './pages/StartPage'
import SurveyPage from './pages/SurveyPage'
import GmResultsPage from './pages/GmResultsPage'
import MyNewPage from './pages/MyNewPage'

function App() {
  const [screen, setScreen] = useState<'start' | 'survey' | 'results' | 'new'>('start')

  if (window.location.hash === '#/gm') {
    return <GmResultsPage />
  }

  if (screen === 'new') {
    return <MyNewPage onBack={() => setScreen('start')} />
  }

  if (screen === 'survey') {
    return <SurveyPage ... />
  }

  return <StartPage onStart={() => setScreen('survey')} />
}
```

---

## 7. Как добавить кнопку, открывающую другую страницу

Если кнопка находится внутри `App.tsx`:

```tsx
<button onClick={() => setScreen('new')}>
  Открыть новую страницу
</button>
```

Если кнопка находится в дочернем компоненте, передай функцию через props:

```tsx
// MyComponent.tsx
type MyComponentProps = {
  onOpenNewPage: () => void
}

function MyComponent({ onOpenNewPage }: MyComponentProps) {
  return <button onClick={onOpenNewPage}>Перейти</button>
}
```

```tsx
// App.tsx
<MyComponent onOpenNewPage={() => setScreen('new')} />
```

---

## 8. Как добавить новый API-эндпоинт на бэкенде

### Шаг 1. Добавить сериализатор (если нужно)

В `backend/survey/serializers.py`:

```python
class MyModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = ('id', 'name')
```

### Шаг 2. Добавить view

В `backend/survey/views.py`:

```python
class MyModelListCreateView(generics.ListCreateAPIView):
    queryset = MyModel.objects.all()
    serializer_class = MyModelSerializer
    permission_classes = [AllowAny]
```

### Шаг 3. Добавить маршрут

В `backend/survey/urls.py`:

```python
path('my-models/', MyModelListCreateView.as_view(), name='my-model-list-create'),
```

### Шаг 4. Использовать на фронтенде

В `frontend/src/api.ts`:

```ts
export async function fetchMyModels(): Promise<MyModel[]> {
  const response = await fetch(`${API_BASE_URL}/api/my-models/`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}
```

---

## 9. Как добавить новую модель в базу данных

### Шаг 1. Описать модель

В `backend/survey/models.py`:

```python
class MyModel(models.Model):
    name = models.CharField('Название', max_length=100)
    created_at = models.DateTimeField('Создано', auto_now_add=True)

    class Meta:
        verbose_name = 'Моя модель'
        verbose_name_plural = 'Мои модели'

    def __str__(self):
        return self.name
```

### Шаг 2. Создать и применить миграцию

```bash
cd backend
source venv/Scripts/activate
python manage.py makemigrations survey
python manage.py migrate survey
```

### Шаг 3. Зарегистрировать в админке (опционально)

В `backend/survey/admin.py`:

```python
@admin.register(MyModel)
class MyModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
```

---

## 10. Где хранятся данные

База данных — SQLite, файл:

```
backend/db.sqlite3
```

Смотреть можно:

1. В Django-админке: `http://127.0.0.1:8000/admin/`.
2. В Django shell:
   ```bash
   cd backend
   source venv/Scripts/activate
   python manage.py shell
   ```
   ```python
   from survey.models import SurveySubmission
   for s in SurveySubmission.objects.all():
       print(s.player_name, s.answers)
   ```
3. Через любой SQLite-viewer, открыв файл `backend/db.sqlite3`.

---

## 11. Полезные команды

### Бэкенд

```bash
# Запуск
python manage.py runserver

# Миграции
python manage.py makemigrations survey
python manage.py migrate

# Создать суперпользователя
python manage.py createsuperuser

# Загрузить анкету из config/
python manage.py load_survey

# Django shell
python manage.py shell

# Проверка
python manage.py check
```

### Фронтенд

```bash
# Установка зависимостей
npm install

# Dev-сервер
npm run dev

# Сборка
npm run build

# Preview
npm run preview

# Линтер
npm run lint
```

---

## 12. Как выложить сервис в интернет

Чтобы другие люди могли пройти анкету по ссылке, нужно развернуть бэкенд и фронтенд на сервере с доступом в интернет.

### Общая схема

```
Пользователь → Домен (https://your-site.com)
                ↓
            Nginx
        ┌──────┴──────┐
   Фронтенд (статика)  Бэкенд (Django + Gunicorn)
        ↓                    ↓
      dist/            PostgreSQL
```

Есть два подхода: **ручной деплой** (быстрее настроить один раз) и **Docker** (удобнее поддерживать долгосрочно).

---

### Вариант А. Ручной деплой без Docker

#### Шаг 1. Арендовать сервер

Подойдёт любой VPS с Ubuntu, например:

- Hetzner Cloud
- Timeweb Cloud
- Selectel
- Yandex Cloud
- Beget / Reg.ru

Минимальные требования: 1 CPU, 1–2 GB RAM, 10–20 GB SSD.

#### Шаг 2. Купить домен и настроить DNS

1. Купить домен у регистратора.
2. В панели управления DNS добавить A-запись:
   - Имя: `@`
   - Значение: IP-адрес сервера
3. Дождаться обновления DNS (обычно от нескольких минут до нескольких часов).

#### Шаг 3. Подготовить бэкенд к продакшену

В `backend/core/settings.py` нужно внести изменения:

1. **SECRET_KEY** вынести в переменную окружения:
   ```python
   import os
   SECRET_KEY = os.environ.get('SECRET_KEY')
   ```
2. **DEBUG = False**
3. **ALLOWED_HOSTS** указать свой домен:
   ```python
   ALLOWED_HOSTS = ['your-site.com', 'www.your-site.com']
   ```
4. **CORS** заменить dev-адреса на продакшеновый домен:
   ```python
   CORS_ALLOWED_ORIGINS = ['https://your-site.com']
   ```
5. **База данных** перейти с SQLite на PostgreSQL:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'cauldron_db',
           'USER': 'cauldron_user',
           'PASSWORD': os.environ.get('DB_PASSWORD'),
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }
   ```
6. **Статика и медиа** настроить пути:
   ```python
   STATIC_ROOT = BASE_DIR / 'staticfiles'
   MEDIA_ROOT = BASE_DIR / 'media'
   ```
7. Установить дополнительные зависимости:
   ```bash
   pip install gunicorn psycopg2-binary
   ```
8. Выполнить на сервере:
   ```bash
   python manage.py migrate
   python manage.py collectstatic --noinput
   python manage.py load_survey
   python manage.py createsuperuser
   ```
9. Запустить бэкенд через Gunicorn:
   ```bash
   gunicorn core.wsgi:application --bind 127.0.0.1:8000 --workers 3
   ```

Для надёжности Gunicorn стоит запускать через `systemd` или `supervisor`.

#### Шаг 4. Подготовить фронтенд

1. В `frontend/src/api.ts` заменить локальный адрес бэкенда на продакшеновый:
   ```ts
   const API_BASE_URL = 'https://your-site.com'
   ```
   Лучше вынести адрес в переменную окружения:
   ```bash
   # frontend/.env.production
   VITE_API_BASE_URL=https://your-site.com
   ```
   ```ts
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
   ```
2. Собрать production-версию:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   Результат появится в папке `frontend/dist/`.

#### Шаг 5. Установить и настроить Nginx

Пример конфигурации `/etc/nginx/sites-available/your-site`:

```nginx
server {
    listen 80;
    server_name your-site.com www.your-site.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-site.com www.your-site.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        root /var/www/cauldron/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /media/ {
        alias /var/www/cauldron/backend/media/;
    }

    location /static/ {
        alias /var/www/cauldron/backend/staticfiles/;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Важно: `try_files $uri $uri/ /index.html;` нужен, потому что фронтенд — SPA, и все маршруты должны возвращать `index.html`.

#### Шаг 6. Получить SSL-сертификат

Бесплатные сертификаты Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-site.com -d www.your-site.com
```

#### Шаг 7. Перенести файлы на сервер

```bash
rsync -avz --exclude=node_modules --exclude=venv --exclude=.git ./ user@server:/var/www/cauldron/
```

После переноса выполнить шаги 3 и 4 на сервере.

---

### Вариант Б. Деплой через Docker (рекомендуется)

Docker упрощает поддержку: одинаковое окружение на локальном компьютере и сервере, простые обновления и откаты.

#### Необходимые файлы

Для Docker-развёртывания понадобится создать:

- `backend/Dockerfile`
- `backend/.dockerignore`
- `backend/entrypoint.sh`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `nginx/nginx.conf`
- `docker-compose.yml` (для разработки)
- `docker-compose.prod.yml` (для продакшена)
- `.env` (с секретами и паролями)

#### Порядок действий

1. Установить Docker и Docker Compose на сервер:
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose-plugin
   ```
2. Создать `.env` с настройками:
   ```bash
   SECRET_KEY=your-super-secret-key
   DEBUG=False
   POSTGRES_DB=cauldron_db
   POSTGRES_USER=cauldron_user
   POSTGRES_PASSWORD=your-db-password
   DATABASE_URL=postgres://cauldron_user:your-db-password@db:5432/cauldron_db
   ```
3. Собрать и запустить контейнеры:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. Выполнить первоначальную настройку:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
   docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
   docker compose -f docker-compose.prod.yml exec backend python manage.py load_survey
   docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
   ```

Данные PostgreSQL и загруженные медиафайлы должны храниться в volumes, чтобы не теряться при пересоздании контейнеров.

---

### Обновление после выкладки

#### Ручной деплой

```bash
# На сервере
cd /var/www/cauldron
git pull

cd frontend
npm install
npm run build

cd ../backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py load_survey --replace
# Перезапустить Gunicorn
```

#### Docker

```bash
cd /var/www/cauldron
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Чек-лист безопасности перед выкладкой

- [ ] SECRET_KEY вынесен в переменную окружения и является сложным случайным значением.
- [ ] DEBUG = False.
- [ ] ALLOWED_HOSTS заполнен реальным доменом.
- [ ] CORS настроен только на продакшеновый фронтенд.
- [ ] Используется PostgreSQL вместо SQLite.
- [ ] Настроен HTTPS (SSL-сертификат).
- [ ] Админка `/admin/` защищена сложным паролем суперпользователя.
- [ ] Понимаешь, что `/api/submissions/` сейчас открыт без авторизации. Любой, у кого есть ссылка, может увидеть все результаты. Если это неприемлемо, нужно либо оставить доступ к странице `/gm` только через фронтенд-пароль (как сейчас), либо перенести авторизацию на бэкенд.

---

## 13. Кому что трогать

- **Ты (владелец проекта / менеджер):** смотришь результат в браузере, даёшь задачи, смотришь данные в админке.
- **Фронтенд-разработчик:** работает только в `frontend/`.
- **Бэкенд-разработчик:** работает только в `backend/`.
- **AI-агент (я):** могу править обе части, если ты явно просишь связать фронтенд и бэкенд.

---

Если что-то непонятно — спрашивай. Лучше всего сразу говорить, какую страницу или действие ты хочешь добавить, и я покажу пошагово.
