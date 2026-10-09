import logging
import smtplib
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
import os

logger = logging.getLogger("greenspot.email")

class EmailService:
    @staticmethod
    async def send_otp_email(email: str, otp_code: str, full_name: Optional[str] = None) -> bool:
        """
        Gửi mã OTP xác thực qua Email:
        1. In rõ ràng ra Console Server / Docker Log.
        2. Tự động gửi qua SMTP thật (Gmail, Outlook...) khi có cấu hình SMTP trong environment.
        """
        name_display = full_name if full_name else "Công dân"
        
        # 1. In biểu ngữ ra terminal server
        print(f"\n{'='*75}")
        print(f" [GREENSPOOT EMAIL SERVICE] GỬI MÃ OTP KÍCH HOẠT")
        print(f" Người nhận:    {name_display} <{email}>")
        print(f" Mã OTP:        >>> {otp_code} <<<")
        print(f" Hiệu lực:      5 phút")
        print(f" Mục đích:      Kích hoạt tài khoản Công dân số GreenSpot")
        print(f"{'='*75}\n", flush=True)

        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "").strip()
        smtp_pass = os.getenv("SMTP_PASSWORD", "").strip()

        # 2. Nếu có tài khoản SMTP -> Gửi thư điện tử thật
        if smtp_host and smtp_user and smtp_pass:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = Header(f"[{otp_code}] Mã xác thực tài khoản GreenSpot của bạn", "utf-8")
                msg["From"] = f"GreenSpot Platform <{smtp_user}>"
                msg["To"] = email

                html_content = f"""
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span style="font-size: 36px;">🌱</span>
                        <h2 style="color: #047857; margin: 8px 0 0 0; font-size: 22px;">GreenSpot Platform</h2>
                        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Cổng Dịch Vụ Công Dân Sinh Thái Số</p>
                    </div>
                    
                    <p style="color: #1e293b; font-size: 15px; line-height: 1.5;">Xin chào <strong>{name_display}</strong>,</p>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        Bạn vừa đăng ký tài khoản tại GreenSpot. Để hoàn tất kích hoạt và bảo vệ danh tính công dân số, vui lòng nhập mã xác thực OTP dưới đây:
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px dashed #059669; padding: 18px; text-align: center; border-radius: 10px; margin: 24px 0;">
                        <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #065f46; font-family: monospace;">{otp_code}</span>
                    </div>
                    
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                        ⏱️ Mã này có hiệu lực trong vòng <strong>5 phút</strong>.<br>
                        🔒 Vì lý do an toàn, tuyệt đối không chia sẻ mã này cho bất kỳ ai.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                        © {2026} GreenSpot. Tin nhắn này được gửi tự động, vui lòng không trả lời.
                    </p>
                </div>
                """
                msg.attach(MIMEText(html_content, "html", "utf-8"))

                if smtp_port == 465:
                    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                        server.login(smtp_user, smtp_pass)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_pass)
                        server.send_message(msg)
                
                print(f"✅ [EMAIL THẬT] Đã gửi thành công email chứa OTP đến: {email}", flush=True)
                return True
            except Exception as e:
                print(f"❌ [SMTP ERROR] Gửi email thất bại: {e}", flush=True)
                logger.error(f"Lỗi khi gửi email SMTP: {e}")
                # Nếu gửi email thật thất bại, trả về False để Backend kích hoạt lỗi 503
                return False

        # Môi trường dev cục bộ khi chưa nhập credentials
        return True
