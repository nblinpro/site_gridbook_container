import logging
import os
import smtplib
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Envoie un email via SMTP si configuré (SMTP_HOST dans l'env).

    Sans configuration SMTP, le message est simplement loggé — pratique en
    développement, mais il faut configurer un vrai SMTP avant la mise en prod.
    """
    host = os.getenv("SMTP_HOST")
    if not host:
        logger.warning(
            "SMTP non configuré : email non envoyé à %s.\nSujet: %s\n%s",
            to_email, subject, body,
        )
        return False

    port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_addr = os.getenv("SMTP_FROM", smtp_user or "no-reply@gridbook.local")

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.sendmail(from_addr, [to_email], msg.as_string())
        return True
    except Exception:
        logger.exception("Échec de l'envoi d'email à %s", to_email)
        return False
