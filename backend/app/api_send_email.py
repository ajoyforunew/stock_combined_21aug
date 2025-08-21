from fastapi import APIRouter, HTTPException, Depends
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel, EmailStr
from .email_utils import send_email

router = APIRouter()

class EmailRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str

@router.post("/send-test-email")
def send_test_email(request: EmailRequest, Authorize: AuthJWT = Depends()):
    # Require JWT authentication
    Authorize.jwt_required()
    try:
        send_email(request.to, request.subject, request.body)
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
