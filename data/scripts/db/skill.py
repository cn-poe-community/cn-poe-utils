import duckdb
from common import CLIENT_GLOBAL, CLIENT_TENCENT, LANG_CHS, LANG_EN, SERVER_GLOBAL, at, save_ndjson
from db import pair
from db.utils import check_duplicate_zhs, remove_duplicate
from export import game, trade

GEM_SKILLS_PATH = "db/skills/gem_skills.ndjson"
HYBRID_SKILLS_PATH = "db/skills/hybrid_skills.ndjson"
TRANSFIGURED_SKILLS_PATH = "db/skills/transfigured_skills.ndjson"
INDEXABLE_SUPPORT_PATH = "db/skills/indexable_supports.ndjson"


def select_gem_skills():
    table1 = (CLIENT_TENCENT, LANG_CHS, "SkillGems")
    table2 = (CLIENT_TENCENT, LANG_CHS, "BaseItemTypes")
    table3 = (CLIENT_GLOBAL, LANG_EN, "BaseItemTypes")

    game.load_table(*table1)
    game.load_table(*table2)
    game.load_table(*table3)

    duck_name1 = game.duck_table_name(*table1)
    duck_name2 = game.duck_table_name(*table2)
    duck_name3 = game.duck_table_name(*table3)

    game.create_index(duck_name2, "_index")
    game.create_index(duck_name2, "Id")
    game.create_index(duck_name3, "Id")

    rows = duckdb.sql(f"""SELECT {duck_name2}.Name, {duck_name3}.Name FROM {duck_name1}
            INNER JOIN {duck_name2} ON {duck_name1}.BaseItemTypesKey = {duck_name2}._index
            INNER JOIN {duck_name3} ON {duck_name2}.Id = {duck_name3}.Id
        """).fetchall()

    array = [{"zh": r[0], "en": r[1]} for r in rows]

    # 存在同名的数据
    return remove_duplicate(array)


def select_transfigured_skills(gem_skill_en_set: set):
    table1 = (CLIENT_TENCENT, LANG_CHS, "SkillGems")
    table2 = (CLIENT_TENCENT, LANG_CHS, "GemEffects")
    table3 = (CLIENT_GLOBAL, LANG_EN, "GemEffects")

    game.load_table(*table1)
    game.load_table(*table2)
    game.load_table(*table3)

    duck_name1 = game.duck_table_name(*table1)
    duck_name2 = game.duck_table_name(*table2)
    duck_name3 = game.duck_table_name(*table3)

    game.create_index(duck_name2, "_index")
    game.create_index(duck_name2, "Id")
    game.create_index(duck_name3, "Id")

    def select_gem_effect(index: int) -> tuple | None:
        return duckdb.sql(f"""SELECT {duck_name2}.Name, {duck_name3}.Name FROM {duck_name2}
            INNER JOIN {duck_name3} ON {duck_name2}.Id = {duck_name3}.Id
            WHERE {duck_name2}._index = {index}
        """).fetchone()

    array = []

    rows = duckdb.sql(
        f"""SELECT {duck_name1}.GemEffects FROM {duck_name1}""").fetchall()
    for row in rows:
        effect_indices = row[0]
        for index in effect_indices:
            record = select_gem_effect(index)
            if not record:
                continue
            zh = record[0]
            en = record[1]
            if zh.isascii() or en in gem_skill_en_set or "DNT" in en:
                continue

            array.append({"zh": zh, "en": en})

    return remove_duplicate(array)


def select_hybrid_support():
    table1 = (CLIENT_TENCENT, LANG_CHS, "SkillGems")
    table2 = (CLIENT_TENCENT, LANG_CHS, "GemEffects")
    table3 = (CLIENT_GLOBAL, LANG_EN, "GemEffects")

    game.load_table(*table1)
    game.load_table(*table2)
    game.load_table(*table3)

    duck_name1 = game.duck_table_name(*table1)
    duck_name2 = game.duck_table_name(*table2)
    duck_name3 = game.duck_table_name(*table3)

    game.create_index(duck_name2, "_index")

    def select_gem_effect(index: int) -> tuple | None:
        return duckdb.sql(f"""SELECT {duck_name2}.SupportName, {duck_name3}.SupportName FROM {duck_name2}
            INNER JOIN {duck_name3} ON {duck_name2}.Id = {duck_name3}.Id
            WHERE {duck_name2}._index = {index}
        """).fetchone()

    array = []

    rows = duckdb.sql(
        f"""SELECT {duck_name1}.GemEffects FROM {duck_name1}""").fetchall()
    for row in rows:
        effect_indices = row[0]
        for index in effect_indices:
            record = select_gem_effect(index)
            if not record:
                continue
            zh = record[0]
            en = record[1]
            if zh.isascii():
                continue

            array.append({"zh": zh, "en": en})

    return remove_duplicate(array)


def select_hybrid_effects(gem_skill_en_set: set, transfigured_skill_en_set: set):
    table1 = (CLIENT_TENCENT, LANG_CHS, "SkillGems")
    table2 = (CLIENT_TENCENT, LANG_CHS, "GemEffects")
    table3 = (CLIENT_TENCENT, LANG_CHS, "GrantedEffects")
    table4 = (CLIENT_TENCENT, LANG_CHS, "ActiveSkills")
    table5 = (CLIENT_GLOBAL, LANG_EN, "ActiveSkills")

    game.load_table(*table1)
    game.load_table(*table2)
    game.load_table(*table3)
    game.load_table(*table4)
    game.load_table(*table5)

    duck_name1 = game.duck_table_name(*table1)
    duck_name2 = game.duck_table_name(*table2)
    duck_name3 = game.duck_table_name(*table3)
    duck_name4 = game.duck_table_name(*table4)
    duck_name5 = game.duck_table_name(*table5)

    def select_gem_effect(index: int) -> tuple | None:
        return duckdb.sql(f"""SELECT {duck_name2}.GrantedEffect2 FROM {duck_name2}
            WHERE {duck_name2}._index = {index}
        """).fetchone()

    def select_granted_effect(index: int) -> tuple | None:
        return duckdb.sql(f"""SELECT {duck_name4}.DisplayedName, {duck_name5}.DisplayedName FROM {duck_name3}
            INNER JOIN {duck_name4} ON {duck_name3}.ActiveSkill = {duck_name4}._index
            INNER JOIN {duck_name5} ON {duck_name3}.ActiveSkill = {duck_name5}._index
            WHERE {duck_name3}._index = {index}
        """).fetchone()

    array = []

    rows = duckdb.sql(
        f"""SELECT {duck_name1}.GemEffects FROM {duck_name1}""").fetchall()
    for row in rows:
        effect_indices = row[0]
        for index in effect_indices:
            record = select_gem_effect(index)
            if not record or not record[0]:
                continue
            effect = select_granted_effect(record[0])
            if not effect:
                continue
            zh = effect[0]
            en = effect[1]
            if zh.isascii() or en in gem_skill_en_set or en in transfigured_skill_en_set:
                continue
            array.append({"zh": zh, "en": en})

    return remove_duplicate(array)


def select_indexable_supports():
    supports = pair.select_pairs(
        "IndexableSupportGems,Index,Name")

    return [{"zh": support["zh"], "en": support["en"]} for support in supports]


def create_skills():
    tradable_gems = trade.tradable_gems(SERVER_GLOBAL)
    tradable_gems_en_set = {name for name in tradable_gems}

    gem_skills = select_gem_skills()
    gem_skills = [g for g in gem_skills if g["en"] in tradable_gems_en_set]
    gem_skill_en_set = {g["en"] for g in gem_skills}

    transfigured_skills = select_transfigured_skills(gem_skill_en_set)
    transfigured_skill_en_set = {g["en"] for g in transfigured_skills}
    transfigured_skills = [s for s in transfigured_skills if s["en"] in tradable_gems_en_set]

    hybrid_supports = select_hybrid_support()
    hybrid_effects = select_hybrid_effects(
        gem_skill_en_set, transfigured_skill_en_set)

    hybrid_supports.extend(hybrid_effects)

    indexable_supports = select_indexable_supports()

    skills = []
    skills.extend(gem_skills)
    skills.extend(transfigured_skills)
    skills.extend(hybrid_supports)
    check_duplicate_zhs(skills, 'db/skills')

    print(f"info: 创建 {GEM_SKILLS_PATH}...")
    save_ndjson(at(GEM_SKILLS_PATH), gem_skills)
    print(f"info: 创建 {TRANSFIGURED_SKILLS_PATH}...")
    save_ndjson(at(TRANSFIGURED_SKILLS_PATH), transfigured_skills)
    print(f"info: 创建 {HYBRID_SKILLS_PATH}...")
    save_ndjson(at(HYBRID_SKILLS_PATH), hybrid_supports)
    print(f"info: 创建 {INDEXABLE_SUPPORT_PATH}...")
    save_ndjson(at(INDEXABLE_SUPPORT_PATH), indexable_supports)
