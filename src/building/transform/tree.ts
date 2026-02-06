import * as itemTypes from "../../api/item.js";
import * as passiveSkillTypes from "../../api/passive_skill.js";
import { DATA as POB_DATA } from "../../data/pob/index.js";
import * as pobDataTypes from "../../data/pob/types.js";

export function getNodeIdOfExpansionSlot(seqNum: number): number {
    return POB_DATA.tree.jewelSlots[seqNum];
}

export function getCharacterName(num: number): string {
    return POB_DATA.tree.classes[num].name;
}

export function getAscendancyName(
    characterNum: number,
    ascendancyNum: number,
): string {
    if (ascendancyNum === 0) {
        return "";
    }

    return POB_DATA.tree.classes[characterNum].ascendancies[ascendancyNum - 1]
        .name;
}

const phreciaAscendancySet = new Set(
    Object.values(POB_DATA.phreciaAscendancyMap),
);

export function isPhreciaAscendancy(name: string): boolean {
    return phreciaAscendancySet.has(name);
}

/**
 * 返回所有星团上点亮的node的nodeId。
 *
 * POE的API数据并未给星团珠宝上的节点分配全局的nodeId，而是使用一套区别于nodeId的id体系，其中`hashes_ex`
 * 记录了被点亮的节点。
 *
 * POB在支持星团珠宝时沿用nodeId体系，给星团珠宝上的节点分配了全局的nodeId，因此我们需要解析API数据，计算
 * 得到被点亮节点的nodeId。
 *
 * 这里采用如下定义：
 * slot为天赋树上的原生插槽，socket为星团珠宝提供的扩展插槽，但在少量情况下这两者会混用。
 */
export function getEnabledNodeIdsOfJewels(
    passiveSkills: passiveSkillTypes.GetPassiveSkillsResult,
): number[] {
    const hashEx = passiveSkills.hashes_ex;
    const jewelData = passiveSkills.jewel_data;
    const items = passiveSkills.items;

    // 获取所有jewel，并按照从大到小进行排序
    const jewelList = getSortedClusterJewels(jewelData, items);

    const hashExSet = new Set<number>(hashEx);

    // 使用proxy作为key，关联所在socket的ExpansionJewel
    // id是socket所在星团的POB内部实现细节，供子星团使用
    const socketExpansionJewels = new Map<
        number,
        { id: number; ej: pobDataTypes.ExpansionJewel }
    >();

    const allEnabledNodeIds: number[] = [];
    // 由于API给的数据无法判断传奇小型星团珠宝的keystone是否点亮（如果使用POB原生导入，keystone是未点亮的）
    // 这里我们将其标记为可能点亮的，当我们每点亮一个节点，就从hashExSet移除关联的索引键
    // 最后我们根据hashExSet的剩余大小，来点亮相同数目的keystone，这不一定准确，但适用于99%的情况
    const allProbableNodeIds: number[] = [];

    for (const jewel of jewelList) {
        const seqNum = jewel.seqNum;
        const size = jewel.size;

        let id: number | undefined = undefined;
        let expansionJewel: pobDataTypes.ExpansionJewel | undefined = undefined;

        // 中小型星团
        if (
            size === ClusterJewelSize.MEDIUM ||
            size === ClusterJewelSize.SMALL
        ) {
            const proxy =
                jewel.data.subgraph.groups[`expansion_${seqNum}`].proxy;
            const idAndEj = socketExpansionJewels.get(Number(proxy));
            //且是（位于socket上）子星团
            if (idAndEj !== undefined) {
                id = idAndEj.id;
                expansionJewel = idAndEj.ej;
            }
        }

        // 大型星团（必然位于slot上）或位于slot上的中小型星团
        if (id === undefined) {
            const slotNodeId = getNodeIdOfExpansionSlot(seqNum);
            expansionJewel = POB_DATA.tree.nodes[slotNodeId].expansionJewel;
        }

        const { enabledNodeIds, probableNodeIds } = getEnabledNodeIdsOfJewel(
            hashExSet,
            jewel,
            expansionJewel!,
            id,
            socketExpansionJewels,
        );

        allEnabledNodeIds.push(...enabledNodeIds);
        allProbableNodeIds.push(...probableNodeIds);
    }

    const n = Math.min(hashExSet.size, allProbableNodeIds.length);
    if (n > 0) {
        allEnabledNodeIds.push(...allProbableNodeIds.slice(0, n));
    }

    return allEnabledNodeIds;
}

/**
 * 获取所有星团珠宝，并按照大小逆序排序。
 */
function getSortedClusterJewels(
    jewelData: passiveSkillTypes.JewelData,
    items: itemTypes.Item[],
): {
    seqNum: number;
    item: itemTypes.Item;
    data: passiveSkillTypes.ClusterJewelDatum;
    size: ClusterJewelSize;
}[] {
    const itemIdx = new Map<number, itemTypes.Item>();
    for (const item of items) {
        itemIdx.set(item.x!, item);
    }

    const jewelList: {
        seqNum: number;
        item: itemTypes.Item;
        data: passiveSkillTypes.ClusterJewelDatum;
        size: ClusterJewelSize;
    }[] = [];
    for (const [i, data] of Object.entries<passiveSkillTypes.JewelDatum>(
        jewelData,
    )) {
        const seqNum = Number(i);
        const size = clusterJewelSize(data.type);
        if (size !== undefined) {
            jewelList.push({
                seqNum,
                item: itemIdx.get(seqNum)!,
                data: data as passiveSkillTypes.ClusterJewelDatum,
                size,
            });
        }
    }

    jewelList.sort((a, b) => {
        const sizeA = a.size;
        const sizeB = b.size;
        // 字符串的自然序"LARGE"<"MEDIUM"<"SMALL"，与实际顺序相反
        // 这里我们需要逆序，也就是使用自然序
        return sizeA === sizeB ? 0 : sizeA > sizeB ? 1 : -1;
    });
    return jewelList;
}

interface ClusterJewelNode {
    id: number; // nodeId
    oIdx: number; // 局部序号，指使用0~11标记单个星团中的节点
}

// 返回单个星团上点亮的node的nodeId
// socketEjs用于返回填充数据，供子星团使用
function getEnabledNodeIdsOfJewel(
    hashExSet: Set<number>,
    jewel: {
        seqNum: number;
        item: itemTypes.Item;
        data: passiveSkillTypes.ClusterJewelDatum;
        size: ClusterJewelSize;
    },
    expansionJewel: pobDataTypes.ExpansionJewel,
    id: number | undefined,
    socketEjs: Map<number, { id: number; ej: pobDataTypes.ExpansionJewel }>,
): { enabledNodeIds: number[]; probableNodeIds: number[] } {
    const enabledNodeIds: number[] = [];
    const probableNodeIds: number[] = [];

    const jSize = jewel.size;
    const jMeta = POB_DATA.clusterJewels.jewels[jSize];

    // 算法移植自PassiveSpec.lua文件的BuildSubgraph()方法
    if (id == undefined) {
        id = 0x10000;
    }
    if (expansionJewel.size == 2) {
        id = id + (expansionJewel.index << 6);
    } else if (expansionJewel.size == 1) {
        id = id + (expansionJewel.index << 9);
    }
    const nodeIdGenerator = id + (jMeta.sizeIndex << 4);

    // 原始的id，最终需要转换为nodeId
    const notableIds: number[] = [];
    const socketIds: number[] = [];
    const smallIds: number[] = [];

    const group = jewel.data.subgraph.groups[`expansion_${jewel.seqNum}`];
    const originalNodeIds: number[] = group.nodes.map((n) => Number(n));
    const jewelNodes = jewel.data.subgraph.nodes;

    // unique small cluster jewel
    if (
        originalNodeIds.length === 0 &&
        Object.keys(jewelNodes).length === 0 &&
        jewel.item.rarity === "Unique"
    ) {
        probableNodeIds.push(nodeIdGenerator);
        return { enabledNodeIds, probableNodeIds };
    }

    for (const i of originalNodeIds) {
        const node = jewelNodes[i];
        const originalId = Number(i);
        if (node.isNotable) {
            notableIds.push(originalId);
        } else if (node.isJewelSocket) {
            socketIds.push(originalId);
            socketEjs.set(Number(node.expansionJewel!.proxy), {
                id,
                ej: node.expansionJewel!,
            });
        } else if (node.isMastery) {
            //DO NOTHING
        } else {
            smallIds.push(originalId);
        }
    }

    const nodeCount = notableIds.length + socketIds.length + smallIds.length;

    const pobJewelNodes: ClusterJewelNode[] = [];
    // 使用0~11索引星团中的节点
    const indicies = new Map<number, ClusterJewelNode>();

    if (jSize === ClusterJewelSize.LARGE && socketIds.length === 1) {
        const socket = jewelNodes[socketIds[0]];
        const pobNode = {
            id: Number(socket.skill),
            oIdx: 6,
        };
        pobJewelNodes.push(pobNode);
        indicies.set(pobNode.oIdx, pobNode);
    } else {
        for (let i = 0; i < socketIds.length; i++) {
            const socket = jewelNodes[socketIds[i]];
            const pobNode = {
                id: Number(socket.skill),
                oIdx: jMeta.socketIndicies[i],
            };
            pobJewelNodes.push(pobNode);
            indicies.set(pobNode.oIdx, pobNode);
        }
    }

    const notableIndicies = [];
    for (let n of jMeta.notableIndicies) {
        if (notableIndicies.length === notableIds.length) {
            break;
        }

        if (jSize === ClusterJewelSize.MEDIUM) {
            if (socketIds.length === 0 && notableIds.length === 2) {
                if (n === 6) {
                    n = 4;
                } else if (n === 10) {
                    n = 8;
                }
            } else if (nodeCount === 4) {
                if (n === 10) {
                    n = 9;
                } else if (n === 2) {
                    n = 3;
                }
            }
        }
        if (!indicies.has(n)) {
            notableIndicies.push(n);
        }
    }
    notableIndicies.sort((a, b) => a - b);

    for (let i = 0; i < notableIndicies.length; i++) {
        const idx = notableIndicies[i];
        const pobNode = {
            id: nodeIdGenerator + idx,
            oIdx: idx,
        };
        pobJewelNodes.push(pobNode);
        indicies.set(idx, pobNode);
    }

    const smallIndicies = [];
    for (let n of jMeta.smallIndicies) {
        if (smallIndicies.length === smallIds.length) {
            break;
        }

        if (jSize === ClusterJewelSize.MEDIUM) {
            if (nodeCount === 5 && n === 4) {
                n = 3;
            } else if (nodeCount == 4) {
                if (n === 8) {
                    n = 9;
                } else if (n === 4) {
                    n = 3;
                }
            }
        }
        if (!indicies.has(n)) {
            smallIndicies.push(n);
        }
    }

    for (let i = 0; i < smallIndicies.length; i++) {
        const idx = smallIndicies[i];
        const pobNode = {
            id: nodeIdGenerator + idx,
            oIdx: idx,
        };
        pobJewelNodes.push(pobNode);
        indicies.set(idx, pobNode);
    }

    const proxyNode = POB_DATA.tree.nodes[Number(expansionJewel.proxy)];
    const proxyNodeSkillsPerOrbit =
        POB_DATA.tree.constants.skillsPerOrbit[proxyNode.orbit];
    for (const node of pobJewelNodes) {
        const proxyNodeOidxRelativeToClusterIndicies = translateOidx(
            proxyNode.orbitIndex,
            proxyNodeSkillsPerOrbit,
            jMeta.totalIndicies,
        );
        const correctedNodeOidxRelativeToClusterIndicies =
            (node.oIdx + proxyNodeOidxRelativeToClusterIndicies) %
            jMeta.totalIndicies;
        const correctedNodeOidxRelativeToTreeSkillsPerOrbit = translateOidx(
            correctedNodeOidxRelativeToClusterIndicies,
            jMeta.totalIndicies,
            proxyNodeSkillsPerOrbit,
        );
        node.oIdx = correctedNodeOidxRelativeToTreeSkillsPerOrbit;
        indicies.set(node.oIdx, node);
    }

    for (const i of originalNodeIds) {
        const node = jewelNodes[i];
        const originalId = Number(i);
        if (hashExSet.has(originalId)) {
            const pobNode = indicies.get(node.orbitIndex);
            if (pobNode != undefined) {
                enabledNodeIds.push(pobNode.id);
            }
            hashExSet.delete(originalId);
        }
    }

    return { enabledNodeIds, probableNodeIds };
}

enum ClusterJewelSize {
    LARGE = "Large Cluster Jewel",
    MEDIUM = "Medium Cluster Jewel",
    SMALL = "Small Cluster Jewel",
}

function clusterJewelSize(type: string): ClusterJewelSize | undefined {
    if (type === "JewelPassiveTreeExpansionLarge") {
        return ClusterJewelSize.LARGE;
    } else if (type === "JewelPassiveTreeExpansionMedium") {
        return ClusterJewelSize.MEDIUM;
    } else if (type === "JewelPassiveTreeExpansionSmall") {
        return ClusterJewelSize.SMALL;
    }
    return undefined;
}

function translateOidx(
    srcOidx: number,
    srcNodesPerOrbit: number,
    destNodesPerOrbit: number,
): number {
    if (srcNodesPerOrbit === destNodesPerOrbit) {
        return srcOidx;
    } else if (srcNodesPerOrbit === 12 && destNodesPerOrbit === 16) {
        return [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15][srcOidx];
    } else if (srcNodesPerOrbit === 16 && destNodesPerOrbit === 12) {
        return [0, 1, 1, 2, 3, 4, 4, 5, 6, 7, 7, 8, 9, 10, 10, 11][srcOidx];
    } else {
        return Math.floor((srcOidx * destNodesPerOrbit) / srcNodesPerOrbit);
    }
}
