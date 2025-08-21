import random
import smtplib
import os
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
from passlib.context import CryptContext

from .db import SessionLocal
from .models_db import User as UserModel

# -----------------------------
# Password hashing
# -----------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# -----------------------------
# JWT settings
# -----------------------------
class Settings(BaseModel):
    authjwt_secret_key: str = "super-secret-key"  # Change in production

@AuthJWT.load_config
def get_config():
    return Settings()

# -----------------------------
# Router
# -----------------------------
router = APIRouter()

# -----------------------------
# In-memory stores (replace with Redis/DB in production)
# -----------------------------
pending_registrations = {}  # {email: {username, email, password_hash, is_admin, otp}}
otp_store = {}  # {username: otp}

# -----------------------------
# Schemas
# -----------------------------
class User(BaseModel):
    username: str
    email: str
    password: str
    is_admin: int = 0

class LoginRequest(BaseModel):
    username: str
    password: str

class OTPVerifyRequest(BaseModel):
    username: str
    otp: str

class RegisterVerifyRequest(BaseModel):
    email: str
    otp: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# -----------------------------
# DB session dependency
# -----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -----------------------------
# Helper to send OTP email
# -----------------------------
def send_otp_email(to_email, otp):
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    from_email = smtp_user
    if not smtp_user or not smtp_pass:
        print(f"[DEV] OTP for {to_email}: {otp}")
        return
    msg = MIMEText(f"Your OTP is: {otp}")
    msg["Subject"] = "Your Login OTP"
    msg["From"] = from_email
    msg["To"] = to_email
    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
    except Exception as e:
        print(f"Failed to send OTP email: {e}")

# -----------------------------
# Change password endpoint
# -----------------------------
@router.post("/change-password")
def change_password(req: ChangePasswordRequest, Authorize: AuthJWT = Depends(), db=Depends(get_db)):
    Authorize.jwt_required()
    username = Authorize.get_jwt_subject()
    user_obj = db.query(UserModel).filter_by(username=username).first()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
    if not pwd_context.verify(req.current_password, user_obj.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    user_obj.password_hash = pwd_context.hash(req.new_password)
    db.commit()
    return {"msg": "Password changed successfully."}

# -----------------------------
# Registration
# -----------------------------
@router.post("/register-request-otp")
def register_request_otp(user: User, db=Depends(get_db)):
    if db.query(UserModel).filter_by(username=user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(UserModel).filter_by(email=user.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    otp = str(random.randint(100000, 999999))
    pending_registrations[user.email] = {
        "username": user.username,
        "email": user.email,
        "password_hash": pwd_context.hash(user.password),
        "is_admin": user.is_admin,
        "otp": otp
    }
    send_otp_email(user.email, otp)
    return {"msg": "OTP sent to your email for verification"}

@router.post("/register-verify-otp")
def register_verify_otp(req: RegisterVerifyRequest, db=Depends(get_db)):
    reg = pending_registrations.get(req.email)
    if not reg or reg["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user_obj = UserModel(
        username=reg["username"],
        email=reg["email"],
        password_hash=reg["password_hash"],
        is_admin=reg["is_admin"]
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    del pending_registrations[req.email]
    return {"msg": "Registration complete. You can now log in."}

# -----------------------------
# Login with OTP
# -----------------------------
@router.post("/login-request-otp")
def login_request_otp(req: LoginRequest, db=Depends(get_db)):
    user_obj = db.query(UserModel).filter_by(username=req.username).first()
    if not user_obj or not pwd_context.verify(req.password, user_obj.password_hash):
        raise HTTPException(status_code=401, detail="Bad credentials")

    otp = str(random.randint(100000, 999999))
    otp_store[req.username] = otp
    send_otp_email(user_obj.email, otp)
    return {"msg": "OTP sent to your email"}

@router.post("/login-verify-otp")
def login_verify_otp(req: OTPVerifyRequest, Authorize: AuthJWT = Depends(), db=Depends(get_db)):
    user_obj = db.query(UserModel).filter_by(username=req.username).first()
    if not user_obj:
        raise HTTPException(status_code=401, detail="Bad credentials")
    otp_expected = otp_store.get(req.username)
    if not otp_expected or req.otp != otp_expected:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    del otp_store[req.username]
    access_token = Authorize.create_access_token(
        subject=user_obj.username,
        user_claims={"is_admin": user_obj.is_admin}
    )
    return {"access_token": access_token, "is_admin": user_obj.is_admin}

# -----------------------------
# Get current user info
# -----------------------------
@router.get("/me")
def me(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    claims = Authorize.get_raw_jwt()
    return {"user": Authorize.get_jwt_subject(), "is_admin": claims.get("is_admin", 0)}

# -----------------------------
# Admin: list all users
# -----------------------------
@router.get("/admin/users")
def list_users(Authorize: AuthJWT = Depends(), db=Depends(get_db)):
    Authorize.jwt_required()
    claims = Authorize.get_raw_jwt()
    if not claims.get("is_admin", 0):
        raise HTTPException(status_code=403, detail="Not authorized")
    users = db.query(UserModel).all()
    return [{"id": u.id, "username": u.username, "is_admin": u.is_admin} for u in users]
