import base64
import hashlib
import logging
from cryptography.fernet import Fernet, InvalidToken

from backend.app.core.config import settings
from backend.app.services.llm.exceptions import EncryptionError

logger = logging.getLogger("designkaro.llm.encryption")


def _get_fernet_instance() -> Fernet:
    """
    Returns a configured Fernet instance.
    Uses LLM_ENCRYPTION_KEY if provided (must be 32 url-safe base64 bytes).
    Otherwise, deterministically derives a stable Fernet key from SECRET_KEY.
    """
    configured_key = (settings.LLM_ENCRYPTION_KEY or "").strip()
    if configured_key:
        try:
            return Fernet(configured_key.encode("utf-8"))
        except Exception as e:
            logger.warning("Invalid LLM_ENCRYPTION_KEY provided; falling back to SECRET_KEY derivation: %s", e)

    # Derive stable 32-byte key from SECRET_KEY using SHA-256
    derived_32_bytes = hashlib.sha256(f"designkaro-llm-salt:{settings.SECRET_KEY}".encode("utf-8")).digest()
    urlsafe_b64_key = base64.urlsafe_b64encode(derived_32_bytes)
    return Fernet(urlsafe_b64_key)


def encrypt_api_key(plaintext_key: str) -> str:
    """
    Encrypts a plaintext API key for storage at rest.
    Returns the ciphertext as a UTF-8 string.
    """
    if not plaintext_key or not plaintext_key.strip():
        return ""
    try:
        fernet = _get_fernet_instance()
        ciphertext = fernet.encrypt(plaintext_key.strip().encode("utf-8"))
        return ciphertext.decode("utf-8")
    except Exception as exc:
        logger.error("Failed to encrypt API key securely: %s", exc)
        raise EncryptionError("Failed to encrypt API key") from exc


def decrypt_api_key(encrypted_token: str | None) -> str:
    """
    Decrypts an encrypted API key ciphertext back to plaintext.
    Returns empty string if token is None or empty.
    """
    if not encrypted_token or not encrypted_token.strip():
        return ""
    try:
        fernet = _get_fernet_instance()
        decrypted_bytes = fernet.decrypt(encrypted_token.strip().encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken as exc:
        logger.error("Tampered or corrupted API key token detected during decryption.")
        raise EncryptionError("Invalid or tampered API key ciphertext") from exc
    except Exception as exc:
        logger.error("Unexpected error during API key decryption: %s", exc)
        raise EncryptionError("Failed to decrypt API key") from exc


def mask_api_key(raw_or_decrypted_key: str | None) -> str | None:
    """
    Returns a safe masked version of an API key for display in settings (e.g. 'sk-proj...a1b2').
    Never reveals the full secret.
    """
    if not raw_or_decrypted_key or not raw_or_decrypted_key.strip():
        return None
    k = raw_or_decrypted_key.strip()
    if len(k) <= 8:
        return "********"
    # Show first 4 characters and last 4 characters
    return f"{k[:4]}...{k[-4:]}"
