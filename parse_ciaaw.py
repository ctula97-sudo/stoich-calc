"""Parse the CIAAW Standard Atomic Weights table (saved HTML) into JSON.

Usage: python3 parse_ciaaw.py ciaaw_raw.html > ciaaw_weights.json
Output: {symbol: value} using the conventional single value; interval elements
store the lower bound and are flagged. Values keep full digits from the page.
"""
import html
import json
import re
import sys

src = open(sys.argv[1], encoding="utf-8").read()
rows = re.findall(r"<tr[^>]*>(.*?)</tr>", src, re.S)
out = {}
intervals = {}
for row in rows:
    cells = [html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)]
    if len(cells) < 4:
        continue
    z, sym, name, weight = cells[0], cells[1], cells[2], cells[3]
    if not z.isdigit() or not re.fullmatch(r"[A-Z][a-z]?", sym):
        continue
    w = weight.replace("\u2009", "").replace("\u00a0", "").replace(" ", "")
    interval = re.fullmatch(r"\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]", w)
    if interval:
        intervals[sym] = [float(interval.group(1)), float(interval.group(2))]
        out[sym] = float(interval.group(1))
        continue
    num = re.match(r"([0-9]+\.[0-9]+|[0-9]+)", w.replace(" ", ""))
    if num:
        out[sym] = float(num.group(1))

json.dump({"source": "CIAAW Standard Atomic Weights 2024", "values": out, "interval_elements": intervals},
          sys.stdout, ensure_ascii=False, indent=1, sort_keys=True)
print(file=sys.stderr)
print(f"parsed {len(out)} elements, {len(intervals)} intervals", file=sys.stderr)