def check_duplicate_zhs(array: list[dict], logger: str, raise_error=False, checked: set[str] = set()):
    """检查重复的中文"""
    zh2en = {}
    for item in array:
        if item["zh"] == "":
            continue
        zh = item["zh"]
        en = item["en"]
        if zh in zh2en and zh2en[zh] != en and zh not in checked:
            if raise_error:
                raise Exception(f"{logger}: 发现重复的中文，但英文不同")
            else:
                print(
                    f"warning: [{logger}] 发现重复的中文，但英文不同: {zh}, {zh2en[zh]}, {en}")
        else:
            zh2en[zh] = en


def remove_duplicate(array: list[dict]) -> list[dict]:
    """移除重复的键值对，保留第一个出现的项"""
    seen = set()
    unique_array = []
    for item in array:
        zh = item["zh"]
        en = item["en"]
        zh_en = f"{zh}|{en}"
        if zh_en not in seen:
            seen.add(zh_en)
            unique_array.append(item)
    return unique_array
