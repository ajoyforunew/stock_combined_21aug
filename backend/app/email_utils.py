from dotenv import load_dotenv
import os, smtplib
from email.mime.text import MIMEText

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))

def send_email(to, subject, body):
    msg = MIMEText(body)
    msg["From"] = EMAIL_USER
    msg["To"] = to
    msg["Subject"] = subject

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)   # <- must use app password
        server.sendmail(EMAIL_USER, to, msg.as_string())
