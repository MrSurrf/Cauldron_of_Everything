#!/usr/bin/env python3
"""Синхронизация backend/Encyclopedia-data/ с сервером Dokploy.

Использует tar + scp + ssh. Требует, чтобы в системе были доступны команды
`tar`, `scp` и `ssh` (есть в Git Bash и в Windows OpenSSH).

Пример:
    python scripts/sync_encyclopedia_data.py --host root@192.168.1.1
"""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path


def run(cmd: list[str]) -> None:
    """Выполняет команду и печатает её."""
    print(f"$ {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Синхронизировать Encyclopedia-data с сервером Dokploy"
    )
    parser.add_argument(
        "--host",
        default="root@YOUR_SERVER_IP",
        help="SSH-хост в формате user@host (например, root@192.168.1.1)",
    )
    parser.add_argument(
        "--remote-dir",
        default="/opt/cauldron/encyclopedia-data",
        help="Удалённая директория для данных",
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

        # 3. Распаковываем и удаляем архив на сервере.
        run([
            "ssh", args.host,
            f"mkdir -p {args.remote_dir} && "
            f"tar -xzf {remote_archive} -C {args.remote_dir} && "
            f"rm {remote_archive}",
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
