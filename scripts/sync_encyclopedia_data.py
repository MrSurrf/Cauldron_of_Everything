#!/usr/bin/env python3
"""Синхронизация backend/Encyclopedia-data/ с volume на сервере Dokploy.

Использует tar + scp + ssh + docker. Требуется, чтобы в системе были доступны
команды `tar`, `scp`, `ssh` и `docker`.

Пример:
    python scripts/sync_encyclopedia_data.py --host root@192.168.1.1
"""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    """Выполняет команду и печатает её."""
    print(f"$ {' '.join(cmd)}")
    return subprocess.run(cmd, check=check)


def find_volume(host: str) -> str | None:
    """Находит Docker volume для Encyclopedia-data на удалённом сервере."""
    result = subprocess.run(
        ["ssh", host, "docker volume ls -q | grep encyclopedia-data"],
        capture_output=True,
        text=True,
        check=False,
    )
    volumes = [v.strip() for v in result.stdout.splitlines() if v.strip()]
    if not volumes:
        return None
    if len(volumes) > 1:
        print(f"Найдено несколько volume: {volumes}. Используем первый.")
    return volumes[0]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Синхронизировать Encyclopedia-data с volume на сервере Dokploy"
    )
    parser.add_argument(
        "--host",
        default="root@YOUR_SERVER_IP",
        help="SSH-хост в формате user@host (например, root@192.168.1.1)",
    )
    parser.add_argument(
        "--local-dir",
        default="backend/Encyclopedia-data",
        help="Локальная директория с данными",
    )
    args = parser.parse_args()

    local_dir = Path(args.local_dir).resolve()
    if not local_dir.is_dir():
        print(f"Локальная папка не найдена: {local_dir}", file=sys.stderr)
        return 1

    volume = find_volume(args.host)
    if volume is None:
        print(
            "Volume encyclopedia-data не найден на сервере. "
            "Сначала сделай redeploy backend после обновления docker-compose.yml.",
            file=sys.stderr,
        )
        return 1

    print(f"Найден volume: {volume}")
    archive = Path(tempfile.gettempdir()) / "encyclopedia-data-sync.tar.gz"

    try:
        # 1. Архивируем локальную папку. Внутри архива будет папка Encyclopedia-data/.
        run([
            "tar", "-czf", str(archive),
            "-C", str(local_dir.parent),
            local_dir.name,
        ])

        # 2. Копируем архив на сервер.
        remote_archive = f"/tmp/{archive.name}"
        run(["scp", str(archive), f"{args.host}:{remote_archive}"])

        # 3. Распаковываем архив во временную папку и копируем в volume.
        run([
            "ssh", args.host,
            f"rm -rf /tmp/encyclopedia-data-sync && "
            f"mkdir -p /tmp/encyclopedia-data-sync && "
            f"tar -xzf {remote_archive} -C /tmp/encyclopedia-data-sync && "
            f"docker run --rm -v {volume}:/data -v /tmp/encyclopedia-data-sync:/source alpine "
            f"sh -c 'find /data -mindepth 1 -delete && cp -r /source/Encyclopedia-data/. /data/' && "
            f"rm -rf /tmp/encyclopedia-data-sync {remote_archive}",
        ])

        print("Синхронизация завершена.")
        print("Теперь сделай redeploy backend в Dokploy для запуска импорта.")
        return 0

    except subprocess.CalledProcessError as exc:
        print(f"Ошибка выполнения: {exc}", file=sys.stderr)
        return 1
    finally:
        archive.unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
