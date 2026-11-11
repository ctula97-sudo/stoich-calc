"""Rebuild the atomic-weight table inside calc.js from CIAAW data.

Usage:
  python3 build_weights.py --check   # compare current calc.js table with CIAAW, no write
  python3 build_weights.py --write   # rewrite the table in calc.js

Interval elements use the IUPAC *conventional* atomic weight (single value a lab
uses), not the lower bound of the interval.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
CIAW = ROOT / "ciaaw_weights.json"
CALC = ROOT / "calc.js"

# IUPAC conventional atomic weights for the 14 interval elements
CONVENTIONAL = {
    "H": "1.008", "Li": "6.94", "B": "10.81", "C": "12.011", "N": "14.007",
    "O": "15.999", "Mg": "24.305", "Si": "28.085", "S": "32.06", "Cl": "35.45",
    "Ar": "39.95", "Br": "79.904", "Tl": "204.38", "Pb": "207.2",
}

data = json.loads(CIAW.read_text(encoding="utf-8"))
values = data["values"]
intervals = data["interval_elements"]

table = {}
for sym, val in values.items():
    if sym in CONVENTIONAL:
        table[sym] = CONVENTIONAL[sym]
    else:
        table[sym] = repr(val).rstrip("0").rstrip(".") if "." in repr(val) else repr(val)

# order by atomic number as in the CIAAW page
order = [s for s in values.keys()]

src = CALC.read_text(encoding="utf-8")
m = re.search(r"  var weights = \{(.*?)\n  \};", src, re.S)
if not m:
    sys.exit("weights block not found in calc.js")
old = dict(re.findall(r"([A-Z][a-z]?): ([0-9.]+)", m.group(1)))

diffs = []
for sym in sorted(set(old) | set(table), key=lambda s: order.index(s) if s in order else 999):
    o, n = old.get(sym), table.get(sym)
    if o is None:
        diffs.append(f"ADDED   {sym}: {n}")
    elif n is None:
        diffs.append(f"DROPPED {sym}: {o}")
    elif float(o) != float(n):
        diffs.append(f"CHANGED {sym}: {o} -> {n}")

if "--check" in sys.argv:
    print(f"current {len(old)} elements, CIAAW {len(table)} elements")
    print("\n".join(diffs) if diffs else "no differences")
    raise SystemExit(0)

lines, current = [], []
for sym in order:
    current.append(f"{sym}: {table[sym]}")
    if len(current) == 6:
        lines.append("    " + ", ".join(current) + ",")
        current = []
if current:
    lines.append("    " + ", ".join(current) + ",")
block = "  var weights = {\n" + "\n".join(lines).rstrip(",") + "\n  };"
src = src[: m.start()] + block + src[m.end():]
CALC.write_text(src, encoding="utf-8")
print(f"wrote {len(table)} elements to calc.js")
print("\n".join(diffs))