FROM python:3.10-slim

WORKDIR /app/backend

# Системные зависимости, нужные для сборки psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Установка Python-зависимостей отдельным слоем для кэширования.
# Build context — корень репозитория (docker build -f backend/Dockerfile .)
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код бэкенда и конфиги анкеты (config/ запечён в образ)
COPY backend/ ./
COPY config/ /app/config/

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=core.settings
ENV SURVEY_CONFIG_DIR=/app/config

RUN mkdir -p media static

EXPOSE 8000

# Сбор статики, миграции, загрузка анкеты и запуск через gunicorn
CMD python manage.py collectstatic --noinput && \
    python manage.py migrate && \
    python manage.py load_survey && \
    gunicorn core.wsgi:application -b 0.0.0.0:8000
