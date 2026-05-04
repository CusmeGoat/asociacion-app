import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Asociación Agrícola 10 de Mayo")
APP_NAME = "Asociación Agrícola 10 de Mayo"


def send_reset_password_email(to_email: str, nombre: str, reset_token: str, expires_hours: int) -> None:
    """
    Envía un correo con el token de restablecimiento de contraseña.
    Usa SMTP con TLS (por defecto Gmail en el puerto 587).
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        raise ValueError(
            "El servidor de correo no está configurado. "
            "Agrega SMTP_USER y SMTP_PASSWORD en el archivo .env"
        )

    subject = f"Restablecimiento de contraseña — {APP_NAME}"

    # ── Cuerpo HTML ──────────────────────────────────────────────────────────
    html_body = f"""
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;
                      box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;">
          <!-- Encabezado -->
          <tr>
            <td style="background:#2e7d32;padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">
                🌱 {APP_NAME}
              </h1>
            </td>
          </tr>
          <!-- Cuerpo -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="font-size:16px;color:#333333;margin:0 0 16px;">
                Hola, <strong>{nombre}</strong>:
              </p>
              <p style="font-size:15px;color:#555555;margin:0 0 24px;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                Usa el código de verificación que aparece a continuación dentro de la
                aplicación, en la pantalla <em>«Restablecer Contraseña»</em>.
              </p>

              <!-- Token destacado -->
              <div style="background:#f0f7f0;border:2px dashed #2e7d32;
                          border-radius:8px;padding:20px;text-align:center;
                          margin:0 0 24px;">
                <p style="margin:0 0 8px;font-size:13px;color:#666;
                           text-transform:uppercase;letter-spacing:1px;">
                  Código de restablecimiento
                </p>
                <p style="margin:0;font-size:14px;color:#1b5e20;
                           word-break:break-all;font-family:monospace;
                           font-weight:bold;line-height:1.6;">
                  {reset_token}
                </p>
              </div>

              <p style="font-size:14px;color:#888888;margin:0 0 8px;">
                ⏱️ Este código es válido por <strong>{expires_hours} hora(s)</strong>
                a partir del momento en que se solicitó.
              </p>
              <p style="font-size:14px;color:#888888;margin:0 0 32px;">
                Si no solicitaste este cambio, puedes ignorar este mensaje.
                Tu contraseña actual seguirá siendo la misma.
              </p>

              <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px;" />
              <p style="font-size:12px;color:#aaaaaa;margin:0;text-align:center;">
                Este es un mensaje automático — por favor no respondas a este correo.<br/>
                {APP_NAME} · Sistema de Gestión Institucional
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    # ── Construir mensaje MIME ────────────────────────────────────────────────
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # ── Enviar vía SMTP con STARTTLS ─────────────────────────────────────────
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
