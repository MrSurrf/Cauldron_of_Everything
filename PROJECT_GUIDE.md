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

## 12. Кому что трогать

- **Ты (владелец проекта / менеджер):** смотришь результат в браузере, даёшь задачи, смотришь данные в админке.
- **Фронтенд-разработчик:** работает только в `frontend/`.
- **Бэкенд-разработчик:** работает только в `backend/`.
- **AI-агент (я):** могу править обе части, если ты явно просишь связать фронтенд и бэкенд.

---

Если что-то непонятно — спрашивай. Лучше всего сразу говорить, какую страницу или действие ты хочешь добавить, и я покажу пошагово.
