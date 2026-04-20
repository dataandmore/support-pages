#!/usr/bin/env python3
"""
Download and archive all HubSpot knowledge-base articles as self-contained
HTML files in public/hubspot-archive/.

Images are downloaded from hs-fs and stored in public/hubspot-archive/images/.

Run from the project root:
  python3 scripts/archive-hubspot.py
"""

import os, re, sys, time, urllib.request, urllib.parse, subprocess
from pathlib import Path

BASE_URL   = "https://support.dataandmore.com/en/knowledge"
ROOT       = Path(__file__).parent.parent
ARCHIVE    = ROOT / "public" / "hubspot-archive"
IMG_DIR    = ARCHIVE / "images"

ARCHIVE.mkdir(parents=True, exist_ok=True)
IMG_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; SupportPortalArchiver/1.0)"}

MINIMAL_CSS = """
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#333;margin:0;padding:28px 44px;background:#fff;max-width:880px}
h1{font-size:2rem;font-weight:700;margin-bottom:.25em;color:#1a1a2c}
h2{font-size:1.4rem;font-weight:600;margin-top:2em;color:#2a2a2c}
h3{font-size:1.15rem;font-weight:600;margin-top:1.5em}
h4{font-size:1rem;font-weight:600;margin-top:1.25em}
p{line-height:1.75;margin:.75em 0}
ul,ol{padding-left:1.5em;line-height:1.75}
li{margin:.25em 0}
img{max-width:100%;height:auto;border-radius:6px;margin:1.25em 0;display:block}
table{border-collapse:collapse;width:100%;margin:1em 0}
th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}
th{background:#f5f6f8;font-weight:600}
pre,code{background:#f5f6f8;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:.9em}
pre{padding:12px 16px;overflow-x:auto}
a{color:#EC6E1E}
blockquote{border-left:4px solid #EC6E1E;margin:1em 0;padding:.5em 1em;background:#fff8f4}
iframe{max-width:100%}
"""

def fetch_bytes(url, retries=3):
    req = urllib.request.Request(url, headers=HEADERS)
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read()
        except Exception as e:
            if i == retries - 1: raise
            time.sleep(2)

def fetch_text(url):
    return fetch_bytes(url).decode("utf-8", errors="replace")

def save_image(raw_src, slug):
    """Download image, save locally, return local relative path."""
    try:
        # Decode HTML entities (&amp; → &)
        src = raw_src.replace("&amp;", "&")
        if src.startswith("//"):   src = "https:" + src
        if src.startswith("data:"): return src          # already inline
        if not src.startswith("http"): return raw_src   # skip relative/unknown

        # Strip query params for the filename, keep the base name
        parsed = urllib.parse.urlparse(src)
        base   = os.path.basename(urllib.parse.unquote(parsed.path))
        if not base or "." not in base:
            base = "image.png"
        # prefix with article slug to avoid collisions
        local_name = f"{slug[:35]}_{base}"[:110]
        local_path = IMG_DIR / local_name

        if not local_path.exists():
            data = fetch_bytes(src)
            local_path.write_bytes(data)

        return f"images/{local_name}"
    except Exception as e:
        print(f"\n    ⚠  img skip ({raw_src[:60]}): {e}", end="")
        return raw_src  # keep original on failure

def rewrite_images(html, slug):
    """Replace every img src (and srcset) with locally downloaded copies."""
    def replace_src(m):
        local = save_image(m.group(1), slug)
        return f'src="{local}"'

    def replace_srcset(m):
        # srcset = "url1 w1, url2 w2, ..." — keep only the first (full-res) entry
        entries = [e.strip() for e in m.group(1).split(",") if e.strip()]
        if not entries:
            return 'srcset=""'
        first_url = entries[0].split()[0]
        local = save_image(first_url, slug)
        return f'srcset="{local}"'

    # Replace src="..." on img tags (src can appear anywhere in the tag)
    html = re.sub(r'(?<=<img\b)[^>]*?\bsrc="([^"]+)"',
                  lambda m: m.group(0)[:m.start(1)-m.start(0)-5] + 'src="' + save_image(m.group(1), slug) + '"',
                  html)
    # Simpler flat replacement: any standalone src="..." that looks like an image URL
    html = re.sub(r'\bsrc="(https?://[^"]+\.(?:png|jpg|jpeg|gif|webp|svg)[^"]*)"', replace_src, html)
    html = re.sub(r'\bsrcset="([^"]+)"', replace_srcset, html)
    return html

def extract_body(html, slug):
    """Extract <article class="knowledgebase-post"> and clean it."""
    start = html.find('<article class="knowledgebase-post">')
    if start == -1: start = html.find("<article")
    end   = html.rfind("</article>")
    if start == -1 or end == -1:
        return None

    body = html[start : end + len("</article>")]

    # Strip scripts and noisy HubSpot widgets
    body = re.sub(r"<script[^>]*>.*?</script>",  "", body, flags=re.DOTALL)
    body = re.sub(r"<noscript[^>]*>.*?</noscript>", "", body, flags=re.DOTALL)
    body = re.sub(r'<div[^>]+hs-feedback[^>]*>.*?</div>', "", body, flags=re.DOTALL)
    body = re.sub(r'<div[^>]+kb-feedback[^>]*>.*?</div>', "", body, flags=re.DOTALL)

    # Download & rewrite images
    body = rewrite_images(body, slug)

    # Open external links in new tab
    body = re.sub(r'href="(https?://[^"]+)"',
                  r'href="\1" target="_blank" rel="noopener"', body)

    return body

def archive_one(slug):
    url      = f"{BASE_URL}/{slug}"
    out_path = ARCHIVE / f"{slug}.html"

    try:
        html = fetch_text(url)
    except Exception as e:
        print(f"FAIL ({e})")
        return False

    body = extract_body(html, slug)
    if not body:
        print("SKIP (article element not found)")
        return False

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>HubSpot Archive — {slug}</title>
  <style>{MINIMAL_CSS}</style>
</head>
<body>
  <p style="font-size:11px;color:#aaa;margin-bottom:2em;padding-bottom:1em;border-bottom:1px solid #eee">
    Archived from <a href="{url}" target="_blank">{url}</a>
  </p>
  {body}
</body>
</html>"""

    out_path.write_text(page, encoding="utf-8")
    return True

def get_slugs():
    if len(sys.argv) > 1:
        return sys.argv[1:]
    r = subprocess.run(
        ["docker","exec","support-portal-db-1","psql","-U","support_user",
         "-d","support_portal","-t","-c",'SELECT slug FROM "Article" ORDER BY slug;'],
        capture_output=True, text=True)
    return [s.strip() for s in r.stdout.splitlines() if s.strip()]

def main():
    slugs = get_slugs()
    print(f"Archiving {len(slugs)} articles (force re-download)…\n")
    ok = fail = 0

    for i, slug in enumerate(slugs, 1):
        print(f"  [{i:>3}/{len(slugs)}] {slug} … ", end="", flush=True)
        # Always re-archive (so images get properly downloaded this time)
        if archive_one(slug):
            print("OK")
            ok += 1
        else:
            fail += 1
        time.sleep(0.25)

    print(f"\nDone: {ok} OK, {fail} failed.")
    img_count = len(list(IMG_DIR.iterdir()))
    print(f"Images saved: {img_count} files in {IMG_DIR}")

if __name__ == "__main__":
    main()
