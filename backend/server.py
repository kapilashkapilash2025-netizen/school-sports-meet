import os
import sys
import tempfile
from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS


def startup_checks():
    if sys.version_info < (3, 8):
        print("Python 3.8+ is required for PDF import.")
        sys.exit(1)

    missing = []

    for mod, install_hint in [
        ("pdf2image", "pdf2image"),
        ("pytesseract", "pytesseract"),
        ("cv2", "opencv-python-headless"),
        ("pandas", "pandas"),
        ("PIL", "pillow"),
        ("regex", "regex"),
        ("pdfplumber", "pdfplumber"),
    ]:
        try:
            __import__(mod)
        except Exception:
            missing.append(install_hint)

    if missing:
        print(f"Missing dependencies: {', '.join(sorted(set(missing)))}")
        print("Run: pip install -r requirements.txt")
        sys.exit(1)


startup_checks()

from pdf_import import parse_many_pdfs  # noqa: E402

app = Flask(__name__)
CORS(app)

OUTPUT_DIR = Path(__file__).resolve().parent / "import_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/import_pdf")
def import_pdf_handler():
    uploads = request.files.getlist("files")
    if not uploads:
        single = request.files.get("file")
        if single is not None:
            uploads = [single]

    if not uploads:
        return jsonify({"message": "PDF file is required"}), 400

    temp_files = []

    try:
        file_entries = []
        for uploaded in uploads:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp:
                uploaded.save(temp.name)
                temp_files.append(temp.name)
                file_entries.append({"path": temp.name, "filename": uploaded.filename or "students.pdf"})

        rows = parse_many_pdfs(file_entries)

        master_csv_path = OUTPUT_DIR / "students_master.csv"

        if rows:
            df = pd.DataFrame(rows)
            df = df[["name", "date_of_birth", "gender", "house", "grade", "source_file", "raw_line"]]
            df.rename(columns={"date_of_birth": "dob"}, inplace=True)
            df.to_csv(master_csv_path, index=False, encoding="utf-8-sig")
        else:
            pd.DataFrame(columns=["name", "dob", "gender", "house", "grade", "source_file", "raw_line"]).to_csv(
                master_csv_path, index=False, encoding="utf-8-sig"
            )

        return jsonify(
            {
                "rows": rows,
                "report": {
                    "pdf_rows_count": len(rows),
                    "students_master_csv": str(master_csv_path),
                },
            }
        )
    except Exception as exc:
        return jsonify({"message": f"PDF parsing failed: {exc}"}), 500
    finally:
        for p in temp_files:
            if os.path.exists(p):
                os.unlink(p)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8765, debug=False)
