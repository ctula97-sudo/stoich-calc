"""Bump the service-worker cache version so installed PWAs pick up a new deploy."""
import datetime
import pathlib
import re

sw = pathlib.Path(__file__).parent / "sw.js"
text = sw.read_text(encoding="utf-8")
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
new, count = re.subn(r"const CACHE = 'stoich-v[^']*';", f"const CACHE = 'stoich-v{stamp}';", text)
if count != 1:
    raise SystemExit(f"cache version marker not found (matches={count})")
sw.write_text(new, encoding="utf-8")
print(f"sw cache version -> stoich-v{stamp}")