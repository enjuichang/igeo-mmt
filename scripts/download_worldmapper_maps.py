#!/usr/bin/env python3
"""Crawl Worldmapper's paginated map index and download every card image.

The crawler intentionally follows the "Next page" anchor found inside the
``pagination grey-bg p-20`` container. Every ``results`` div becomes one
manifest record and uses the image URL from that card's ``img`` tag.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import os
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urljoin, urlparse
from urllib.request import Request, urlopen


DEFAULT_START_URL = "https://worldmapper.org/maps/"
USER_AGENT = (
    "Mozilla/5.0 (compatible; WorldmapperMapArchiver/1.0; "
    "+https://worldmapper.org/maps/)"
)
MANIFEST_FIELDS = (
    "index",
    "name",
    "source_page",
    "map_page_url",
    "listing_image_url",
    "image_url",
    "image_source",
    "local_file",
    "categories",
    "status",
    "bytes",
    "sha256",
    "error",
)


class WorldmapperListingParser(HTMLParser):
    """Extract result cards and the next-page URL from one listing page."""

    def __init__(self, page_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.items: list[dict[str, Any]] = []
        self.next_page_url: str | None = None

        self._result_depth = 0
        self._result: dict[str, Any] | None = None
        self._capture_heading = False
        self._heading_parts: list[str] = []
        self._capture_category = False
        self._category_parts: list[str] = []

        self._pagination_depth = 0
        self._pagination_anchor_href: str | None = None
        self._pagination_anchor_parts: list[str] = []

    @staticmethod
    def _attrs(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {key: value or "" for key, value in attrs}

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = self._attrs(attrs)
        classes = set(values.get("class", "").split())

        if tag == "div":
            if self._result_depth:
                self._result_depth += 1
            elif "results" in classes:
                self._result_depth = 1
                self._result = {
                    "name": "",
                    "source_page": self.page_url,
                    "map_page_url": "",
                    "image_url": "",
                    "categories": [],
                }

            if self._pagination_depth:
                self._pagination_depth += 1
            elif {"pagination", "grey-bg", "p-20"}.issubset(classes):
                self._pagination_depth = 1

        if self._result_depth and self._result is not None:
            if tag == "a" and not self._result["map_page_url"]:
                self._result["map_page_url"] = urljoin(
                    self.page_url, values.get("href", "")
                )
            elif tag == "img" and not self._result["image_url"]:
                self._result["image_url"] = urljoin(
                    self.page_url, values.get("src", "")
                )
            elif tag == "h2":
                self._capture_heading = True
                self._heading_parts = []
            elif tag == "small":
                self._capture_category = True
                self._category_parts = []

        if tag == "a" and self._pagination_depth:
            self._pagination_anchor_href = values.get("href", "")
            self._pagination_anchor_parts = []

    def handle_data(self, data: str) -> None:
        if self._capture_heading:
            self._heading_parts.append(data)
        if self._capture_category:
            self._category_parts.append(data)
        if self._pagination_anchor_href is not None:
            self._pagination_anchor_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "h2" and self._capture_heading:
            if self._result is not None:
                self._result["name"] = clean_text("".join(self._heading_parts))
            self._capture_heading = False

        if tag == "small" and self._capture_category:
            category = clean_text("".join(self._category_parts))
            if category and self._result is not None:
                self._result["categories"].append(category)
            self._capture_category = False

        if tag == "a" and self._pagination_anchor_href is not None:
            anchor_text = clean_text("".join(self._pagination_anchor_parts)).lower()
            if "next page" in anchor_text:
                self.next_page_url = urljoin(
                    self.page_url, self._pagination_anchor_href
                )
            self._pagination_anchor_href = None
            self._pagination_anchor_parts = []

        if tag == "div":
            if self._result_depth:
                self._result_depth -= 1
                if self._result_depth == 0 and self._result is not None:
                    self.items.append(self._result)
                self._result = None
            if self._pagination_depth:
                self._pagination_depth -= 1


class WorldmapperDetailParser(HTMLParser):
    """Find the primary map image on a map detail page."""

    def __init__(self, page_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.image_url: str | None = None

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag != "img" or self.image_url:
            return
        values = {key: value or "" for key, value in attrs}
        if "wp-post-image" in values.get("class", "").split():
            self.image_url = urljoin(self.page_url, values.get("src", ""))


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def request_bytes(url: str, timeout: float, attempts: int = 4) -> tuple[bytes, str]:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT})
            with urlopen(request, timeout=timeout) as response:
                content_type = response.headers.get_content_type()
                return response.read(), content_type
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            last_error = error
            if attempt < attempts:
                time.sleep(min(2 ** (attempt - 1), 8))
    raise RuntimeError(f"Failed after {attempts} attempts: {url}: {last_error}")


def fetch_listing(url: str, timeout: float) -> WorldmapperListingParser:
    payload, _ = request_bytes(url, timeout)
    parser = WorldmapperListingParser(url)
    parser.feed(payload.decode("utf-8", errors="replace"))
    parser.close()
    return parser


def fetch_detail_image_url(url: str, timeout: float) -> str:
    payload, _ = request_bytes(url, timeout)
    parser = WorldmapperDetailParser(url)
    parser.feed(payload.decode("utf-8", errors="replace"))
    parser.close()
    if not parser.image_url:
        raise RuntimeError(f"No primary map image found on detail page {url}")
    return parser.image_url


def crawl_listings(
    start_url: str, timeout: float, delay: float, max_pages: int | None
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    visited: set[str] = set()
    page_url: str | None = start_url
    page_number = 0

    while page_url:
        if page_url in visited:
            raise RuntimeError(f"Pagination loop detected at {page_url}")
        if max_pages is not None and page_number >= max_pages:
            break

        visited.add(page_url)
        page_number += 1
        parsed = fetch_listing(page_url, timeout)
        for empty_attempt in range(1, 4):
            if parsed.items:
                break
            if empty_attempt < 3:
                time.sleep(empty_attempt * 2)
                parsed = fetch_listing(page_url, timeout)
        if not parsed.items:
            raise RuntimeError(f"No .results items found on {page_url}")

        items.extend(parsed.items)
        print(
            f"Crawled page {page_number}: {len(parsed.items)} items "
            f"({len(items)} total)",
            flush=True,
        )
        page_url = parsed.next_page_url
        if page_url and delay:
            time.sleep(delay)

    return items


def safe_stem(name: str) -> str:
    normalized = unicodedata.normalize("NFKC", name).casefold()
    normalized = re.sub(r"[^\w.-]+", "-", normalized, flags=re.UNICODE)
    normalized = re.sub(r"[-_.]{2,}", "-", normalized).strip("-_.")
    return normalized or "untitled-map"


def image_extension(image_url: str) -> str:
    suffix = Path(unquote(urlparse(image_url).path)).suffix.lower()
    if re.fullmatch(r"\.[a-z0-9]{1,5}", suffix):
        return suffix
    return ".img"


def prepare_items(items: list[dict[str, Any]], output_dir: Path) -> None:
    seen_names: dict[str, int] = {}
    for index, item in enumerate(items, start=1):
        if not item["name"]:
            item["name"] = f"Untitled map {index}"
        if not item["image_url"]:
            raise RuntimeError(
                f"Missing img.src for result {index} on {item['source_page']}"
            )

        base_stem = safe_stem(item["name"])
        seen_names[base_stem] = seen_names.get(base_stem, 0) + 1
        duplicate_suffix = (
            f"-{seen_names[base_stem]}" if seen_names[base_stem] > 1 else ""
        )
        filename = (
            f"{index:04d}-{base_stem}{duplicate_suffix}"
            f"{image_extension(item['image_url'])}"
        )
        item.update(
            {
                "index": index,
                "local_file": str(Path("images") / filename),
                "listing_image_url": item["image_url"],
                "image_source": "listing",
                "status": "pending",
                "bytes": None,
                "sha256": "",
                "error": "",
            }
        )


def download_image(
    item: dict[str, Any], output_dir: Path, timeout: float, overwrite: bool
) -> dict[str, Any]:
    destination = output_dir / item["local_file"]
    destination.parent.mkdir(parents=True, exist_ok=True)

    if destination.exists() and destination.stat().st_size > 0 and not overwrite:
        payload = destination.read_bytes()
        return {
            "status": "existing",
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
            "error": "",
        }

    actual_image_url = item["image_url"]
    image_source = "listing"
    try:
        payload, content_type = request_bytes(actual_image_url, timeout)
    except RuntimeError as listing_error:
        if not item["map_page_url"]:
            raise listing_error
        actual_image_url = fetch_detail_image_url(item["map_page_url"], timeout)
        payload, content_type = request_bytes(actual_image_url, timeout)
        image_source = "detail-page-fallback"
    if not content_type.startswith("image/"):
        raise RuntimeError(
            f"Expected an image, received Content-Type {content_type!r}"
        )

    temporary = destination.with_name(destination.name + ".part")
    temporary.write_bytes(payload)
    os.replace(temporary, destination)
    return {
        "status": "downloaded",
        "image_url": actual_image_url,
        "image_source": image_source,
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "error": "",
    }


def write_manifests(output_dir: Path, items: list[dict[str, Any]]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    downloaded = sum(item["status"] in {"downloaded", "existing"} for item in items)
    failed = sum(item["status"] == "failed" for item in items)
    manifest = {
        "source": DEFAULT_START_URL,
        "generated_at": generated_at,
        "item_count": len(items),
        "available_image_count": downloaded,
        "failed_image_count": failed,
        "items": items,
    }

    json_path = output_dir / "maps.json"
    json_temporary = output_dir / "maps.json.part"
    json_temporary.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(json_temporary, json_path)

    csv_path = output_dir / "maps.csv"
    csv_temporary = output_dir / "maps.csv.part"
    with csv_temporary.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=MANIFEST_FIELDS)
        writer.writeheader()
        for item in items:
            row = {field: item.get(field, "") for field in MANIFEST_FIELDS}
            row["categories"] = " | ".join(item.get("categories", []))
            writer.writerow(row)
    os.replace(csv_temporary, csv_path)


def download_all(
    items: list[dict[str, Any]],
    output_dir: Path,
    timeout: float,
    workers: int,
    overwrite: bool,
) -> None:
    completed = 0
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(download_image, item, output_dir, timeout, overwrite): item
            for item in items
        }
        for future in as_completed(futures):
            item = futures[future]
            try:
                item.update(future.result())
            except Exception as error:  # Keep crawling even if one asset is broken.
                item.update(status="failed", error=str(error))
            completed += 1
            if completed % 25 == 0 or completed == len(items):
                write_manifests(output_dir, items)
                failed = sum(entry["status"] == "failed" for entry in items)
                print(
                    f"Processed {completed}/{len(items)} images ({failed} failed)",
                    flush=True,
                )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-url", default=DEFAULT_START_URL)
    parser.add_argument(
        "--output-dir", type=Path, default=Path("data/worldmapper")
    )
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--timeout", type=float, default=45.0)
    parser.add_argument(
        "--delay",
        type=float,
        default=0.15,
        help="Delay in seconds between listing-page requests",
    )
    parser.add_argument("--max-pages", type=int)
    parser.add_argument("--metadata-only", action="store_true")
    parser.add_argument(
        "--resume-manifest",
        action="store_true",
        help="Skip recrawling and resume from OUTPUT_DIR/maps.json",
    )
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.workers < 1:
        raise SystemExit("--workers must be at least 1")
    if args.max_pages is not None and args.max_pages < 1:
        raise SystemExit("--max-pages must be at least 1")

    output_dir = args.output_dir.resolve()
    if args.resume_manifest:
        manifest_path = output_dir / "maps.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        items = manifest["items"]
        for item in items:
            item.setdefault("listing_image_url", item["image_url"])
            item.setdefault("image_source", "listing")
        print(f"Loaded {len(items)} records from {manifest_path}", flush=True)
    else:
        items = crawl_listings(
            args.start_url, args.timeout, args.delay, args.max_pages
        )
        prepare_items(items, output_dir)
    write_manifests(output_dir, items)

    if not args.metadata_only:
        download_all(items, output_dir, args.timeout, args.workers, args.overwrite)

    failed = sum(item["status"] == "failed" for item in items)
    available = sum(
        item["status"] in {"downloaded", "existing"} for item in items
    )
    print(
        f"Finished: {len(items)} records, {available} images available, "
        f"{failed} failed. Output: {output_dir}",
        flush=True,
    )
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        raise SystemExit(130)
