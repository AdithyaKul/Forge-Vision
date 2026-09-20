class BaseAdapter:
    vendor_name = "Generic"

    @classmethod
    def identify(cls, filename: str, metadata: dict) -> bool:
        """Returns True if file matches vendor heuristic signatures."""
        return False
