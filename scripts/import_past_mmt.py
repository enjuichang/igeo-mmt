#!/usr/bin/env python3
"""Normalize the heterogeneous past iGeo MMT archive.

The source archive mixes slide-export PDFs, multi-question PDFs, and legacy
Word files. This importer keeps the source files immutable, extracts the
question/option/answer structure, and renders a question-aligned WebP asset.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pdfplumber
from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "data" / "Past MMT"
OUTPUT_JSON = ROOT / "data" / "questions" / "igeo-past-questions.json"
PUBLIC_MEDIA = ROOT / "public" / "igeo-mmt"
OFFICIAL_ARCHIVE_URL = "https://geoolympiad.org/document-library/"


@dataclass(frozen=True)
class Edition:
    year: int
    city: str
    country: str
    question_file: str
    answer_file: str
    question_count: int
    mode: str
    media_file: str | None = None

    @property
    def location(self) -> str:
        return f"{self.city}, {self.country}"

    def source_path(self, filename: str) -> Path:
        return ARCHIVE / str(self.year) / filename


EDITIONS = [
    Edition(2002, "Durban", "South Africa", "2002MMTquestions.pdf", "2002MMTanswers.pdf", 40, "mixed-open"),
    Edition(2006, "Brisbane", "Australia", "2006MMTquestions.doc", "2006MMTanswers.doc", 30, "legacy-doc", "2006MMTpictures.pdf"),
    Edition(2008, "Carthage", "Tunisia", "2008MMTQuestions.doc", "2008MMTAnswers.doc", 30, "legacy-doc", "2008MMTTest.pdf"),
    Edition(2010, "Taipei", "Taiwan", "2010iGeo_MMT_question.pdf", "2010iGeo_MMT_Answer.pdf", 40, "slide-pdf"),
    Edition(2012, "Cologne", "Germany", "2012MMT.pdf", "2012MMTAnswers.doc", 30, "slide-pdf"),
    Edition(2014, "Kraków", "Poland", "2014MMtest.pdf", "2014MManswercodes.pdf", 40, "slide-pdf"),
    Edition(2015, "Tver", "Russia", "2015MMtest.pdf", "2015MManswercode.pdf", 40, "slide-pdf"),
    Edition(2016, "Beijing", "China", "2016MMtest_no_answer.pdf", "2016MMtest.pdf", 40, "colored-answer-slides"),
    Edition(2017, "Belgrade", "Serbia", "MULTIMEDIA TEST_2017iGeo.pdf", "MULTIMEDIA TEST ANSWERS_2017iGeo.pdf", 40, "survey-answer-slides"),
    Edition(2018, "Québec City", "Canada", "MMT_QUESTION_2018iGeo.pdf", "MMT_ANSWERS_2018iGeo.pdf", 40, "survey-answer-slides"),
    Edition(2021, "Istanbul", "Türkiye", "iGeo_2021_MMT.pdf", "iGeo_2021_MMT_ans.pdf", 40, "socrative"),
    Edition(2022, "Paris", "France", "2022 MMT no answers.pdf", "iGeo_2022_MMT_ans.pdf", 40, "socrative"),
]


def clean_text(value: str) -> str:
    replacements = {
        "\x00": "r",
        "\f": "\n",
        "\uf0b7": " ",
        "\uf0d8": " ",
        "\uf0e0": " ",
        "\u2028": "\n",
        "\u2029": "\n",
        "\u202c": "",
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u00a0": " ",
        "\u0410": "A",
    }
    for old, new in replacements.items():
        value = value.replace(old, new)
    value = re.sub(r"(?<=\d)r(?=\d{2}\b)", ":", value)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def clean_layout_text(value: str) -> str:
    replacements = {
        "\x00": "r",
        "\f": "\n",
        "\uf0b7": " ",
        "\uf0d8": " ",
        "\uf0e0": " ",
        "\u2028": "\n",
        "\u2029": "\n",
        "\u202c": "",
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u00a0": " ",
        "\u0410": "A",
    }
    for old, new in replacements.items():
        value = value.replace(old, new)
    value = re.sub(r"(?<=\d)r(?=\d{2}\b)", ":", value)
    return value.strip()


def normalize_inline(value: str) -> str:
    return re.sub(r"\s+", " ", clean_text(value)).strip(" -;:")


def normalized_for_match(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def pdf_pages(path: Path, layout: bool = True) -> list[str]:
    with pdfplumber.open(path) as pdf:
        cleaner = clean_layout_text if layout else clean_text
        return [cleaner(page.extract_text(layout=layout) or "") for page in pdf.pages]


def pdftotext_layout(path: Path) -> str:
    completed = subprocess.run(
        ["pdftotext", "-layout", "-enc", "UTF-8", str(path), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return clean_layout_text(completed.stdout)


def convert_doc_to_pdf(path: Path, temp_dir: Path) -> Path:
    profile = temp_dir / f"lo-{path.stem}"
    profile.mkdir(parents=True, exist_ok=True)
    command = [
        "soffice",
        "--headless",
        f"-env:UserInstallation=file://{profile}",
        "--convert-to",
        "pdf",
        "--outdir",
        str(temp_dir),
        str(path),
    ]
    subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output = temp_dir / f"{path.stem}.pdf"
    if not output.exists():
        raise RuntimeError(f"LibreOffice did not create {output}")
    return output


def converted_source(path: Path, temp_dir: Path) -> Path:
    if path.suffix.lower() != ".doc":
        return path
    return convert_doc_to_pdf(path, temp_dir) if shutil.which("soffice") else path


def legacy_doc_text(path: Path) -> str:
    """Extract text from a binary Word document without modifying the archive."""
    if path.suffix.lower() != ".doc":
        return "\n".join(pdf_pages(path, layout=False))
    textutil = shutil.which("textutil")
    if not textutil:
        raise RuntimeError(
            f"Cannot read legacy Word file {path}; install LibreOffice (soffice) "
            "or run the importer on macOS with textutil available."
        )
    completed = subprocess.run(
        [textutil, "-convert", "txt", "-stdout", str(path)],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    text = clean_text(completed.stdout)
    # The 2006 Word file has no visible question-number glyph before Q9.
    if path.name == "2006MMTquestions.doc":
        text = text.replace(
            "What is the name of the country coloured dark green on the map?",
            "9. What is the name of the country coloured dark green on the map?",
            1,
        )
    return text


def answer_key_from_colored_sheet(path: Path, count: int) -> dict[int, str]:
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[0]
        red = [
            word
            for word in page.extract_words(extra_attrs=["non_stroking_color"])
            if word["text"] in {"A", "B", "C", "D"}
            and tuple(word.get("non_stroking_color") or ()) in {(1.0, 0.0, 0.0), (1, 0, 0)}
        ]
        split = math.ceil(count / 2)
        left = sorted((word for word in red if word["x0"] < page.width / 2), key=lambda word: word["top"])
        right = sorted((word for word in red if word["x0"] >= page.width / 2), key=lambda word: word["top"])
        if len(left) != split or len(right) != count - split:
            raise ValueError(f"Expected {count} colored answers in {path}, found {len(red)}")
        result = {index + 1: word["text"] for index, word in enumerate(left)}
        result.update({split + index + 1: word["text"] for index, word in enumerate(right)})
        return result


def answer_key_from_legacy_text(path: Path) -> dict[int, str]:
    text = legacy_doc_text(path)
    result: dict[int, str] = {}
    for match in re.finditer(r"(?m)^\s*(\d{1,2})\s+([A-D])(?:\s|$)", text):
        result[int(match.group(1))] = match.group(2)
    # textutil represents cells in some old Word tables with ASCII bell
    # delimiters and repeats the keyed letter across several scoring columns.
    for match in re.finditer(r"(?:^|\x07)(\d{1,2})\x07([A-D])(?:\x07|$)", text):
        result[int(match.group(1))] = match.group(2)
    if path.name == "2012MMTAnswers.doc" and len(result) < 30:
        # The official key distinguishes answers only through Word character
        # formatting, which textutil cannot expose. This is the transcribed
        # sequence from that sheet, used when LibreOffice is unavailable.
        result = {
            number: letter
            for number, letter in enumerate("DADBAABDCACBCCBCBABDDCAACBBCDD", start=1)
        }
    return result


def colored_slide_answer(path: Path, page_index: int, options: list[str]) -> str:
    with pdfplumber.open(path) as pdf:
        words = pdf.pages[page_index].extract_words(extra_attrs=["non_stroking_color"])
    red_text = " ".join(
        word["text"]
        for word in words
        if tuple(word.get("non_stroking_color") or ()) in {(1.0, 0.0, 0.0), (1, 0, 0)}
        and not re.fullmatch(r"Q\.?\d+", word["text"], re.I)
    )
    red_normalized = normalized_for_match(red_text)
    scores: list[tuple[float, int]] = []
    for index, option in enumerate(options):
        normalized_option = normalized_for_match(option)
        tokens = normalized_option.split()
        overlap = sum(1 for token in tokens if len(token) > 1 and token in red_normalized)
        exact = bool(normalized_option) and (
            normalized_option in red_normalized
            if len(normalized_option) > 1
            else bool(re.search(rf"\b{re.escape(normalized_option)}\b", red_normalized))
        )
        label = chr(65 + index)
        label_only = red_normalized == label.lower()
        scores.append((overlap + (10 if exact else 0) + (5 if label_only else 0), index))
    score, index = max(scores)
    if score <= 0:
        # Image-labelled answers usually expose only the selected letter in red.
        letters = re.findall(r"\b([A-D])\b", red_text)
        if len(letters) == 1:
            return letters[0]
        raise ValueError(f"Could not match colored answer on page {page_index + 1}: {red_text!r}")
    return chr(65 + index)


OPTION_MARKER = re.compile(
    r"(?m)(?:^[ \t]*([A-D])(?:[.)]|[ \t]+)[ \t]*|[ \t]{2,}([A-D])(?:[.)]|[ \t]{2,})[ \t]*)"
)


def parse_options(text: str) -> tuple[str, list[str]]:
    text = clean_layout_text(text)
    matches = list(OPTION_MARKER.finditer(text))
    # PDF text order follows visual columns, so a two-column slide may expose
    # labels as A-C-B-D. Find a four-marker window containing each label once,
    # then restore canonical A-B-C-D order.
    for start in range(max(0, len(matches) - 3)):
        sequence = matches[start : start + 4]
        letters = [marker.group(1) or marker.group(2) for marker in sequence]
        if set(letters) != {"A", "B", "C", "D"}:
            continue
        prompt = text[: sequence[0].start()]
        option_map: dict[str, str] = {}
        for index, marker in enumerate(sequence):
            end = sequence[index + 1].start() if index < 3 else len(text)
            option = normalize_inline(text[marker.end() : end])
            option_map[letters[index]] = option
        options = [option_map[letter] for letter in "ABCD"]
        options[-1] = strip_trailing_slide_noise(options[-1])
        if all(options):
            return clean_prompt(prompt), options
    return clean_prompt(text), []


def parse_unlabelled_legacy_options(text: str) -> tuple[str, list[str]]:
    """Recover old Word questions whose four choices have no A-D labels."""
    lines = [normalize_inline(line) for line in clean_text(text).splitlines()]
    lines = [line for line in lines if line]
    for index, line in enumerate(lines):
        if re.fullmatch(r"(?i)PAGE(?:\s+\d+)?", line) or re.match(
            r"(?i)^Multimedia Test\s+International Geography Olympiad", line
        ):
            lines = lines[:index]
            break
    if len(lines) < 5:
        return clean_prompt(text), []
    raw_options = lines[-4:]
    options = [re.sub(r"^[A-D][.)]\s*", "", option) for option in raw_options]
    if not all(options):
        return clean_prompt(text), []
    return clean_prompt("\n".join(lines[:-4])), options


def parse_numeric_options(text: str) -> tuple[str, list[str]]:
    matches = list(re.finditer(r"(?m)^[ \t]{5,}([1-4])\.[ \t]+", text))
    if [match.group(1) for match in matches[:4]] != ["1", "2", "3", "4"]:
        return clean_prompt(text), []
    sequence = matches[:4]
    prompt = text[: sequence[0].start()]
    options = []
    for index, marker in enumerate(sequence):
        end = sequence[index + 1].start() if index < 3 else len(text)
        options.append(strip_trailing_slide_noise(text[marker.end() : end]))
    return clean_prompt(prompt), options


def generic_visual_options(text: str) -> bool:
    compact = clean_text(text)
    if re.search(r"(?i)\bA\s*,\s*B\s*,\s*C\s+(?:or|and)\s+D\b", compact):
        return True
    if re.search(r"(?i)\b(?:letters?|images?|graphs?|locations?|zones?)\s+A\s+(?:to|through)\s+D\b", compact):
        return True
    labels = re.findall(r"(?m)^\s*([A-D])\s*$", compact)
    return set(labels) == {"A", "B", "C", "D"}


def strip_trailing_slide_noise(value: str) -> str:
    value = re.split(
        r"(?i)\b(?:THE END|The last slide|You have reached|Source:|Figure\s+\d+\s+SHAPE)\b",
        value,
    )[0]
    return normalize_inline(value)


def clean_prompt(text: str) -> str:
    question_marker = re.search(r"(?i)\bQ(?:uestion)?\s*[. ]*0?\d{1,2}[ab]?\b", text)
    if question_marker:
        prefix_lines = [
            normalize_inline(line)
            for line in text[: question_marker.start()].splitlines()
            if normalize_inline(line)
            and not re.search(r"(?i)(?:source:|https?://|www\.)", line)
        ]
        if not prefix_lines:
            text = text[question_marker.start() :]
    lines = []
    for raw_line in clean_text(text).splitlines():
        line = normalize_inline(raw_line)
        if not line:
            continue
        if re.match(r"(?i)^(?:source|https?://|www\.)", line):
            continue
        if re.match(r"(?i)^(?:multimedia test|multi media test|instructions|good luck)$", line):
            continue
        line = line.lstrip("• ")
        line = re.sub(r"(?i)^Q(?:uestion)?\s*[. ]*0?(\d{1,2})\s*[:.-]?\s*", "", line)
        line = re.sub(r"^\d{1,2}\.[ \t]+", "", line)
        line = re.sub(r"(?i)\b0/1\s+PUNT\b", "", line)
        if line:
            lines.append(line)
    return normalize_inline(" ".join(lines))


def split_numbered_blocks(text: str, count: int) -> dict[int, str]:
    starts = list(
        re.finditer(
            r"(?m)^[ \t]{0,4}(\d{1,2})(?:\.(?=[A-Z])|\.[ \t]+|\.[ \t]*(?=\n)|[ \t]+)",
            text,
        )
    )
    result: dict[int, str] = {}
    for index, start in enumerate(starts):
        number = int(start.group(1))
        if not 1 <= number <= count or number in result:
            continue
        end = starts[index + 1].start() if index + 1 < len(starts) else len(text)
        result[number] = text[start.start() : end]
    return result


def page_question_number(text: str) -> int | None:
    match = re.search(r"(?i)\bQ(?:uestion)?\s*[. ]*0?(\d{1,2})[ab]?\b", text)
    return int(match.group(1)) if match else None


def survey_page_data(text: str) -> tuple[str, list[str], str]:
    fraction_pattern = re.compile(r"(?m)^\s*\.[A-D]*(\d{1,2})\s+(.+?)\s*$")
    fractions = list(fraction_pattern.finditer(text))
    if len(fractions) < 4:
        raise ValueError("Survey-answer page does not contain four response fractions")
    fractions = fractions[-4:]
    prompt = clean_prompt(text[: fractions[0].start()])
    options = [strip_trailing_slide_noise(match.group(2)) for match in fractions]
    answer_index = max(range(4), key=lambda index: int(fractions[index].group(1)))
    return prompt, options, chr(65 + answer_index)


def topic_metadata(prompt: str, options: Iterable[str]) -> tuple[str, list[str], str]:
    text = f"{prompt} {' '.join(options)}".lower()
    detailed: set[str] = set()
    keyword_tags = {
        "Climate and weather": ["climate", "weather", "rain", "precipitation", "temperature", "wind", "cloud", "hurricane", "monsoon", "drought"],
        "Geomorphology": ["landform", "erosion", "weathering", "dune", "valley", "karst", "glacier", "landslide", "soil"],
        "Geology and tectonics": ["rock", "volcan", "earthquake", "tectonic", "mineral", "eruption", "fault", "lava"],
        "Hydrology and oceans": ["river", "lake", "ocean", "sea", "water", "current", "coast", "wetland"],
        "Population and migration": ["population", "migration", "fertility", "mortality", "demograph", "refugee"],
        "Urban geography": ["city", "urban", "settlement", "cbd", "town", "metropolitan"],
        "Economic geography": ["trade", "gdp", "industry", "production", "company", "transport", "tourism", "agricultur", "energy"],
        "Cultural geography": ["language", "religion", "cultural", "indigenous", "heritage"],
        "Political geography": ["border", "country", "capital", "territor", "conflict", "geopolit"],
        "Biogeography": ["forest", "ecosystem", "species", "vegetation", "animal", "plant"],
        "Cartography": ["map", "cartogram", "legend", "scale", "longitude", "latitude", "coordinate", "bearing", "gis"],
        "Data interpretation": ["graph", "diagram", "table", "figure", "model", "chart"],
        "Remote sensing": ["satellite", "aerial", "image", "photo"],
        "Environmental change": ["pollution", "climate change", "sustainab", "environment", "deforestation", "emission"],
    }
    for tag, needles in keyword_tags.items():
        if any(needle in text for needle in needles):
            detailed.add(tag)
    if detailed & {"Climate and weather", "Geomorphology", "Geology and tectonics", "Hydrology and oceans", "Biogeography"}:
        category = "Physical geography"
        skill = "Physical-process interpretation"
    elif detailed & {"Population and migration", "Urban geography", "Economic geography", "Cultural geography", "Political geography"}:
        category = "Human geography"
        skill = "Human-geography interpretation"
    elif detailed & {"Cartography", "Data interpretation", "Remote sensing"}:
        category = "Geospatial skills"
        skill = "Map and data interpretation"
    elif "Environmental change" in detailed:
        category = "Environmental geography"
        skill = "Human-environment interpretation"
    else:
        category = "Regional geography"
        skill = "Geographic knowledge and interpretation"
    return category, sorted(detailed), skill


def render_pdf_page(path: Path, page_number: int, dpi: int = 120) -> Image.Image:
    with tempfile.TemporaryDirectory(prefix="mmt-render-") as directory:
        prefix = Path(directory) / "page"
        subprocess.run(
            [
                "pdftoppm",
                "-f",
                str(page_number),
                "-l",
                str(page_number),
                "-singlefile",
                "-png",
                "-r",
                str(dpi),
                str(path),
                str(prefix),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        return Image.open(prefix.with_suffix(".png")).convert("RGB")


def render_pdf_document(path: Path, output_dir: Path, dpi: int = 120) -> dict[int, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = output_dir / "page"
    subprocess.run(
        ["pdftoppm", "-png", "-r", str(dpi), str(path), str(prefix)],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    result: dict[int, Path] = {}
    for image_path in output_dir.glob("page-*.png"):
        match = re.search(r"-(\d+)\.png$", image_path.name)
        if match:
            result[int(match.group(1))] = image_path
    if not result:
        raise RuntimeError(f"Poppler produced no page renders for {path}")
    return result


def trim_white(image: Image.Image, padding: int = 16) -> Image.Image:
    background = Image.new("RGB", image.size, "white")
    difference = ImageChops.difference(image, background).convert("L")
    bbox = difference.point(lambda value: 0 if value < 10 else 255).getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    return image.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(image.width, right + padding),
            min(image.height, bottom + padding),
        )
    )


def save_webp(image: Image.Image, edition: Edition, number: int) -> Path:
    output = PUBLIC_MEDIA / str(edition.year) / f"{edition.year}-q{number:02d}.webp"
    output.parent.mkdir(parents=True, exist_ok=True)
    trim_white(image).save(output, "WEBP", quality=84, method=6)
    return output


def question_positions(path: Path) -> dict[int, tuple[int, float, float]]:
    result: dict[int, tuple[int, float, float]] = {}
    with pdfplumber.open(path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            words = page.extract_words()
            headings = []
            for word in words:
                match = re.fullmatch(r"(\d{1,2})\.", word["text"])
                if match and word["x0"] < page.width * 0.2:
                    headings.append((int(match.group(1)), float(word["top"])))
            headings.sort(key=lambda item: item[1])
            for index, (number, top) in enumerate(headings):
                bottom = headings[index + 1][1] if index + 1 < len(headings) else page.height
                result[number] = (page_index, max(0, top - 12), min(page.height, bottom - 4))
    return result


def crop_question_block(path: Path, page_index: int, top: float, bottom: float) -> Image.Image:
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[page_index]
        scale = 120 / 72
        image = render_pdf_page(path, page_index + 1, 120)
        y0 = max(0, int(top * scale))
        y1 = min(image.height, int(bottom * scale))
        return image.crop((0, y0, image.width, y1))


def stack_images(images: list[Image.Image]) -> Image.Image:
    width = max(image.width for image in images)
    resized = [
        image if image.width == width else image.resize((width, round(image.height * width / image.width)))
        for image in images
    ]
    canvas = Image.new("RGB", (width, sum(image.height for image in resized)), "white")
    y = 0
    for image in resized:
        canvas.paste(image, (0, y))
        y += image.height
    return canvas


def page_map(path: Path) -> dict[int, int]:
    mapping: dict[int, int] = {}
    for page_index, text in enumerate(pdf_pages(path)):
        number = page_question_number(text)
        if number is not None and number not in mapping:
            mapping[number] = page_index
    return mapping


def repeated_media_page_map(path: Path) -> dict[int, list[int]]:
    mapping: dict[int, list[int]] = {}
    for page_index, text in enumerate(pdf_pages(path)):
        number = page_question_number(text)
        if number is None:
            standalone = re.search(r"(?m)^\s*(\d{1,2})\s*$", text)
            number = int(standalone.group(1)) if standalone else None
        if number is not None:
            mapping.setdefault(number, []).append(page_index)
    return mapping


def socrative_answer_key(question_pdf: Path, answer_pdf: Path) -> dict[int, str]:
    positions = question_positions(answer_pdf)
    result: dict[int, str] = {}
    image_cache: dict[int, tuple[Image.Image, Image.Image]] = {}
    with pdfplumber.open(answer_pdf) as answer_doc:
        for number, (page_index, top, bottom) in positions.items():
            page = answer_doc.pages[page_index]
            labels = [
                word
                for word in page.extract_words(extra_attrs=["fontname"])
                if word["text"] in {"A", "B", "C", "D"}
                and top <= word["top"] < bottom
                and word["x0"] < page.width * 0.2
                and "Montserrat" in (word.get("fontname") or "")
            ]
            labels.sort(key=lambda word: word["top"])
            if len(labels) != 4:
                raise ValueError(f"Expected four answer labels for {number}, found {len(labels)}")
            if page_index not in image_cache:
                image_cache[page_index] = (
                    render_pdf_page(question_pdf, page_index + 1, 144),
                    render_pdf_page(answer_pdf, page_index + 1, 144),
                )
            q_image, a_image = image_cache[page_index]
            difference = ImageChops.difference(q_image, a_image)
            scores = []
            for index, label in enumerate(labels):
                scale = 2
                x0 = max(0, int((label["x0"] - 18) * scale))
                x1 = min(difference.width, int((label["x1"] + 8) * scale))
                y0 = max(0, int((label["top"] - 7) * scale))
                y1 = min(difference.height, int((label["bottom"] + 7) * scale))
                crop = difference.crop((x0, y0, x1, y1)).convert("L")
                scores.append((sum(1 for pixel in crop.get_flattened_data() if pixel > 20), index))
            score, answer_index = max(scores)
            if score < 5:
                raise ValueError(f"No answer check detected for question {number}: {scores}")
            result[number] = chr(65 + answer_index)
    return result


def make_record(
    edition: Edition,
    number: int,
    prompt: str,
    options: list[str],
    answer_letter: str | None,
    answer_text: str | None,
    media_path: Path,
    source_pages: list[int],
) -> dict:
    if answer_letter and len(options) == 4:
        answer_index = ord(answer_letter) - 65
        answer = options[answer_index]
    else:
        answer_index = None
        answer = normalize_inline(answer_text or "")
    category, detailed_tags, skill = topic_metadata(prompt, options)
    question_type = "multiple-choice" if len(options) == 4 else "open-response"
    public_path = "/" + str(media_path.relative_to(ROOT / "public")).replace("\\", "/")
    source_question = f"data/Past MMT/{edition.year}/{edition.question_file}"
    source_answer = f"data/Past MMT/{edition.year}/{edition.answer_file}"
    return {
        "Question Name": prompt,
        "Question ID": f"igeo-{edition.year}-mmt-q{number:02d}",
        "iGeo Year": edition.year,
        "Location": edition.location,
        "Question Number": number,
        "Question Type": question_type,
        "Image/Media source": {
            "Provider": "International Geography Olympiad",
            "Local path": str(media_path.relative_to(ROOT)).replace("\\", "/"),
            "Image URL": public_path,
            "Source pages": source_pages,
        },
        "Source URL": OFFICIAL_ARCHIVE_URL,
        "Source files": {"Questions": source_question, "Answers": source_answer},
        "Category/Tags": [category, *detailed_tags],
        "Options": options,
        "Answer": answer,
        "Answer Index": answer_index,
        "Explanation": (
            f"Official {edition.year} iGeo MMT answer key: {answer_letter} ({answer})."
            if answer_letter
            else f"Official {edition.year} iGeo MMT answer: {answer}."
        ),
        "Skill": skill,
    }


def parse_2002_answers(path: Path, count: int) -> dict[int, str]:
    text = pdftotext_layout(path)
    blocks = split_numbered_blocks(text, count)
    result: dict[int, str] = {}
    for number, block in blocks.items():
        body = re.sub(r"^[ \t]{0,4}\d{1,2}\.[ \t]+", "", block, count=1)
        body = re.sub(r"(?m)^\s*\d+\.\s*", "", body)
        result[number] = normalize_inline(body)
    return result


def import_edition(edition: Edition, temp_dir: Path, render_media: bool) -> list[dict]:
    question_source = converted_source(edition.source_path(edition.question_file), temp_dir)
    answer_source = converted_source(edition.source_path(edition.answer_file), temp_dir)
    media_source = edition.source_path(edition.media_file) if edition.media_file else question_source
    question_page_texts = (
        [] if question_source.suffix.lower() == ".doc" else pdf_pages(question_source)
    )
    records: list[dict] = []
    render_cache: dict[tuple[Path, int], Image.Image] = {}
    rendered_documents: dict[Path, dict[int, Path]] = {}

    def cached_page(path: Path, page_number: int) -> Image.Image:
        key = (path, page_number)
        if key not in render_cache:
            if path not in rendered_documents:
                safe_stem = re.sub(r"[^a-zA-Z0-9]+", "-", path.stem).strip("-")
                rendered_documents[path] = render_pdf_document(
                    path, temp_dir / f"render-{edition.year}-{safe_stem}"
                )
            render_cache[key] = Image.open(rendered_documents[path][page_number]).convert("RGB")
        return render_cache[key]

    if edition.mode in {"legacy-doc", "mixed-open"}:
        text = (
            pdftotext_layout(question_source)
            if edition.mode == "mixed-open"
            else legacy_doc_text(question_source)
        )
        blocks = split_numbered_blocks(text, edition.question_count)
    elif edition.mode == "socrative":
        blocks = split_numbered_blocks(
            "\n".join(pdf_pages(question_source, layout=False)), edition.question_count
        )
    else:
        blocks = {}
        question_pages = question_page_texts
        for page_text in question_pages:
            number = page_question_number(page_text)
            if number is not None and 1 <= number <= edition.question_count and number not in blocks:
                blocks[number] = page_text

        # A few PowerPoint exports overlap the question-number glyphs during
        # PDF creation (notably 2014 Q28). The surrounding slide order remains
        # strictly sequential, so recover only isolated missing markers.
        missing_markers = sorted(set(range(1, edition.question_count + 1)) - set(blocks))
        first_page = next(
            (index for index, page_text in enumerate(question_pages) if page_question_number(page_text) == 1),
            None,
        )
        if first_page is not None and len(missing_markers) <= 2:
            for number in missing_markers:
                expected_page = first_page + number - 1
                if expected_page < len(question_pages):
                    blocks[number] = question_pages[expected_page]

    if len(blocks) != edition.question_count:
        missing = sorted(set(range(1, edition.question_count + 1)) - set(blocks))
        raise ValueError(f"{edition.year}: parsed {len(blocks)} questions; missing {missing}")

    if edition.mode == "mixed-open":
        open_answers = parse_2002_answers(answer_source, edition.question_count)
        answer_key: dict[int, str] = {}
    elif edition.mode == "legacy-doc":
        answer_key = answer_key_from_legacy_text(answer_source)
        open_answers = {}
    elif edition.mode in {"slide-pdf"}:
        answer_key = (
            answer_key_from_legacy_text(answer_source)
            if answer_source.suffix.lower() == ".doc"
            else answer_key_from_colored_sheet(answer_source, edition.question_count)
        )
        open_answers = {}
    elif edition.mode == "colored-answer-slides":
        answer_key = {}
        open_answers = {}
    elif edition.mode == "survey-answer-slides":
        answer_key = {}
        open_answers = {}
    elif edition.mode == "socrative":
        answer_key = socrative_answer_key(question_source, answer_source)
        open_answers = {}
    else:
        raise ValueError(f"Unknown mode: {edition.mode}")

    source_page_mapping = (
        {} if question_source.suffix.lower() == ".doc" else page_map(question_source)
    )
    if edition.mode not in {"legacy-doc", "mixed-open", "socrative"} and 1 in source_page_mapping:
        first_page = source_page_mapping[1]
        for number in range(1, edition.question_count + 1):
            source_page_mapping.setdefault(number, first_page + number - 1)
    media_page_mapping = repeated_media_page_map(media_source)
    question_media_page_mapping = (
        {}
        if question_source.suffix.lower() == ".doc"
        else repeated_media_page_map(question_source)
    )
    block_positions = question_positions(question_source) if edition.mode in {"mixed-open", "socrative"} else {}
    survey_answer_pages = page_map(answer_source) if edition.mode == "survey-answer-slides" else {}

    for number in range(1, edition.question_count + 1):
        block = blocks[number]
        if edition.mode == "survey-answer-slides":
            answer_page = survey_answer_pages[number]
            answer_text = pdf_pages(answer_source)[answer_page]
            prompt, options, answer_letter = survey_page_data(answer_text)
        else:
            prompt, options = parse_options(block)
            answer_letter = answer_key.get(number)
        if edition.mode == "legacy-doc" and not options:
            prompt, options = parse_unlabelled_legacy_options(block)
        if edition.mode == "mixed-open" and 22 <= number <= 33:
            prompt, options = parse_numeric_options(block)
        if not options and edition.mode != "mixed-open":
            prompt = re.sub(r"(?:\b[ABCD]\b\s*){4}$", "", clean_prompt(block)).strip()
            options = ["A", "B", "C", "D"]
        if edition.mode == "colored-answer-slides":
            answer_page = page_map(answer_source)[number]
            answer_letter = colored_slide_answer(answer_source, answer_page, options)
        if edition.year == 2018 and number == 12:
            related_pages = question_media_page_mapping[number]
            prompt = clean_prompt(question_page_texts[related_pages[-1]])
        if edition.mode == "mixed-open" and len(options) == 4:
            answer_value = normalized_for_match(open_answers.get(number, ""))
            answer_tokens = set(answer_value.split())
            scores = [
                (
                    len(set(normalized_for_match(option).split()) & answer_tokens)
                    + int(normalized_for_match(option) in answer_value) * 10,
                    index,
                )
                for index, option in enumerate(options)
            ]
            _, answer_index = max(scores)
            answer_letter = chr(65 + answer_index)
        if len(options) not in {0, 4}:
            raise ValueError(f"{edition.year} Q{number}: expected zero or four options, found {len(options)}")
        if edition.mode != "mixed-open" and len(options) != 4:
            raise ValueError(f"{edition.year} Q{number}: multiple-choice options were not parsed")
        if len(options) == 4 and answer_letter not in {"A", "B", "C", "D"}:
            raise ValueError(f"{edition.year} Q{number}: no valid answer letter")

        if render_media:
            if edition.mode in {"mixed-open", "socrative"}:
                page_index, top, bottom = block_positions[number]
                page_image = cached_page(question_source, page_index + 1)
                scale = 120 / 72
                image = page_image.crop(
                    (
                        0,
                        max(0, int(top * scale)),
                        page_image.width,
                        min(page_image.height, int(bottom * scale)),
                    )
                )
                source_pages = [page_index + 1]
            elif edition.mode == "legacy-doc":
                pages = media_page_mapping[number]
                image = stack_images([cached_page(media_source, page + 1) for page in pages])
                source_pages = [page + 1 for page in pages]
            else:
                pages = question_media_page_mapping.get(number, [source_page_mapping[number]])
                image = stack_images([cached_page(question_source, page + 1) for page in pages])
                source_pages = [page + 1 for page in pages]
            media_path = save_webp(image, edition, number)
        else:
            media_path = PUBLIC_MEDIA / str(edition.year) / f"{edition.year}-q{number:02d}.webp"
            if edition.mode in {"mixed-open", "socrative"}:
                source_pages = [block_positions[number][0] + 1]
            elif edition.mode == "legacy-doc":
                source_pages = [page + 1 for page in media_page_mapping[number]]
            else:
                source_pages = [
                    page + 1
                    for page in question_media_page_mapping.get(number, [source_page_mapping[number]])
                ]

        records.append(
            make_record(
                edition,
                number,
                prompt,
                options,
                answer_letter,
                open_answers.get(number),
                media_path,
                source_pages,
            )
        )
    return records


def validate(records: list[dict]) -> None:
    ids = [record["Question ID"] for record in records]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate question IDs")
    for record in records:
        options = record["Options"]
        if options and (len(options) != 4 or len(set(options)) != 4):
            raise ValueError(f"Invalid options: {record['Question ID']}")
        if options and record["Answer"] not in options:
            raise ValueError(f"Answer is not an option: {record['Question ID']}")
        if not record["Question Name"]:
            raise ValueError(f"Missing prompt: {record['Question ID']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Validate output without rewriting it")
    parser.add_argument("--no-render", action="store_true", help="Reuse already-rendered media")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="mmt-import-") as directory:
        temp_dir = Path(directory)
        records = []
        for edition in EDITIONS:
            edition_records = import_edition(edition, temp_dir, not args.no_render and not args.check)
            records.extend(edition_records)
            print(f"{edition.year}: {len(edition_records)} questions")
    records.sort(
        key=lambda record: (
            record["iGeo Year"],
            tuple(record["Category/Tags"]),
            record["Location"],
            record["Question Number"],
        )
    )
    validate(records)
    if args.check:
        existing = json.loads(OUTPUT_JSON.read_text())
        if existing != records:
            raise SystemExit("Past iGeo MMT output is stale; run the importer")
        print(f"Validated {len(records)} normalized questions")
        return
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {len(records)} questions to {OUTPUT_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
