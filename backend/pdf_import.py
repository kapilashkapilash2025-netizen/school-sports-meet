import os
import platform
import shutil
import subprocess

import cv2
import numpy as np
import pdfplumber
import pytesseract
import regex as reg
from pdf2image import convert_from_path

HOUSE_FROM_FILE = [
    ("NAVALAR", "NAVALAR"),
    ("BARATHI", "BARATHI"),
    ("BHARATHI", "BARATHI"),
    ("VALLUVAR", "VALUVAR"),
    ("VALUVAR", "VALUVAR"),
    ("VIPULANANTHAR", "VIPULANTHAR"),
    ("VIPULANTHAR", "VIPULANTHAR"),
    ("VIPUL", "VIPULANTHAR"),
]

HOUSE_FROM_TEXT_TAMIL = [
    ("\u0ba8\u0bbe\u0bb5\u0bb2\u0bb0", "NAVALAR"),
    ("\u0baa\u0bbe\u0bb0\u0ba4\u0bbf", "BARATHI"),
    ("\u0bb5\u0bb3\u0bcd\u0bb3\u0bc1\u0bb5\u0bb0\u0bcd", "VALUVAR"),
    ("\u0bb5\u0bbf\u0baa\u0bc1\u0bb2\u0bbe\u0ba9\u0ba8\u0bcd\u0ba4\u0bb0\u0bcd", "VIPULANTHAR"),
]

DOB_RE = reg.compile(r"(20\s*\d{2}\s*[\.\-/]\s*\d{2}\s*[\.\-/]\s*\d{2})")
GRADE_RE = reg.compile(r"GRADE\s*[-:]?\s*(\d{1,2})", reg.IGNORECASE)
WINDOWS_POPPLER_BIN = r"C:\poppler\Library\bin"
WINDOWS_POPPLER_ZIP = "https://github.com/oschwartz10612/poppler-windows/releases/latest/download/Release-24.08.0-0.zip"

BAMINI_PAIRS = ["jp", "tp", "fp", "uf", "rh", "fh", "jh", "kh", "gh", "sh"]

BAMINI_MAP = {
    "m": "\u0b85", "M": "\u0b86", ",": "\u0b87", "<": "\u0b88", "c": "\u0b89", "C": "\u0b8a", "v": "\u0b8e", "V": "\u0b8f", "I": "\u0b90", "x": "\u0b92", "X": "\u0b93",
    "f": "\u0b95", "q": "\u0b99", "r": "\u0b9a", "R": "\u0b9e", "l": "\u0b9f", "L": "\u0ba3", "z": "\u0ba4", "Z": "\u0ba8", "j": "\u0baa", "J": "\u0bae",
    "y": "\u0baf", "t": "\u0bb0", "k": "\u0bb2", "K": "\u0bb3", "s": "\u0bb5", "S": "\u0bb4", "w": "\u0bb1", "W": "\u0ba9", "g": "\u0bb9", "h": "\u0bbe",
    "p": "\u0bbf", "P": "\u0bc0", "[": "\u0bc1", "{": "\u0bc2", "n": "\u0bc6", "N": "\u0bc7", "i": "\u0bc8", "o": "\u0bca", "O": "\u0bcb", ";": "\u0bcd",
    "\"": "\u0b83", "\'": "\u0b82",
}

BAMINI_POST_REPLACEMENTS = [
    ("\u0bc6\u0bbe", "\u0bca"),
    ("\u0bc7\u0bbe", "\u0bcb"),
    ("\u0bc6\u0bd7", "\u0bcc"),
    ("\u0bcd\u0bbe", "\u0bbe"),
]


def detect_house_from_filename(filename: str):
    upper_name = os.path.basename(filename or "").upper()
    for key, code in HOUSE_FROM_FILE:
        if key in upper_name:
            return code
    return "-"


def normalize_date(raw: str):
    if not raw:
        return "-"

    token = str(raw).strip().replace("/", ".").replace("-", ".")
    token = reg.sub(r"\s+", "", token)
    parts = token.split(".")
    if len(parts) != 3:
        return "-"

    try:
        year = int(parts[0])
        month = int(parts[1])
        day = int(parts[2])
    except Exception:
        return "-"

    if year < 2000 or year > 2099:
        return "-"
    if month < 1 or month > 12:
        return "-"
    if day < 1 or day > 31:
        return "-"

    return f"{year:04d}-{month:02d}-{day:02d}"


def preprocess_image(pil_img):
    img = np.array(pil_img)
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    else:
        gray = img

    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    threshold = cv2.adaptiveThreshold(
        blur,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        35,
        11,
    )
    return threshold


def group_tokens_by_line(ocr_data):
    grouped = {}

    n = len(ocr_data["text"])
    for i in range(n):
        txt = str(ocr_data["text"][i] or "").strip()
        conf = float(ocr_data["conf"][i] or -1)
        if not txt or conf < 0:
            continue

        key = (
            int(ocr_data["block_num"][i]),
            int(ocr_data["par_num"][i]),
            int(ocr_data["line_num"][i]),
        )

        grouped.setdefault(key, []).append(
            {
                "text": txt,
                "left": int(ocr_data["left"][i]),
                "width": int(ocr_data["width"][i]),
            }
        )

    lines = []
    for key in sorted(grouped.keys()):
        tokens = sorted(grouped[key], key=lambda t: t["left"])
        lines.append(tokens)

    return lines


def looks_like_bamini(text: str):
    if not text:
        return False

    if reg.search(r"[\u0B80-\u0BFF]", text):
        return False

    if any(pair in text for pair in BAMINI_PAIRS):
        return True

    if any(ch in text for ch in [";", "[", "]", "{", "}"]):
        return True

    return False


def bamini_to_unicode(text: str):
    if not text:
        return text

    if not looks_like_bamini(text):
        return text

    out = []
    for ch in text:
        out.append(BAMINI_MAP.get(ch, ch))

    converted = "".join(out)
    for src, dst in BAMINI_POST_REPLACEMENTS:
        converted = converted.replace(src, dst)

    return converted


def normalize_text(line_text: str):
    converted = bamini_to_unicode(str(line_text or ""))
    converted = reg.sub(r"(?<=\d)\s+(?=\d)", "", converted)
    converted = reg.sub(r"(?<=\d)\s*[\.\-/]\s*(?=\d)", ".", converted)
    converted = reg.sub(r"\s+", " ", converted).strip()
    return converted


def detect_house_from_text(text: str):
    normalized = normalize_text(text or "")
    upper_text = normalized.upper()

    for key, code in HOUSE_FROM_FILE:
        if key in upper_text:
            return code

    for tamil_key, code in HOUSE_FROM_TEXT_TAMIL:
        if tamil_key in normalized:
            return code

    return None


def clean_name(raw_name: str):
    name = str(raw_name or "").strip()
    name = DOB_RE.sub("", name).strip()
    name = reg.sub(r"^\s*\d+[\.)\-\s]*", "", name).strip()
    name = reg.sub(r"\s+", " ", name)
    return name


def parse_candidate_line(tokens, gender, house, grade, source_file):
    if not tokens:
        return None

    line_text = normalize_text(" ".join(t["text"] for t in tokens).strip())
    if not line_text:
        return None

    low = line_text.lower()
    if (
        "date of birth" in low
        or low.startswith("no ")
        or low in {"boys", "girls", "male", "female"}
    ):
        return None

    starts_with_no = reg.match(r"^\s*\d+", line_text) is not None
    dob_match = DOB_RE.search(line_text)

    if not starts_with_no and dob_match is None:
        return None

    dob = "-"
    name_part = line_text

    if dob_match:
        dob = normalize_date(dob_match.group(1))
        name_part = line_text[: dob_match.start()]

    name = clean_name(name_part)
    if not name:
        return None

    return {
        "name": name,
        "date_of_birth": dob,
        "gender": gender or "-",
        "house": house or "-",
        "grade": grade or "-",
        "source_file": source_file,
        "raw_line": line_text,
    }


def detect_grade_from_tokens(lines):
    header_lines = [" ".join(t["text"] for t in line[:12]) for line in lines[:25]]
    header_text = normalize_text("\n".join(header_lines))
    match = GRADE_RE.search(header_text)
    if not match:
        return "-"
    return str(match.group(1)).zfill(2)


def parse_page(image, house_default, source_file):
    processed = preprocess_image(image)
    ocr = pytesseract.image_to_data(
        processed,
        lang="tam+eng",
        config="--oem 3 --psm 6",
        output_type=pytesseract.Output.DICT,
    )

    lines = group_tokens_by_line(ocr)
    grade = detect_grade_from_tokens(lines)
    header_lines = [" ".join(t["text"] for t in line[:12]) for line in lines[:20]]
    house = detect_house_from_text("\n".join(header_lines)) or house_default

    rows = []
    width = processed.shape[1]
    mid = width / 2

    for line_tokens in lines:
        left_tokens = [t for t in line_tokens if (t["left"] + t["width"] / 2) < mid]
        right_tokens = [t for t in line_tokens if (t["left"] + t["width"] / 2) >= mid]

        left_row = parse_candidate_line(left_tokens, "Male", house, grade, source_file)
        right_row = parse_candidate_line(right_tokens, "Female", house, grade, source_file)

        if left_row:
            rows.append(left_row)
        if right_row:
            rows.append(right_row)

    return rows


def detect_grade_from_text(text: str):
    normalized = normalize_text(text or "")
    match = GRADE_RE.search(normalized)
    if not match:
        return "-"
    return str(match.group(1)).zfill(2)


def parse_text_line(line_text, gender, house, grade, source_file):
    normalized = normalize_text(str(line_text or "").strip())
    if not normalized:
        return None

    low = normalized.lower()
    if (
        "date of birth" in low
        or low.startswith("no ")
        or low in {"boys", "girls", "male", "female"}
    ):
        return None

    starts_with_no = reg.match(r"^\s*\d+", normalized) is not None
    dob_match = DOB_RE.search(normalized)

    if not starts_with_no and dob_match is None:
        return None

    dob = "-"
    name_part = normalized

    if dob_match:
        dob = normalize_date(dob_match.group(1))
        name_part = normalized[: dob_match.start()]

    name = clean_name(name_part)
    if not name:
        return None

    return {
        "name": name,
        "date_of_birth": dob,
        "gender": gender or "-",
        "house": house or "-",
        "grade": grade or "-",
        "source_file": source_file,
        "raw_line": normalized,
    }


def parse_pdf_with_pdfplumber(pdf_path: str, house_default: str, source_filename: str):
    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            grade = detect_grade_from_text(text)
            house = detect_house_from_text(text) or house_default
            current_gender = "Male"

            for line in text.splitlines():
                low = line.lower()
                if "boys" in low or "male" in low:
                    current_gender = "Male"
                    continue
                if "girls" in low or "female" in low:
                    current_gender = "Female"
                    continue

                row = parse_text_line(line, current_gender, house, grade, source_filename)
                if row:
                    rows.append(row)

    return rows


def poppler_available(poppler_path=None):
    exe = "pdftoppm.exe" if platform.system() == "Windows" else "pdftoppm"

    if poppler_path:
        return os.path.exists(os.path.join(poppler_path, exe))

    return shutil.which("pdftoppm") is not None


def verify_poppler_command(poppler_path=None):
    exe = "pdftoppm.exe" if platform.system() == "Windows" else "pdftoppm"
    cmd = exe

    if poppler_path:
        cmd = os.path.join(poppler_path, exe)

    try:
        result = subprocess.run([cmd, "-v"], capture_output=True, text=True, check=False)
        return result.returncode == 0
    except Exception:
        return False


def install_poppler_windows():
    print("Poppler not found. Installing automatically...")

    if os.path.isdir(WINDOWS_POPPLER_BIN):
        return True

    install_script = f"""
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$zip = Join-Path $env:TEMP 'poppler.zip'
$extract = Join-Path $env:TEMP 'poppler_extract'
if (Test-Path $zip) {{ Remove-Item $zip -Force }}
if (Test-Path $extract) {{ Remove-Item $extract -Recurse -Force }}
Invoke-WebRequest -Uri '{WINDOWS_POPPLER_ZIP}' -OutFile $zip
Expand-Archive -Path $zip -DestinationPath $extract -Force
$inner = Get-ChildItem $extract -Directory | Select-Object -First 1
if (-not $inner) {{ throw 'Poppler archive extraction failed' }}
if (Test-Path 'C:\\poppler') {{ Remove-Item 'C:\\poppler' -Recurse -Force }}
Move-Item -Path $inner.FullName -Destination 'C:\\poppler'
$target='C:\\poppler\\Library\\bin'
if (-not (Test-Path $target)) {{ throw 'C:\\poppler\\Library\\bin not found' }}
$userPath=[Environment]::GetEnvironmentVariable('Path','User')
if ($userPath -notlike '*C:\\poppler\\Library\\bin*') {{
  [Environment]::SetEnvironmentVariable('Path', "$userPath;C:\\poppler\\Library\\bin", 'User')
}}
"""

    try:
        subprocess.run([
            "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", install_script
        ], check=True, capture_output=True, text=True)
        return os.path.isdir(WINDOWS_POPPLER_BIN)
    except Exception:
        return False


def install_poppler_macos():
    print("Poppler not found. Installing automatically...")
    try:
        subprocess.run(["brew", "install", "poppler"], check=True)
        return True
    except Exception:
        return False


def install_poppler_linux():
    print("Poppler not found. Installing automatically...")
    try:
        subprocess.run(["sudo", "apt", "update"], check=True)
        subprocess.run(["sudo", "apt", "install", "-y", "poppler-utils"], check=True)
        return True
    except Exception:
        return False


def ensure_poppler_ready():
    system = platform.system()

    env_poppler = os.environ.get("POPPLER_PATH")
    if env_poppler and poppler_available(env_poppler) and verify_poppler_command(env_poppler):
        return env_poppler

    if poppler_available() and verify_poppler_command():
        return None

    if system == "Windows":
        if poppler_available(WINDOWS_POPPLER_BIN) and verify_poppler_command(WINDOWS_POPPLER_BIN):
            return WINDOWS_POPPLER_BIN
        if install_poppler_windows() and poppler_available(WINDOWS_POPPLER_BIN):
            return WINDOWS_POPPLER_BIN
    elif system == "Darwin":
        if install_poppler_macos() and poppler_available():
            return None
    elif system == "Linux":
        if install_poppler_linux() and poppler_available():
            return None

    raise RuntimeError("Poppler installation failed. Please install Poppler manually.")


def parse_pdf_file(pdf_path: str, source_filename: str):
    house_default = detect_house_from_filename(source_filename)

    try:
        poppler_path = ensure_poppler_ready()
        pages = convert_from_path(pdf_path, dpi=300, poppler_path=poppler_path)
        rows = []
        for page_img in pages:
            rows.extend(parse_page(page_img, house_default, source_filename))
        if rows:
            return rows
    except Exception:
        pass

    text_rows = parse_pdf_with_pdfplumber(pdf_path, house_default, source_filename)
    if text_rows:
        return text_rows

    return []


def parse_many_pdfs(file_entries):
    all_rows = []
    for entry in file_entries:
        pdf_path = entry["path"]
        source_file = entry["filename"]
        all_rows.extend(parse_pdf_file(pdf_path, source_file))
    return all_rows
