import os
import requests
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

EMAILJS_SERVICE_ID = os.getenv("EMAILJS_SERVICE_ID", "")
EMAILJS_TEMPLATE_ID = os.getenv("EMAILJS_TEMPLATE_ID", "")
EMAILJS_PUBLIC_KEY = os.getenv("EMAILJS_PUBLIC_KEY", "")
EMAILJS_PRIVATE_KEY = os.getenv("EMAILJS_PRIVATE_KEY", "")

def send_otp_email(to_email: str, to_name: str, otp_code: str, purpose: str = "Account Verification") -> Dict[str, Any]:
    """
    Sends an OTP verification email using EmailJS REST API.
    If EmailJS keys are not configured, runs in dev mode and logs OTP to console.
    """
    if EMAILJS_SERVICE_ID and EMAILJS_TEMPLATE_ID and EMAILJS_PUBLIC_KEY:
        try:
            from datetime import datetime
            payload = {
                "service_id": EMAILJS_SERVICE_ID,
                "template_id": EMAILJS_TEMPLATE_ID,
                "user_id": EMAILJS_PUBLIC_KEY,
                "template_params": {
                    "to_email": to_email,
                    "to_name": to_name or "User",
                    "name": to_name or "User",
                    "otp_code": otp_code,
                    "otp": otp_code,
                    "purpose": purpose,
                    "app_name": "AI Interview Simulator",
                    "time": datetime.now().strftime("%b %d, %Y %I:%M %p"),
                    "message": f"Your one-time verification code for {purpose} is: {otp_code}. This code is valid for 10 minutes.",
                }
            }
            if EMAILJS_PRIVATE_KEY:
                payload["accessToken"] = EMAILJS_PRIVATE_KEY
            headers = {
                "Content-Type": "application/json",
                "Origin": "http://localhost:5173",
                "User-Agent": "AI-Interview-Simulator/1.0",
            }
            res = requests.post(
                "https://api.emailjs.com/api/v1.0/email/send",
                json=payload,
                headers=headers,
                timeout=10
            )
            if res.status_code == 200:
                print(f"[EmailJS] Successfully sent OTP to {to_email}")
                return {"sent": True, "dev_mode": False}
            else:
                print(f"[EmailJS] Failed to send email: {res.status_code} - {res.text}")
                # Fallback to dev mode so testing is not blocked
                return {"sent": False, "dev_mode": True, "otp": otp_code, "error": res.text}
        except Exception as e:
            print(f"[EmailJS] Exception occurred: {e}")
            return {"sent": False, "dev_mode": True, "otp": otp_code, "error": str(e)}

    # Dev mode: keys not provided yet
    print(f"\n=======================================================")
    print(f"[EmailJS DEV MODE] Email: {to_email} | OTP: {otp_code}")
    print(f"Purpose: {purpose} | Expires in: 10 minutes")
    print(f"=======================================================\n")
    return {"sent": False, "dev_mode": True, "otp": otp_code}
