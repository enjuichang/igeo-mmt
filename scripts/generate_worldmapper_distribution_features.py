#!/usr/bin/env python3
"""Create compact visual-distribution signatures for Worldmapper cartograms."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_ROOT / "data/worldmapper/maps.json"
OUTPUT_PATH = PROJECT_ROOT / "data/worldmapper/distribution-features.json"
HUE_BIN_COUNT = 12
GRID_COLUMNS = 6
GRID_ROWS = 3
FEATURE_VERSION = 1


def rgb_to_hsv(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    delta = maximum - minimum
    saturation = np.divide(delta, maximum, out=np.zeros_like(delta), where=maximum > 0)
    hue = np.zeros_like(maximum)

    nonzero = delta > 1e-6
    red = nonzero & (maximum == rgb[:, :, 0])
    green = nonzero & (maximum == rgb[:, :, 1])
    blue = nonzero & (maximum == rgb[:, :, 2])
    hue[red] = ((rgb[:, :, 1][red] - rgb[:, :, 2][red]) / delta[red]) % 6
    hue[green] = (rgb[:, :, 2][green] - rgb[:, :, 0][green]) / delta[green] + 2
    hue[blue] = (rgb[:, :, 0][blue] - rgb[:, :, 1][blue]) / delta[blue] + 4
    hue /= 6
    return hue, saturation, maximum


def distribution_signature(image_path: Path) -> list[float]:
    image = Image.open(image_path).convert("RGB").resize((132, 66), Image.Resampling.LANCZOS)
    rgb = np.asarray(image, dtype=np.float32) / 255
    hue, saturation, value = rgb_to_hsv(rgb)

    # The map background and country borders have little saturation. Weighting
    # saturated pixels therefore approximates the area occupied by each fixed
    # Worldmapper regional colour without depending on labels or linework.
    mask = (saturation >= 0.20) & (value >= 0.18)
    weights = np.where(mask, saturation**2, 0)
    total_weight = float(weights.sum())
    if total_weight > 0:
        hue_histogram, _ = np.histogram(
            hue[mask],
            bins=np.linspace(0, 1, HUE_BIN_COUNT + 1),
            weights=weights[mask],
        )
        hue_histogram = hue_histogram.astype(np.float32)
        hue_histogram /= max(float(hue_histogram.sum()), 1e-9)
    else:
        # Gridded-population maps for very small areas may contain only dark
        # linework over a pale background. Retain their spatial footprint even
        # though they do not carry the standard saturated regional palette.
        darkness = np.clip(1 - value, 0, 1)
        weights = np.where(value < 0.78, darkness**2, 0)
        total_weight = float(weights.sum())
        if total_weight <= 0:
            raise ValueError(f"No map foreground detected in {image_path}")
        hue_histogram = np.zeros(HUE_BIN_COUNT, dtype=np.float32)

    grid = []
    height, width = weights.shape
    for row in range(GRID_ROWS):
        top = round(row * height / GRID_ROWS)
        bottom = round((row + 1) * height / GRID_ROWS)
        for column in range(GRID_COLUMNS):
            left = round(column * width / GRID_COLUMNS)
            right = round((column + 1) * width / GRID_COLUMNS)
            grid.append(float(weights[top:bottom, left:right].sum()) / total_weight)

    # Regional colour area is more diagnostic than small boundary shifts.
    vector = np.concatenate((hue_histogram * 2, np.asarray(grid, dtype=np.float32)))
    norm = float(np.linalg.norm(vector))
    if norm <= 0:
        raise ValueError(f"Invalid distribution signature for {image_path}")
    return [round(float(value / norm), 6) for value in vector]


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    items = manifest.get("items")
    if not isinstance(items, list) or len(items) != manifest.get("item_count"):
        raise ValueError("Worldmapper manifest item count is inconsistent")

    output_items = []
    for item in items:
        image_path = PROJECT_ROOT / "data/worldmapper" / item["local_file"]
        if not image_path.is_file():
            raise FileNotFoundError(image_path)
        output_items.append(
            {
                "index": item["index"],
                "local_file": item["local_file"],
                "vector": distribution_signature(image_path),
            }
        )

    payload = {
        "feature_version": FEATURE_VERSION,
        "item_count": len(output_items),
        "dimensions": HUE_BIN_COUNT + GRID_COLUMNS * GRID_ROWS,
        "items": output_items,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    print(
        json.dumps(
            {
                "output": str(OUTPUT_PATH.relative_to(PROJECT_ROOT)),
                "items": len(output_items),
                "dimensions": payload["dimensions"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
