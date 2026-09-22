from typing import Any


class OCRService:
    """Integration boundary for the deployed medical-report OCR service."""

    def extract(self, image_bytes: bytes) -> dict[str, Any]:
        raise NotImplementedError(
            "Connect this interface to the deployed medical-report OCR service before enabling extraction."
        )
