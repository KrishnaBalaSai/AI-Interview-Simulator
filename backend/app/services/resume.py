import io
import pypdf
from typing import Dict, Any
from .gemini import analyze_resume

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts raw text from a PDF byte buffer using pypdf."""
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text_parts = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
        extracted = "\n".join(text_parts).strip()
        if not extracted:
            return "Resume PDF was uploaded, but text could not be extracted directly."
        return extracted
    except Exception as e:
        print(f"[Resume] Error extracting PDF text: {e}")
        return "Resume PDF uploaded."

def process_resume_file(file_bytes: bytes) -> Dict[str, Any]:
    """Extracts text and runs AI analysis on the resume."""
    text = extract_text_from_pdf(file_bytes)
    analysis = analyze_resume(text)
    return {
        "text": text,
        "analysis": analysis
    }
