"""Extract only public URL metadata from WXR; never publish the original export."""
import csv
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
NS = {"wp": "http://wordpress.org/export/1.2/"}
# These two rewritten articles were checked against their WordPress body text.
OVERRIDES = {
    "4395": "content/posts/2026/10/初めての献血400ml/index.md",
    "4402": "content/posts/2026/10/roadtrip-north-island-wellington-museum/index.md",
}

def main():
    source = Path(sys.argv[1])
    raw = source.read_bytes()
    if b"<!DOCTYPE" in raw or b"<!ENTITY" in raw:
        raise ValueError("DTD/entity declarations are not accepted")
    listing = subprocess.check_output(["hugo", "list", "published"], cwd=ROOT).decode("utf-8")
    pages = list(csv.DictReader(io.StringIO(listing)))
    records = []
    for item in ET.fromstring(raw).findall("./channel/item"):
        kind = item.findtext("wp:post_type", namespaces=NS)
        if kind not in ("post", "page") or item.findtext("wp:status", namespaces=NS) != "publish":
            continue
        post_id = item.findtext("wp:post_id", namespaces=NS)
        title = item.findtext("title")
        candidates = [p for p in pages if p["title"] == title and p["section"] == ("posts" if kind == "post" else "pages")]
        method = "exact-title"
        if post_id in OVERRIDES:
            candidates = [p for p in pages if p["path"] == OVERRIDES[post_id]]
            method = "reviewed-content"
        if len(candidates) != 1:
            raise ValueError(f"Expected one target for WordPress {post_id}: {title}")
        records.append({"id": post_id, "type": kind, "title": title,
                        "oldUrl": item.findtext("link"), "contentFile": candidates[0]["path"],
                        "match": method})
    if len({r["contentFile"] for r in records}) != len(records):
        raise ValueError("Multiple WordPress articles resolve to the same Hugo page")
    output = {"source": source.name, "sha256": hashlib.sha256(raw).hexdigest(),
              "records": sorted(records, key=lambda r: int(r["id"]))}
    (ROOT / "migration/wordpress-urls.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Matched {len(records)} public WordPress posts/pages")

if __name__ == "__main__":
    main()
