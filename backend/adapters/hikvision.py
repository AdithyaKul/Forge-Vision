from .base import BaseAdapter

class HikvisionAdapter(BaseAdapter):
    vendor_name = "Hikvision-compatible"

    @classmethod
    def identify(cls, filename: str, metadata: dict) -> bool:
        fn = filename.lower()
        if "cam02" in fn or "hik" in fn or "ch2" in fn or metadata.get("resolution") == "960x540":
            return True
        return False
