from admin_api.masking import mask_email, mask_phone


def test_mask_email():
    assert mask_email("john21@example.net") == "j***@example.net"
    assert mask_email(None) is None
    assert mask_email("not-an-email") == "not-an-email"


def test_mask_phone():
    assert mask_phone("9600133890838") == "*********0838"
    assert mask_phone("123") == "***"
    assert mask_phone(None) is None
