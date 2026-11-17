import os
import tarfile
import tempfile
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Скачивает архив Encyclopedia-data из S3-совместимого хранилища и распаковывает его.'

    def handle(self, *args, **options):
        endpoint = os.getenv('S3_ENDPOINT', 'https://s3.cloud.ru')
        region = os.getenv('S3_REGION_NAME', 'ru.AZ-2')
        bucket = os.getenv('S3_BUCKET_NAME', 'bucket-1d1db9')
        access_key = os.getenv('S3_ACCESS_KEY_ID')
        secret_key = os.getenv('S3_SECRET_ACCESS_KEY')
        archive_key = os.getenv('S3_ENCYCLOPEDIA_ARCHIVE_KEY', 'encyclopedia-data.tar.gz')

        if not access_key or not secret_key:
            self.stdout.write(
                self.style.WARNING(
                    'S3 credentials не заданы, скачивание Encyclopedia-data пропущено.'
                )
            )
            return

        self.stdout.write(f'Скачивание {archive_key} из бакета {bucket} ({endpoint})...')

        client_kwargs = {
            'endpoint_url': endpoint,
            'aws_access_key_id': access_key,
            'aws_secret_access_key': secret_key,
        }
        if region:
            client_kwargs['region_name'] = region

        s3 = boto3.client('s3', **client_kwargs)

        with tempfile.NamedTemporaryFile(suffix='.tar.gz', delete=False) as tmp:
            tmp_path = Path(tmp.name)
            try:
                s3.download_fileobj(bucket, archive_key, tmp)
            except ClientError as e:
                self.stderr.write(self.style.ERROR(f'Ошибка скачивания из S3: {e}'))
                raise
            finally:
                tmp.close()

        try:
            extract_to = settings.BASE_DIR
            self.stdout.write(f'Распаковка архива в {extract_to}...')
            with tarfile.open(tmp_path, 'r:gz') as tar:
                tar.extractall(path=extract_to)
        finally:
            tmp_path.unlink(missing_ok=True)

        self.stdout.write(self.style.SUCCESS('Encyclopedia-data успешно загружены и распакованы.'))
