from app.services.crypto import encrypt_api_key, decrypt_api_key


def test_encrypt_decrypt_roundtrip():
    key = "sk-test-1234567890abcdef"
    encrypted = encrypt_api_key(key)
    assert encrypted != key
    assert decrypt_api_key(encrypted) == key


def test_encrypted_value_is_different_each_time():
    key = "sk-test-1234567890abcdef"
    e1 = encrypt_api_key(key)
    e2 = encrypt_api_key(key)
    assert e1 != e2


def test_decrypt_both_return_same_value():
    key = "sk-test-1234567890abcdef"
    e1 = encrypt_api_key(key)
    e2 = encrypt_api_key(key)
    assert decrypt_api_key(e1) == decrypt_api_key(e2) == key
