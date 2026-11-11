"""Inline style.css + calc.js + app.js into a single self-contained HTML file."""
import argparse
import pathlib

root = pathlib.Path(__file__).parent
parser = argparse.ArgumentParser()
parser.add_argument("--out", default="stoich-calc.html", help="output file name inside the app directory")
parser.add_argument("--keep-manifest", action="store_true", help="keep the PWA manifest link (for web deployment)")
args = parser.parse_args()

html = (root / "template.html").read_text(encoding="utf-8")
css = (root / "style.css").read_text(encoding="utf-8")
calc = (root / "calc.js").read_text(encoding="utf-8")
app = (root / "app.js").read_text(encoding="utf-8")

if not args.keep_manifest:
    html = html.replace('<link rel="manifest" href="manifest.json">', "")
    html = html.replace('<link rel="manifest" href="manifest.webmanifest">', "")
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>")
html = html.replace(
    '<script src="calc.js"></script><script src="app.js"></script>',
    "<script>\n" + calc + "\n</script>\n<script>\n" + app + "\n</script>",
)
if "style.css" in html or "calc.js" in html:
    raise SystemExit("inline failed: external reference left")
out = root / args.out
out.write_text(html, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size} bytes)")