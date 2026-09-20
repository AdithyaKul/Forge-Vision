from .base import BaseAdapter

class DahuaAdapter(BaseAdapter):
    vendor_name = "Dahua-compatible"

    @classmethod
    def identify(cls, filename: str, metadata: dict) -> bool:
        fn = filename.lower()
        if "cam01" in fn or "dahua" in fn or "ch1" in fn or metadata.get("resolution") == "1280x720":
            return True
        return False
