"""Download USDA SR Legacy and FNDDS JSON dumps into data-raw/.

Source: https://fdc.nal.usda.gov/download-datasets/
Licence: CC0 1.0. These files are computer-side inputs for import-official-catalog.py.
"""
from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data-raw"
USER_AGENT = "ShihengCatalogImport/1.0 (personal offline diet tracker)"

FILES = {
    "usda-sr-legacy.zip": "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip",
    "usda-fndds.zip": "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_json_2024-10-31.zip",
}


def fetch(name: str, url: str) -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    dest = RAW / name
    if dest.exists() and dest.stat().st_size > 1_000_000:
        print(f"skip {name} ({dest.stat().st_size} bytes)")
        return
    print(f"GET {url}")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=180) as response:
        dest.write_bytes(response.read())
    print(f"wrote {dest} ({dest.stat().st_size} bytes)")


def main() -> int:
    for name, url in FILES.items():
        try:
            fetch(name, url)
        except Exception as error:
            print(f"failed {name}: {error}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
