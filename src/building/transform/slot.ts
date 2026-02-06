import * as ItemTypes from "../../api/item.js";
import { DATA as POB_DATA } from "../../data/pob/index.js";

/**
 * 物品信息在POB中的插槽名称。
 */
export function getSlotName(itemData: ItemTypes.Item): string | undefined {
    const inventoryId = itemData.inventoryId;

    if (inventoryId) {
        if (inventoryId === "Flask") {
            return `Flask ${itemData.x! + 1}`;
        }

        return POB_DATA.slotMap[inventoryId];
    }

    return;
}
