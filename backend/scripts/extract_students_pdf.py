import json
import re
import sys
from datetime import datetime

try:
    import fitz  # PyMuPDF
except Exception as exc:
    sys.stderr.write("PyMuPDF library required. Install using: pip install pymupdf\n")
    sys.stderr.write(str(exc))
    sys.exit(2)

try:
    from tamil import txt2unicode as tamil_converter
except Exception:
    tamil_converter = None

HOUSE_MAP = [
    ("navalar", "NAVALAR"),
    ("barathi", "BARATHI"),
    ("bharathi", "BARATHI"),
    ("valluvar", "VALUVAR"),
    ("valuvar", "VALUVAR"),
    ("vipulananthar", "VIPULANTHAR"),
    ("vipulanthar", "VIPULANTHAR"),
]

DATE_RE = re.compile(r"^(\d{4}[./-]\d{2}[./-]\d{2}|\d{2}[./-]\d{2}[./-]\d{4})$")
TAMIL_RE = re.compile(r"[\u0B80-\u0BFF]")


def detect_house(text: str):
    low = (text or "").lower()
    for keyword, code in HOUSE_MAP:
        if keyword in low:
            return code
    return None


def normalize_date(raw: str):
    value = (raw or "").strip()
    m = re.match(r"^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$", value)
    if not m:
        return None

    a = int(m.group(1))
    b = int(m.group(2))
    c = int(m.group(3))

    if a > 1900:
        year, month, day = a, b, c
    elif c > 1900:
        year, month, day = c, b, a
    else:
        year = c + (1900 if c > 50 else 2000)
        month, day = b, a

    try:
        dt = datetime(year, month, day)
    except ValueError:
        return None

    return dt.strftime("%Y-%m-%d")


def tamil_score(value: str):
    if not value:
        return 0
    return len(TAMIL_RE.findall(value))


def convert_tamil_font(text: str):
    raw = (text or "").strip()
    if not raw:
        return raw

    if tamil_score(raw) > 0:
        return raw

    if tamil_converter is None:
        return raw

    candidates = [raw]

    try:
        candidates.append(tamil_converter.bamini2unicode(raw))
    except Exception:
        pass

    try:
        candidates.append(tamil_converter.tab2unicode(raw))
    except Exception:
        pass

    best = raw
    best_score = tamil_score(raw)

    for cand in candidates:
        c = re.sub(r"\s+", " ", str(cand or "")).strip()
        score = tamil_score(c)
        if score > best_score:
            best = c
            best_score = score

    return best


def clean_name(text: str):
    name = (text or "").strip()
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"\b(no|name|date\s*of\s*birth|dob|boys?|girls?)\b", "", name, flags=re.I)
    name = re.sub(r"\s+", " ", name).strip(" -|:")
    name = convert_tamil_font(name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def group_words_by_line(words):
    line_map = {}
    for w in words:
        x0, y0, x1, y1, token = w[0], w[1], w[2], w[3], w[4]
        if not token or not str(token).strip():
            continue
        line_key = round(y0, 1)
        line_map.setdefault(line_key, []).append((x0, y0, x1, y1, token.strip()))

    lines = []
    for _, row in sorted(line_map.items(), key=lambda item: item[0]):
        row_sorted = sorted(row, key=lambda t: t[0])
        lines.append(row_sorted)

    return lines


def parse_line_entries(line_words, page_width, house):
    entries = []

    for i, word in enumerate(line_words):
        token = word[4]
        if not DATE_RE.match(token):
            continue

        dob_norm = normalize_date(token)
        if not dob_norm:
            continue

        date_x = word[0]
        gender = "Male" if date_x < (page_width / 2) else "Female"

        start = 0
        if line_words and re.fullmatch(r"\d+[.)]?", line_words[0][4]):
            start = 1

        candidate_tokens = [w[4] for w in line_words[start:i] if not re.fullmatch(r"\d+[.)]?", w[4])]
        name = clean_name(" ".join(candidate_tokens))

        if not name:
            back_tokens = []
            for j in range(i - 1, -1, -1):
                t = line_words[j][4]
                if re.fullmatch(r"\d+[.)]?", t):
                    break
                back_tokens.append(t)
            name = clean_name(" ".join(reversed(back_tokens)))

        if not name:
            continue

        entries.append(
            {
                "name": name,
                "date_of_birth": dob_norm,
                "house": house,
                "gender": gender,
            }
        )

    return entries


def dedupe_rows(rows):
    unique = []
    seen = set()

    for row in rows:
        key = f"{row['name'].lower()}|{row['date_of_birth']}|{row['gender']}|{row['house']}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)

    return unique


def extract_students(pdf_path: str):
    doc = fitz.open(pdf_path)
    all_rows = []

    for page in doc:
        width = page.rect.width
        height = page.rect.height

        title_clip = fitz.Rect(0, 0, width, min(170, height * 0.25))
        title_text = page.get_text("text", clip=title_clip)
        page_text = page.get_text("text")
        house = detect_house(title_text) or detect_house(page_text[:1200])

        if not house:
            continue

        body_clip = fitz.Rect(0, min(150, height * 0.2), width, height)
        words = page.get_text("words", clip=body_clip) or []
        lines = group_words_by_line(words)

        for line_words in lines:
            joined = " ".join([w[4] for w in line_words]).lower()
            if (
                "date of birth" in joined
                or joined.startswith("no ")
                or joined in {"boys", "girls", "boy", "girl"}
            ):
                continue

            all_rows.extend(parse_line_entries(line_words, width, house))

    return dedupe_rows(all_rows)


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: extract_students_pdf.py <pdf-path>\n")
        sys.exit(1)

    pdf_path = sys.argv[1]
    rows = extract_students(pdf_path)
    print(json.dumps({"rows": rows}, ensure_ascii=False))


if __name__ == "__main__":
    main()
