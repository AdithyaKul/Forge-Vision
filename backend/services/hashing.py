import hashlib

def compute_sha256(file_path: str) -> str:
    """Computes SHA-256 hash of a file by reading 64KB chunks.
    Ensures original evidence file is never modified or fully loaded into RAM."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()
