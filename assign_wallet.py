# assign_wallet.py
import sys, os, fcntl, tempfile

POOL_FILE = "wallet_pool.txt"
USERS_FILE = "users.txt"

def flock_file(f, lock_type):
    fcntl.flock(f.fileno(), lock_type)

def read_lines(path):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return [line.rstrip("\n") for line in f]

def write_lines_atomic(path, lines):
    fd, tmp = tempfile.mkstemp(prefix=".tmp_", dir=os.path.dirname(path) or ".")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write("\n".join(lines).rstrip("\n"))
        if lines:
            f.write("\n")
    os.replace(tmp, path)

def parse_pool_line(line):
    # expected: address|seed phrase
    parts = line.split("|", 1)
    if len(parts) != 2:
        raise ValueError(f"Invalid pool line: {line}")
    address = parts[0].strip()
    seed = parts[1].strip()
    return address, seed

def parse_user_line(line):
    # expected: user_id|address|seed
    parts = line.split("|", 2)
    if len(parts) != 3:
        raise ValueError(f"Invalid user line: {line}")
    return parts[0].strip(), parts[1].strip(), parts[2].strip()

def assign_wallet(user_id: str):
    # Если уже есть — вернуть существующий
    users = read_lines(USERS_FILE)
    for line in users:
        if not line.strip():
            continue
        uid, addr, seed = parse_user_line(line)
        if uid == user_id:
            return addr, seed, False  # уже назначен

    # Эксклюзивная блокировка обоих файлов на время операции
    with open(POOL_FILE, "a+", encoding="utf-8") as pf, open(USERS_FILE, "a+", encoding="utf-8") as uf:
        flock_file(pf, fcntl.LOCK_EX)
        flock_file(uf, fcntl.LOCK_EX)

        pf.seek(0)
        pool_lines = [l.rstrip("\n") for l in pf.readlines()]
        pool_lines = [l for l in pool_lines if l.strip()]

        if not pool_lines:
            raise RuntimeError("Пул пуст. Добавьте кошельки в wallet_pool.txt.")

        # Берём первый свободный
        line = pool_lines[0]
        address, seed = parse_pool_line(line)

        # Удаляем строку из пула
        new_pool = pool_lines[1:]

        # Дописываем в users.txt
        uf.seek(0, os.SEEK_END)
        uf.write(f"{user_id}|{address}|{seed}\n")

        # Перезаписываем пул атомарно (без блокировки мог бы быть race)
        # Здесь по-простому перезаписываем через временный файл
        write_lines_atomic(POOL_FILE, new_pool)

    return address, seed, True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python assign_wallet.py <tg_user_id>", file=sys.stderr)
        sys.exit(1)
    user_id = sys.argv[1].strip()
    try:
        address, seed, created = assign_wallet(user_id)
        print(address)  # stdout — адрес для простоты интеграции
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(2)