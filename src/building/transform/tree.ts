import * as itemTypes from "../../api/item.js";
import * as passiveSkillTypes from "../../api/passive_skill.js";
import { DATA as POB_DATA } from "../../data/pob/index.js";
import type { Group, Node } from "../../data/pob/types.js";

/**
 * 根据id获取珠宝插槽对应的nodeId。
 *
 * @param id 插槽在数组中的索引
 */
export function getNodeIdOfJewelSlot(id: number): number {
    return POB_DATA.tree.jewelSlots[id];
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
 * 返回所有星团珠宝上点亮的节点的`nodeId`。
 *
 * API数据并未给星团珠宝上的节点分配`nodeId`，而是使用`exId`(extended id)，点亮的节点的`exId`记录
 * 在`hashes_ex`中。星团珠宝上的插槽是个特例，既有`nodeId`，也有`exId`。
 *
 * POB给星团珠宝上的没有`nodeId`的节点分配了nodeId，我们需要根据POB的内部算法将`exId`转
 * 换为`nodeId`。
 *
 * 我们称天赋树与星团珠宝提供的插槽均为“slot”或“socket”，特别的，我们称天赋树提供的插槽为`原生插槽`，
 * 称星团珠宝提供的插槽为`扩展插槽`。
 */
export function getEnabledNodeIdsOfClusterJewels(
    passiveSkills: passiveSkillTypes.GetPassiveSkillsResult,
): number[] {
    const hashEx = passiveSkills.hashes_ex;
    const jewelData = passiveSkills.jewel_data;
    const items = passiveSkills.items;

    const jewelList = getOrderedClusterJewels(jewelData, items);

    const hashExSet = new Set<number>(hashEx);

    // 使用proxy关联插槽信息
    // proxy是一个唯一数字，关联了扩展插槽与插入的子星团
    // 插槽信息是POB内部实现，POB在实例化子星团珠宝时，需要父星团传递这部分信息
    //
    //  POB在实例化星团珠宝时，采用深度优先，使用递归形式
    //  当前采用广度优先遍历所有星团珠宝，使用循环形式，使用一个表来维护父星团上的插槽信息
    const socketInfoMap = new Map<number, SocketInfo>();

    const allEnabledNodeIds: number[] = [];
    // API数据未给星团的keystone节点分配`exId`，因此我们无法直接判断keystone节点是否被点亮。
    // 这里我们将其标记为可能点亮的，当我们每点亮一个节点，就从hashExSet移除关联的。
    // 最后我们根据hashExSet的剩余大小，来点亮相同数目的keystone，这不一定准确，但适用于大多数的情况。
    const allProbableNodeIds: number[] = [];

    for (const jewel of jewelList) {
        const slotId = jewel.slotId;
        const size = jewel.size;

        let id: number | undefined = undefined;
        let upSize: number | undefined = undefined;

        // 只有中小型星团才可能是子星团
        if (
            size === ClusterJewelSize.MEDIUM ||
            size === ClusterJewelSize.SMALL
        ) {
            const proxy = Number(
                jewel.data.subgraph.groups[`expansion_${slotId}`].proxy,
            );
            const socketInfo = socketInfoMap.get(proxy);
            id = socketInfo?.id;
            upSize = socketInfo?.upSize;
        }

        const { enabledNodeIds, probableNodeIds } =
            getEnabledNodeIdsOfClusterJewel(
                hashExSet,
                jewel,
                id,
                upSize,
                socketInfoMap,
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

interface ClusterJewelInfo {
    slotId: number;
    item: itemTypes.Item;
    data: passiveSkillTypes.ClusterJewelDatum;
    size: ClusterJewelSize;
}

enum JewelType {
    LargeClusterJewel = "JewelPassiveTreeExpansionLarge",
    MediumClusterJewel = "JewelPassiveTreeExpansionMedium",
    SmallClusterJewel = "JewelPassiveTreeExpansionSmall",
    // 省略了非星团珠宝的类型：基础珠宝、深渊珠宝、三项珠宝、永恒珠宝
}

function isClusterJewel(type: string): type is JewelType {
    return (
        type === JewelType.LargeClusterJewel ||
        type === JewelType.MediumClusterJewel ||
        type === JewelType.SmallClusterJewel
    );
}

enum ClusterJewelSize {
    LARGE = "Large Cluster Jewel",
    MEDIUM = "Medium Cluster Jewel",
    SMALL = "Small Cluster Jewel",
}

const CLUSTER_JEWEL_SIZE_MAP = {
    [JewelType.LargeClusterJewel]: ClusterJewelSize.LARGE,
    [JewelType.MediumClusterJewel]: ClusterJewelSize.MEDIUM,
    [JewelType.SmallClusterJewel]: ClusterJewelSize.SMALL,
};

/**
 * 获取所有星团珠宝，并按照大小降序排序。
 */
function getOrderedClusterJewels(
    jewelData: passiveSkillTypes.JewelData,
    items: itemTypes.Item[],
): ClusterJewelInfo[] {
    const itemSlotIdIdx = new Map<number, itemTypes.Item>();
    for (const item of items) {
        if (item.x === undefined) {
            console.error("jewel item missing slot id(x field)", item);
            continue;
        }
        itemSlotIdIdx.set(item.x, item);
    }

    const jewelList: ClusterJewelInfo[] = [];
    for (const [i, data] of Object.entries<passiveSkillTypes.JewelDatum>(
        jewelData,
    )) {
        if (!isClusterJewel(data.type)) {
            continue;
        }
        const size = CLUSTER_JEWEL_SIZE_MAP[data.type]!;

        const slotId = Number(i);
        const item = itemSlotIdIdx.get(slotId);
        if (!item) {
            console.error("cluster jewel item not found for slotId", slotId);
            continue;
        }

        jewelList.push({
            slotId,
            item,
            data: data as passiveSkillTypes.ClusterJewelDatum,
            size,
        });
    }

    jewelList.sort((a, b) => {
        const sizeA = a.size;
        const sizeB = b.size;
        // 字符串的自然序"LARGE"<"MEDIUM"<"SMALL"，与实际顺序相反
        // 这里我们需要逆序，所以使用自然序
        return sizeA === sizeB ? 0 : sizeA > sizeB ? 1 : -1;
    });
    return jewelList;
}

interface ClusterJewelNode {
    id: number; // nodeId
    oIdx: number; // 局部序号，使用0~11标记单个星团中的节点
}

/**
 * POB在递归构建子星团时，父星团向子星团传递的数据
 */
interface SocketInfo {
    id: number;
    upSize: number;
}

/**
 * 返回单个星团上点亮的节点的nodeId。算法移植自PassiveSpec.lua文件的BuildSubgraph()方法。
 *
 * @param hashExSet 点亮的节点的`exId`集合，每当`exId`转换为`nodeId`，就从集合中移除该`exId`。
 * 最后集合中剩余的`exId`数量将用于点亮相同数量的可能点亮的节点。
 * @param jewelInfo 星团信息。
 * @param id POB内部实现，原生插槽上的星团的该参数为undefined，子星团的该参数由父星团传递。
 * @param upSize POB内部实现，原生插槽上的星团的该参数为undefined，子星团的该参数由父星团传递。
 * @param socketInfos `{proxy: SocketInfo}`,用于将递归实现为循环时保存参数。
 * @return `enabledNodeIds`是点亮的节点的`nodeId`列表，`probableNodeIds`是可能点亮的节点的`nodeId`列表。
 */
function getEnabledNodeIdsOfClusterJewel(
    hashExSet: Set<number>,
    jewelInfo: ClusterJewelInfo,
    id: number | undefined,
    upSize: number | undefined,
    socketInfos: Map<number, SocketInfo>,
): { enabledNodeIds: number[]; probableNodeIds: number[] } {
    const slotNodeId = getNodeIdOfJewelSlot(jewelInfo.slotId);
    const expansionJewel = POB_DATA.tree.nodes[slotNodeId].expansionJewel;

    if (!expansionJewel) {
        console.error(
            "expansion jewel data for slotId is missing",
            jewelInfo.slotId,
        );
        return { enabledNodeIds: [], probableNodeIds: [] };
    }

    const enabledNodeIds: number[] = [];
    const probableNodeIds: number[] = [];

    const jSize = jewelInfo.size;
    const clusterJewel = POB_DATA.clusterJewels.jewels[jSize];

    id = id ?? 0x10000;
    if (expansionJewel.size == 2) {
        id += expansionJewel.index << 6;
    } else if (expansionJewel.size == 1) {
        id += expansionJewel.index << 9;
    }
    const nodeId = id + (clusterJewel.sizeIndex << 4);

    let proxyNode = POB_DATA.tree.nodes[Number(expansionJewel.proxy)];
    let proxyGroup = POB_DATA.tree.groups[proxyNode.group];

    const group =
        jewelInfo.data.subgraph.groups[`expansion_${jewelInfo.slotId}`];
    const exIds: number[] = group.nodes.map((n) => Number(n));
    const exNodes = jewelInfo.data.subgraph.nodes;

    // 传奇小星团珠宝
    if (
        exIds.length === 0 &&
        Object.keys(exNodes).length === 0 &&
        jewelInfo.item.rarity === "Unique"
    ) {
        probableNodeIds.push(nodeId);
        return { enabledNodeIds, probableNodeIds };
    }

    // 非传奇小星团珠宝上的节点分为三类：notable、socket和small
    const notableExIds: number[] = [];
    const socketExIds: number[] = [];
    const smallExIds: number[] = [];

    for (const i of exIds) {
        const node = exNodes[i];
        if (node.isNotable) {
            notableExIds.push(i);
        } else if (node.isJewelSocket) {
            socketExIds.push(i);
        } else if (node.isMastery) {
            // 目前星团珠宝的专精节点是无效数据
        } else {
            smallExIds.push(i);
        }
    }

    const nodeCount =
        notableExIds.length + socketExIds.length + smallExIds.length;

    const clusterJewelNodes: ClusterJewelNode[] = [];
    // 使用局部序号(0~11)标记星团中的节点
    const indicies = new Map<number, ClusterJewelNode>();
    const notableIndicies = [];
    const smallIndicies = [];

    if (jSize === ClusterJewelSize.LARGE && socketExIds.length === 1) {
        const socket = exNodes[socketExIds[0]];
        const node = {
            id: Number(socket.skill),
            oIdx: 6,
        };
        clusterJewelNodes.push(node);
        indicies.set(node.oIdx, node);
    } else {
        const getJewels = [0, 2, 1];
        for (let i = 0; i < socketExIds.length; i++) {
            const nodeIndex = clusterJewel.socketIndicies[i];
            const jewelIndex = getJewels[i];
            const socket = findSocket(proxyGroup, jewelIndex);
            if (!socket) {
                console.error("socket not found");
                continue;
            }

            const node = {
                id: socket.id,
                oIdx: nodeIndex,
            };
            clusterJewelNodes.push(node);
            indicies.set(node.oIdx, node);
        }
    }

    for (let n of clusterJewel.notableIndicies) {
        if (notableIndicies.length === notableExIds.length) {
            break;
        }

        if (jSize === ClusterJewelSize.MEDIUM) {
            if (socketExIds.length === 0 && notableExIds.length === 2) {
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
        const node = {
            id: nodeId + idx,
            oIdx: idx,
        };
        clusterJewelNodes.push(node);
        indicies.set(idx, node);
    }

    for (let n of clusterJewel.smallIndicies) {
        if (smallIndicies.length === smallExIds.length) {
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
        const node = {
            id: nodeId + idx,
            oIdx: idx,
        };
        clusterJewelNodes.push(node);
        indicies.set(idx, node);
    }

    let groupSize = expansionJewel.size;
    upSize = upSize ?? 0;

    while (clusterJewel.sizeIndex < groupSize) {
        const result = findSocket(proxyGroup, 1) ?? findSocket(proxyGroup, 0);
        if (!result) {
            console.error("socket not found", expansionJewel.proxy);
            return { enabledNodeIds, probableNodeIds };
        }

        const { id: socketId, node: socket } = result;

        if (!socket.expansionJewel) {
            console.error("socket has no expansion jewel", socketId);
            return { enabledNodeIds, probableNodeIds };
        }

        proxyNode = POB_DATA.tree.nodes[Number(socket.expansionJewel.proxy)];
        proxyGroup = POB_DATA.tree.groups[proxyNode.group];
        groupSize = socket.expansionJewel.size;
        upSize++;
    }

    const translatedIndicies = new Map<number, ClusterJewelNode>();

    const proxyNodeSkillsPerOrbit =
        POB_DATA.tree.constants.skillsPerOrbit[proxyNode.orbit];
    for (const node of clusterJewelNodes) {
        const proxyNodeOidxRelativeToClusterIndicies = translateOidx(
            proxyNode.orbitIndex,
            proxyNodeSkillsPerOrbit,
            clusterJewel.totalIndicies,
        );
        const correctedNodeOidxRelativeToClusterIndicies =
            (node.oIdx + proxyNodeOidxRelativeToClusterIndicies) %
            clusterJewel.totalIndicies;
        const correctedNodeOidxRelativeToTreeSkillsPerOrbit = translateOidx(
            correctedNodeOidxRelativeToClusterIndicies,
            clusterJewel.totalIndicies,
            proxyNodeSkillsPerOrbit,
        );
        node.oIdx = correctedNodeOidxRelativeToTreeSkillsPerOrbit;
        translatedIndicies.set(node.oIdx, node);
    }

    if (jewelInfo.size === ClusterJewelSize.SMALL) {
        // 算法对 orbitIndex 进行了转换，但目前对于小星团珠宝的转换结果是错误的
        // 需要使用其它办法
        const orderedIndicies = indicies.keys().toArray().sort();
        const orderedNodes = getSmallClusterJewelOrderedNodes(jewelInfo.data);
        if (orderedNodes.length === 0) {
            console.error("empty ordered nodes");
        } else {
            for (let i = 0; i < orderedNodes.length; i++) {
                const exId = orderedNodes[i].exId;
                if (hashExSet.has(exId)) {
                    const clusterJewelNode = indicies.get(orderedIndicies[i]);
                    if (clusterJewelNode) {
                        enabledNodeIds.push(clusterJewelNode.id);
                    }
                    hashExSet.delete(exId);
                }
            }
        }
    } else {
        for (const exId of exIds) {
            const node = exNodes[exId];
            if (hashExSet.has(exId)) {
                const clusterJewelNode = translatedIndicies.get(
                    node.orbitIndex,
                );
                if (clusterJewelNode) {
                    enabledNodeIds.push(clusterJewelNode.id);
                }
                hashExSet.delete(exId);
            }
        }
    }

    for (const exId of socketExIds) {
        const node = exNodes[exId];
        socketInfos.set(Number(node.expansionJewel!.proxy), { id, upSize });
    }

    return { enabledNodeIds, probableNodeIds };
}

function findSocket(
    group: Group,
    index: number,
): { id: number; node: Node } | undefined {
    for (const nodeId of group.nodes) {
        const node = POB_DATA.tree.nodes[nodeId];
        if (node.expansionJewel && node.expansionJewel.index === index) {
            return { id: nodeId, node };
        }
    }
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

/**
 * 按从连接父插槽的第一个节点开始的单向顺序返回小星团珠宝的所有节点
 */
function getSmallClusterJewelOrderedNodes(
    jewelDatum: passiveSkillTypes.ClusterJewelDatum,
): {
    exId: number;
    node: passiveSkillTypes.Node;
}[] {
    const nodes = jewelDatum.subgraph.nodes;

    const exIds = Object.keys(nodes).map((id) => Number(id));
    let startExId = -1;

    for (const [exId, node] of Object.entries(nodes)) {
        const inId = Number(node.in[0]);
        if (!exIds.includes(inId)) {
            startExId = Number(exId);
            break;
        }
    }

    if (startExId === -1) {
        return [];
    }

    const result: { exId: number; node: passiveSkillTypes.Node }[] = [];
    // 目前小型星团珠宝是有向无环图，但需要避免恶意数据或版本更新导致死循环
    const visited = new Set<number>();

    let exId = startExId;
    while (!visited.has(exId)) {
        visited.add(exId);
        const node = nodes[exId];
        result.push({
            exId,
            node,
        });

        if (node.out.length > 0) {
            exId = Number(node.out[0]);
        } else {
            break;
        }
    }

    return result;
}
