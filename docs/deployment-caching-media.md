# Кэширование и медиа в продакшене

Документ описывает, что нужно настроить при деплое, чтобы данные и медиа не грузились заново при каждом заходе. Код приложения к этому уже готов: на бэкенде работают ETag/304, аватары сохраняются под уникальными именами, dev-раздача медиа имеет правильные заголовки (см. `backend/core/urls.py`). Здесь — только конфигурация веб-сервера и хранилища.

---

## 1. Статика фронтенда (JS/CSS/HTML)

Vite при сборке даёт файлам хэши в именах (`assets/index-ChoAK8lg.js`) — их можно кэшировать навсегда. Единственный файл, который нужен всегда свежий, — `index.html` (в нём ссылки на хэшированные ассеты).

Фрагмент nginx-сервера фронтенда:

```nginx
server {
    listen 80;
    root /var/www/cauldron/frontend/dist;

    location / {
        try_files $uri $uri/ /index.html;
        # index.html — всегда свежий: браузер перепроверяет коротким запросом.
        add_header Cache-Control "no-cache" always;
    }

    location /assets/ {
        # Имена с хэшем: содержимое не меняется, кэшируем навсегда.
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }

    # Шрифты и иконки из public/ — постоянные имена, короткий кэш.
    location ~* \.(woff2?|svg|png|jpg)$ {
        add_header Cache-Control "public, max-age=86400" always;
        try_files $uri =404;
    }
}
```

## 2. Медиа (загружаемые файлы)

В dev медиа раздаёт Django. В продакшене их должно раздавать хранилище или nginx напрямую — Django не предназначен для раздачи файлов.

Заголовки должны повторять логику `media_serve` из `backend/core/urls.py`:

```nginx
location /media/accounts/portraits/ {
    # Имена файлов уникальны на каждую загрузку (uuid) — кэшируем навсегда.
    add_header Cache-Control "private, max-age=31536000, immutable" always;
    alias /var/www/cauldron/backend/media/accounts/portraits/;
}

location /media/ {
    # Картинки анкеты и прочие файлы с постоянными именами — сутки.
    add_header Cache-Control "private, max-age=86400" always;
    alias /var/www/cauldron/backend/media/;
}
```

Если файлы лежат на диске сервера, **обязательно** вынесите `media/` на persistent volume: при пересоздании контейнера без volume загруженные аватарки пропадут (записи в БД останутся и будут вести на несуществующие файлы).

## 3. Объектное хранилище для медиа (S3/MinIO)

Надёжнее локальной папки — вынести медиа в S3-совместимое хранилище. Код менять не нужно, только настройки:

1. Установить `django-storages[s3]` и `boto3` в `backend/requirements.txt`.
2. В `settings.py` добавить (значения — из переменных окружения):

```python
if os.environ.get("AWS_STORAGE_BUCKET_NAME"):
    INSTALLED_APPS += ["storages"]
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3.S3Storage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    AWS_STORAGE_BUCKET_NAME = os.environ["AWS_STORAGE_BUCKET_NAME"]
    AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL")  # для MinIO/не-AWS
    AWS_S3_ACCESS_KEY_ID = os.environ["AWS_S3_ACCESS_KEY_ID"]
    AWS_S3_SECRET_ACCESS_KEY = os.environ["AWS_S3_SECRET_ACCESS_KEY"]
    AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "")
    AWS_DEFAULT_ACL = "private"
    AWS_QUERYSTRING_AUTH = False  # URL аватаров открытые, читаемые
```

3. Заголовки кэша на файлах ставятся политикой бакета (портреты — `private, max-age=31536000, immutable`, остальное — `private, max-age=86400`) или ключами метаданных при загрузке.
4. Удаление старого аватара при замене (`profile.portrait.delete(save=False)`) работает и с S3 — `django-storages` удаляет объект из бакета.

После переключения старые локальные файлы нужно один раз залить в бакет (`aws s3 sync media/ s3://bucket/`).

## 4. API и ETag/304

Публичные эндпоинты (`/api/encyclopedia/...`, `/api/questions/`) отдают `ETag` + `Cache-Control: no-cache`. Для этого достаточно проксировать запросы к Django без изменений — браузер сам шлёт `If-None-Match` и получает `304 Not Modified` с пустым телом.

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Важно: не отключать заголовки `ETag`/`If-None-Match` на прокси и не ставить на `/api/` свой `Cache-Control` поверх ответов Django.

## 5. Чек-лист после деплоя

- [ ] Первый запрос `/api/encyclopedia/types/` → `200` + `ETag`; повторный с `If-None-Match` → `304`.
- [ ] `GET /media/accounts/portraits/...` → `Cache-Control: private, max-age=31536000, immutable`.
- [ ] Загрузка нового аватара меняет его URL, старый файл удаляется из хранилища.
- [ ] Пересборка фронтенда меняет хэши в именах файлов; старые клиенты после обновления `index.html` получают новые ассеты.
- [ ] Перезапуск контейнера не теряет загруженные аватарки (volume или S3).
