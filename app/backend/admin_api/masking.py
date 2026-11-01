def mask_email(email: str | None) -> str | None:
    """john21@example.net -> j***@example.net"""
    if not email or "@" not in email:
        return email
    local, domain = email.split("@", 1)
    return f"{local[:1]}***@{domain}"


def mask_phone(phone: str | None) -> str | None:
    """9600133890838 -> *********0838 (keep last 4)"""
    if not phone:
        return phone
    if len(phone) <= 4:
        return "*" * len(phone)
    return "*" * (len(phone) - 4) + phone[-4:]
