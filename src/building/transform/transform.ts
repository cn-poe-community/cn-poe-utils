import * as itemTypes from "../../api/item.js";
import * as passiveSkillTypes from "../../api/passive_skill.js";
import { PathOfBuilding } from "../xml/PathOfBuilding.js";
import { Item } from "../xml/Item.js";
import { getSlotName } from "./slot.js";
import { Slot } from "../xml/Slot.js";
import { Skill } from "../xml/Skill.js";
import { MasteryEffect, Socket } from "../xml/Tree.js";
import {
    getAscendancyName,
    getCharacterName,
    getEnabledNodeIdsOfJewels,
    getNodeIdOfExpansionSlot,
    isPhreciaAscendancy,
} from "./tree.js";

export type TransformOptions = {
    skipWeapon2: boolean;
};

export class Transformer {
    private itemsData: itemTypes.GetItemsResult;
    private passiveSkillsData: passiveSkillTypes.GetPassiveSkillsResult;
    private building?: PathOfBuilding;
    private itemIdGenerator = 1;
    private options?: TransformOptions;

    constructor(
        itemsData: itemTypes.GetItemsResult,
        passiveSkillsData: passiveSkillTypes.GetPassiveSkillsResult,
        options?: TransformOptions,
    ) {
        this.itemsData = itemsData;
        this.passiveSkillsData = passiveSkillsData;
        this.options = options;
    }

    public transform(): void {
        const building = new PathOfBuilding();
        this.building = building;
        this.itemIdGenerator = 1;

        // 填充build
        const build = building.build;
        const character = this.itemsData.character;
        build.level = character.level;

        build.className = getCharacterName(this.passiveSkillsData.character);
        build.ascendClassName = getAscendancyName(
            this.passiveSkillsData.character,
            this.passiveSkillsData.ascendancy,
        );

        // 解析json
        this.parseItems();
        this.parseTree();
    }

    private parseItems() {
        const building = this.building!;

        const itemDataArray = this.getBuildingItemDataArray();
        for (const data of itemDataArray) {
            const item = new Item(this.itemIdGenerator++, data);
            const itemList = building.items.itemList;
            itemList.push(item);

            const slotSet = building.items.itemSet;
            const slotName = getSlotName(data);
            if (!slotName) {
                throw new Error(`${data.inventoryId} ${data.x} ${slotName}`);
            }
            const slot = Slot.NewEquipmentSlot(slotName, item.id);
            slotSet.append(slot);

            if (
                data.sockets &&
                data.sockets.length > 0 &&
                data.socketedItems &&
                data.socketedItems.length > 0
            ) {
                const sockets = data.sockets;
                const socketedItems = data.socketedItems;

                let group: itemTypes.Gem[] = [];
                let prevGroupNum = 0;
                const skills = building.skills.skillSet.skills;
                let abyssJewelCount = 0;

                for (let i = 0; i < socketedItems.length; i++) {
                    const si = socketedItems[i];
                    if ((si as itemTypes.AbyssalJewel).abyssJewel) {
                        abyssJewelCount++;
                        const item = new Item(this.itemIdGenerator++, si);
                        itemList.push(item);
                        const siSlotName = `${slotName} Abyssal Socket ${abyssJewelCount}`;
                        const slot = Slot.NewEquipmentSlot(siSlotName, item.id);
                        slotSet.append(slot);
                    } else {
                        const gem = si as itemTypes.Gem & itemTypes.Socketed;
                        const groupNum = sockets![gem.socket].group;

                        if (i > 0) {
                            if (groupNum !== prevGroupNum) {
                                skills.push(new Skill(slotName, group));
                                group = [];
                            }
                        }

                        group.push(gem);
                        prevGroupNum = groupNum;
                    }
                }
                if (group.length > 0) {
                    skills.push(new Skill(slotName, group));
                }
            }
        }
    }

    // Return all building item json data
    getBuildingItemDataArray(): itemTypes.Item[] {
        const itemsJson = this.itemsData.items;
        const list: itemTypes.Item[] = [];
        list.push(
            ...itemsJson.filter((item) => {
                switch (item.inventoryId) {
                    case "Weapon2":
                    case "Offhand2":
                        if (this.options?.skipWeapon2) {
                            return false;
                        }
                        break;
                    case "MainInventory": // 位于主背包的物品
                    case "ExpandedMainInventory": // 位于扩展背包的物品
                        return false;
                }

                if (item.baseType === "THIEFS_TRINKET") {
                    return false;
                }
                return true;
            }),
        );
        return list;
    }

    private parseTree() {
        const building = this.building!;
        const character = this.itemsData.character;

        const spec = building.tree.spec;
        const itemList = building.items.itemList;
        for (const itemData of this.passiveSkillsData.items) {
            const item = new Item(this.itemIdGenerator++, itemData);
            itemList.push(item);

            const socket = new Socket(
                getNodeIdOfExpansionSlot(itemData.x!),
                item.id,
            );
            spec.sockets.append(socket);
        }

        spec.classId = this.passiveSkillsData.character;
        spec.ascendClassId = this.passiveSkillsData.ascendancy;

        spec.secondaryAscendClassId =
            this.passiveSkillsData.alternate_ascendancy;

        if (isPhreciaAscendancy(character.class)) {
            spec.treeVersion = "3_28_alternate";
        } else {
            spec.treeVersion = "3_28";
        }

        if (Array.isArray(this.passiveSkillsData.mastery_effects)) {
            //空数组
        } else {
            for (const [node, effect] of Object.entries<number>(
                this.passiveSkillsData.mastery_effects,
            )) {
                spec.masteryEffects.push(
                    new MasteryEffect(Number(node), effect),
                );
            }
        }

        spec.nodes = this.passiveSkillsData.hashes;

        spec.nodes.push(...getEnabledNodeIdsOfJewels(this.passiveSkillsData));

        spec.overrides.parse(this.passiveSkillsData.skill_overrides);
    }

    public getBuilding(): PathOfBuilding {
        return this.building!;
    }
}
