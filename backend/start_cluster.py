#!/usr/bin/env python3
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent


def find_python_executable():
    candidates = [
        os.path.join(os.environ.get("VIRTUAL_ENV", ""), "bin", "python") if os.environ.get("VIRTUAL_ENV") else None,
        str(BACKEND_DIR / "venv" / "bin" / "python"),
        str(BACKEND_DIR / ".venv" / "bin" / "python"),
        sys.executable,
    ]
    for candidate in candidates:
        if candidate and os.path.isfile(candidate):
            return candidate
    return "python"


def build_env(port: int):
    env = os.environ.copy()
    env["HOST"] = "127.0.0.1"
    env["PORT"] = str(port)
    env["FLASK_DEBUG"] = "0"
    return env


def main():
    python_executable = find_python_executable()
    processes = []

    try:
        for port in (5001, 5002, 5003, 5004):
            env = build_env(port)
            proc = subprocess.Popen(
                [python_executable, "manage.py"],
                cwd=str(BACKEND_DIR),
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            processes.append(proc)
            time.sleep(0.5)

        lb_proc = subprocess.Popen(
            [python_executable, "load_balancer.py"],
            cwd=str(BACKEND_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env={**os.environ, "LB_HOST": "0.0.0.0", "LB_PORT": "8080"},
        )
        processes.append(lb_proc)

        print("Educore backend cluster started.")
        print("Backends: 5001-5004")
        print("Load balancer: http://localhost:8080")
        print("Press Ctrl+C to stop all services.")

        def stop_all(signum, frame):
            for proc in processes:
                if proc.poll() is None:
                    proc.terminate()
            raise KeyboardInterrupt

        signal.signal(signal.SIGINT, stop_all)
        signal.signal(signal.SIGTERM, stop_all)

        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping Educore backend cluster...")
        for proc in processes:
            if proc.poll() is None:
                proc.terminate()
        for proc in processes:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        print("Cluster stopped.")


if __name__ == "__main__":
    main()
