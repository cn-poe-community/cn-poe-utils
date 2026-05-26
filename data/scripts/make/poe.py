import os
from typing import Any
from common import at, is_any_json, read_any_json, read_json, read_ndjson
from db import skill, pair, passive_skill, stat, unique


checked_non_ascii_en_list = {
    "Maelström Staff", "Doppelgänger Guise", "Mjölner"}


def check_non_ascii_en():
    """检查数据库中en字段的非ascii字符。

    游戏中存在非ascii字符的类型或传奇名称，POB中可能会将其转换为ascii字符，
    生成POB代码时需要这些信息。
    """
    non_ascii_list = set()

    targets = ["db/items", "db/passive_skills",
               unique.UNIQUES_PATH]

    for target in targets:
        # 如果target是一个文件，则直接读取；如果target是一个目录，则读取目录下的所有json文件
        if os.path.isfile(at(target)):
            if is_any_json(at(target)):
                data = read_any_json(at(target))
                for item in data:
                    en = item["en"]
                    if not en.isascii():
                        non_ascii_list.add(en)
        elif os.path.isdir(at(target)):
            for file_name in os.listdir(at(target)):
                source = at(target, file_name)
                if os.path.isfile(source) and is_any_json(source):
                    data = read_any_json(source)
                    for item in data:
                        en = item["en"]
                        if not en.isascii():
                            non_ascii_list.add(en)

    deprecated_list = checked_non_ascii_en_list - non_ascii_list
    new_list = non_ascii_list - checked_non_ascii_en_list

    if len(deprecated_list) != 0:
        print(f"warning: deprecated non-ascii en strings: {deprecated_list}")
    if len(new_list) != 0:
        print(f"warning: new non-ascii en strings: {new_list}")


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


def remain_fields(obj, fields: set[str], recursive=True) -> Any:
    """如果obj是一个字典，则删除不在fields中的键，并根据recursive参数决定是否递归处理值。
       如果obj是一个列表，则对每个元素调用remain_fields。
    """
    if type(obj) is dict:
        for key in list(obj.keys()):
            if key not in fields:
                del obj[key]
            else:
                if recursive:
                    remain_fields(obj[key], fields, recursive)
    elif type(obj) is list:
        for item in obj:
            remain_fields(item, fields, recursive)

    return obj


def get_attributes() -> list:
    data: list = read_json(at(pair.ATTRIBUTES_PATH))
    return remain_fields(data, {"zh", "en", "values"})


def get_properties() -> list:
    data = []
    data.extend(read_json(at(pair.PROPERTIES_PATH)))
    data.extend(read_json(at(pair.PROPERTIES2_PATH)))

    return remain_fields(data, {"zh", "en", "values"})


def get_requirements() -> list:
    data: list = read_json(at(pair.REQUIREMENTS_PATH))
    return remain_fields(data, {"zh", "en", "values"})


def get_requirements_suffixes() -> list:
    data: list = read_json(at(pair.REQUIREMENT_SUFFIXES_PATH))
    return remain_fields(data, {"zh", "en", "values"})


def get_strings() -> list:
    data: list = read_json(at(pair.STRINGS_PATH))
    return remain_fields(data, {"id", "zh", "en", "type"})


def get_items() -> dict[str, list]:
    uniques = read_ndjson(at(unique.UNIQUES_PATH))
    uniques_base_type_idx = {}
    for u in uniques:
        base_type = u["baseType"]
        if base_type not in uniques_base_type_idx:
            uniques_base_type_idx[base_type] = []
        uniques_base_type_idx[base_type].append(u)

    items = {}

    for file_name in os.listdir(at("db/items")):
        source = at("db/items", file_name)
        if os.path.isfile(source) and file_name.endswith(".json"):
            data = read_json(source)
            for item in data:
                base_type = item["en"]
                if base_type in uniques_base_type_idx:
                    item["uniques"] = uniques_base_type_idx[base_type]

            name = file_name[:file_name.rfind(".")]
            remain_fields(data, {"zh", "en", "uniques"})
            items[snake_to_camel(name)] = data

    return items


def get_skills() -> dict[str, list]:
    skills = {}

    skills["gemSkills"] = remain_fields(
        read_ndjson(at(skill.GEM_SKILLS_PATH)), {"zh", "en"})
    skills["transfiguredSkills"] = remain_fields(
        read_ndjson(at(skill.TRANSFIGURED_SKILLS_PATH)), {"zh", "en"})
    skills["hybridSkills"] = remain_fields(
        read_ndjson(at(skill.HYBRID_SKILLS_PATH)), {"zh", "en"})
    skills["indexableSupports"] = remain_fields(
        read_ndjson(at(skill.INDEXABLE_SUPPORTS_PATH)), {"zh", "en"})

    return skills


def get_passive_skills() -> dict[str, list]:
    skills = {}
    skills["anointed"] = remain_fields(
        read_ndjson(at(passive_skill.ANOINTED_PATH)), {"zh", "en"})
    skills["keystones"] = remain_fields(
        read_ndjson(at(passive_skill.KEYSTONES_PATH)), {"zh", "en"})
    skills["ascendant"] = remain_fields(
        read_ndjson(at(passive_skill.ASCENDANT_PATH)), {"zh", "en"})
    return skills


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


def get_stats() -> list:
    stats = []
    stats.extend(read_json(at(stat.DESC_STATS_PATH)))
    stats.extend(read_json(at(stat.TRADE_STATS_PATH)))

    stats = remove_repeats(stats)

    # 还需要保留refs字段以及refs中的参数索引，这里假设索引最大为5
    return remain_fields(stats, {"zh", "en", "refs", "0", "1", "2", "3", "4", "5"})


def get_all() -> dict[str, list]:
    check_non_ascii_en()

    all = {}
    all["attributes"] = get_attributes()
    all["properties"] = get_properties()
    all["requirements"] = get_requirements()
    all["requirementSuffixes"] = get_requirements_suffixes()
    all["strings"] = get_strings()

    for name, array in get_items().items():
        all[name] = array

    for name, array in get_skills().items():
        all[name] = array

    for name, array in get_passive_skills().items():
        all[name] = array

    all["stats"] = get_stats()

    return all
