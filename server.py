# server.py
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import subprocess, json

app = FastAPI()

class RegisterBody(BaseModel):
    user_id: str | None = None

def get_tg_user_id(init_data: str | None, fallback: str | None) -> str:
    # На первом шаге можно принять user_id напрямую (MVP).
    # Позже: парсить и верифицировать initData подписью бота.
    if fallback:
        return fallback
    if not init_data:
        raise HTTPException(400, "No user_id or init data")
    try:
        data = dict([kv.split('=', 1) for kv in init_data.split('&') if '=' in kv])
        user_raw = data.get('user')
        if not user_raw:
            raise ValueError
        user = json.loads(user_raw)
        return str(user["id"])
    except Exception:
        raise HTTPException(400, "Bad init data")

@app.post("/register")
def register(body: RegisterBody, x_telegram_init_data: str | None = Header(default=None)):
    user_id = get_tg_user_id(x_telegram_init_data, body.user_id)
    try:
        out = subprocess.check_output(["python3", "assign_wallet.py", user_id], stderr=subprocess.STDOUT, text=True)
        address = out.strip()
        return {"user_id": user_id, "address": address}
    except subprocess.CalledProcessError as e:
        raise HTTPException(500, f"assign_wallet failed: {e.output}")