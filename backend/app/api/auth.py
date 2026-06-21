from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.entities import CrmUser

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TOKEN_EXPIRE_DAYS = 30
COOKIE_NAME = "crm_token"


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(username: str, is_admin: bool) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": username, "is_admin": is_admin, "exp": expire},
        settings.jwt_secret,
        algorithm="HS256",
    )


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalars(
        select(CrmUser).where(CrmUser.username == body.username, CrmUser.is_active == True)
    ).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    token = create_token(user.username, user.is_admin)
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=TOKEN_EXPIRE_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=True,
    )
    return {"username": user.username, "is_admin": user.is_admin}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, samesite="lax", secure=True)
    return {"ok": True}
