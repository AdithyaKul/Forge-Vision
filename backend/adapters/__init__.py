from .dahua import DahuaAdapter
from .hikvision import HikvisionAdapter
from .cpplus import CPPlusAdapter

ADAPTERS = [
    DahuaAdapter,
    HikvisionAdapter,
    CPPlusAdapter
]

def identify_vendor(filename: str, metadata: dict) -> str:
    """Dispatches filename & metadata through registered vendor adapters."""
    for adapter in ADAPTERS:
        if adapter.identify(filename, metadata):
            return adapter.vendor_name
    return "Generic-MP4"
