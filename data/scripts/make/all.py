import json
from typing import Any

from common import at, must_parent
from make import pob, poe


POB_DATA_PATH = "../src/data/pob/data.json"
POE_DATA_PATH = "../src/data/poe/data.json"


def pob_make(all: dict[str, Any]):
    must_parent(at(POB_DATA_PATH))
    print(f"saved {at(POB_DATA_PATH)}")
    with open(at(POB_DATA_PATH), 'wt', encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(all, ensure_ascii=False, indent=2))


def poe_make(all: dict[str, list]):
    must_parent(at(POE_DATA_PATH))
    print(f"saved {at(POE_DATA_PATH)}")
    with open(at(POE_DATA_PATH), 'wt', encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(all, ensure_ascii=False, indent=2))


def make():
    print("info: making...")
    pob_all = pob.get_all()
    poe_all = poe.get_all()

    pob_make(pob_all)
    poe_make(poe_all)
