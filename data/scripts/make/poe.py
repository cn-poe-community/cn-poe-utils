import json
import os

from common import at, must_parent, read_any_json, read_json, read_ndjson
from db import skill, pair, passive_skill, stat, unique

POE_DATA_PATH = "../src/data/poe/data.ts"

checked_non_ascii_types = {"Maelström Staff"}
checked_non_ascii_names = {"Doppelgänger Guise", "Mjölner"}


def check_non_ascii_names():
    non_ascii_types = set()
    non_ascii_names = set()

    for file_name in os.listdir(at("db/items")):
        source = at("db/items", file_name)
        if os.path.isfile(source) and file_name.endswith(".json"):
            data = read_json(source)
            for item in data:
                basetype = item["en"]
                if not basetype.isascii():
                    non_ascii_types.add(basetype)
                if "uniques" in item:
                    for u in item["uniques"]:
                        name = u["en"]
                        if not name.isascii():
                            non_ascii_names.add(name)

    deprecated_types = checked_non_ascii_types-non_ascii_types
    deprecated_names = checked_non_ascii_names-non_ascii_names
    new_types = non_ascii_types-checked_non_ascii_types
    new_names = non_ascii_names-checked_non_ascii_names

    if len(deprecated_types) != 0:
        print(f"warning: deprecated non-ascii basetypes: {deprecated_types}")
    if len(deprecated_names) != 0:
        print(f"warning: deprecated non-ascii uniques: {deprecated_names}")
    if len(new_types) != 0:
        print(f"warning: new non-ascii basetypes: {new_types}")
    if len(new_names) != 0:
        print(f"warning: new non-ascii uniques: {new_names}")


def snake_to_camel(name: str):
    result = ''
    capitalize_next = False
    for char in name:
        if char == '_':
            capitalize_next = True
        else:
            if capitalize_next:
                result += char.upper()
                capitalize_next = False
            else:
                result += char
    return result


def remain_fields(obj: dict, fields: set[str]):
    keys = list(obj.keys())
    for key in keys:
        if key not in fields:
            del obj[key]
        else:
            val = obj[key]
            if type(val) is dict:
                remain_fields(val, fields)
            elif type(val) is list:
                for item in val:
                    if type(item) is dict:
                        remain_fields(item, fields)


def json_to_js(data, remained_fields: set | None, name: str) -> str:
    """
    将JSON文件转换为JavaScript代码。

    :param data: 数据
    :param remained_fields: 保留的字段，如果传入None或空set，表示保留所有字段
    :param name: 变量名
    """
    if remained_fields is not None and len(remained_fields) > 0:
        for item in data:
            remain_fields(item, remained_fields)
    return f"export const {name} = {json.dumps(data, ensure_ascii=False, indent=2)};"


def jsons_to_js(files: list[str], remained_fields: set, variable_name) -> str:
    """
    将多个数组JSON文件转换为JavaScript代码。

    :param data: 数据路径列表
    :param remained_fields: 保留的字段，如果传入None或空set，表示保留所有字段
    :param name: 变量名
    """
    data = []
    for file in files:
        data.extend(read_any_json(file))
    return json_to_js(data, remained_fields, variable_name)


def make_attributes():
    return jsons_to_js([at("db/attributes.json")], {"zh", "en", "values"}, "attributes")


def make_properties():
    return jsons_to_js([at("db/properties.json"), at("db/properties2.json")], {"zh", "en", "values"}, "properties")


def make_requirements():
    codes = []
    codes.append(jsons_to_js(
        [at(pair.REQUIREMENTS_PATH)], {"zh", "en", "values"}, "requirements"))
    codes.append(jsons_to_js(
        [at(pair.REQUIREMENT_SUFFIXES_PATH)], {"zh", "en", "values"}, "requirementSuffixes"))
    return "\n".join(codes)


def make_strings():
    return jsons_to_js([at("db/strings.json")], {"id", "zh", "en", "type"}, "strings")


def make_items():
    uniques = read_ndjson(at(unique.UNIQUES_PATH))
    uniques_base_type_idx = {}
    for u in uniques:
        base_type = u["baseType"]
        if base_type not in uniques_base_type_idx:
            uniques_base_type_idx[base_type] = []
        uniques_base_type_idx[base_type].append(u)

    codes = []
    for file_name in os.listdir(at("db/items")):
        source = at("db/items", file_name)
        if os.path.isfile(source) and file_name.endswith(".json"):
            data = read_json(source)
            for item in data:
                base_type = item["en"]
                if base_type in uniques_base_type_idx:
                    item["uniques"] = uniques_base_type_idx[base_type]
            name = file_name[:-5]
            code = json_to_js(
                data, {"zh", "en", "uniques"}, snake_to_camel(name))
            codes.append(code)
    return "\n".join(codes)


def make_skills():
    codes = []
    codes.append(jsons_to_js(
        [at(skill.GEM_SKILLS_PATH)], {"zh", "en"}, "gemSkills"))
    codes.append(jsons_to_js(
        [at(skill.TRANSFIGURED_SKILLS_PATH)], {"zh", "en"}, "transfiguredSkills"))
    codes.append(jsons_to_js(
        [at(skill.HYBRID_SKILLS_PATH)], {"zh", "en"}, "hybridSkills"))
    codes.append(jsons_to_js(
        [at(skill.INDEXABLE_SUPPORT_PATH)], {"zh", "en"}, "indexableSupports"))
    return "\n".join(codes)


def make_passive_skills():
    codes = []
    codes.append(jsons_to_js(
        [at(passive_skill.ANOINTED_PATH)], {"zh", "en"}, "anointed"))
    codes.append(jsons_to_js(
        [at(passive_skill.KEYSTONES_PATH)], {"zh", "en"}, "keystones"))
    codes.append(jsons_to_js(
        [at(passive_skill.ASCENDANT_PATH)], {"zh", "en"}, "ascendant"))
    return "\n".join(codes)


def remove_repeats(stats):
    stat_list = []
    stat_map = {}
    for stat in stats:
        zh = stat["zh"]
        en = stat["en"]
        if zh in stat_map:
            old_en = stat_map[zh]["en"]
            if en.casefold() != old_en.casefold():
                print("warning: same zh but diff en")
                print(f"{zh}")
                print(f"{old_en}")  # old
                print(f"{en}")  # old
            continue
        stat_list.append(stat)
        stat_map[zh] = stat
    return stat_list


def make_stats():
    stats = []
    stats.extend(read_json(at(stat.DESC_STATS_PATH)))
    stats.extend(read_json(at(stat.TRADE_STATS_PATH)))

    stats = remove_repeats(stats)

    # 还需要保留refs字段以及refs中的参数索引，这里假设索引最大为5
    return json_to_js(stats, {"zh", "en", "refs", "0", "1", "2", "3", "4", "5"}, "stats")


def make():
    print("info: making...")
    codes = [
        make_attributes(),
        make_properties(),
        make_requirements(),
        make_strings(),
        make_items(),
        make_skills(),
        make_passive_skills(),
        make_stats(),
    ]

    must_parent(at(POE_DATA_PATH))
    print(f"saved {at(POE_DATA_PATH)}")
    with open(at(POE_DATA_PATH), 'wt', encoding="utf-8", newline="\n") as f:
        f.write("\n".join(codes))
