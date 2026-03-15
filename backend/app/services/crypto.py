from cryptography.fernet import Fernet
from app.config import settings

_fernet = Fernet(settings.encryption_key.encode())


def encrypt_api_key(plain_key: str) -> str:
    return _fernet.encrypt(plain_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    return _fernet.decrypt(encrypted_key.encode()).decode()
