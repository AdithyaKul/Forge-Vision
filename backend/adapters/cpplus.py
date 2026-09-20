from .base import BaseAdapter

class CPPlusAdapter(BaseAdapter):
    vendor_name = "CP Plus-compatible"

    @classmethod
    def identify(cls, filename: str, metadata: dict) -> bool:
        fn = filename.lower()
        if "cam03" in fn or "cpplus" in fn or "cp" in fn or metadata.get("resolution") == "1920x1080":
            return True
        return False
