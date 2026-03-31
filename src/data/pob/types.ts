export type Clazz = {
    name: string;
    ascendancies: Ascendancy[];
};

export type Ascendancy = {
    name: string;
};

export type Group = {
    nodes: number[];
};

export type Node = {
    isProxy?: boolean;
    isJewelSocket?: boolean;
    expansionJewel?: ExpansionJewel;
    orbit: number;
    orbitIndex: number;
    group: number;
};

export type ExpansionJewel = {
    size: number;
    index: number;
    proxy: string;
    parent?: string;
};

export type Constants = {
    classes: { [key: string]: number };
    characterAttributes: { [key: string]: number };
    PSSCentreInnerRadius: number;
    skillsPerOrbit: number[];
    orbitRadii: number[];
};

export type Tree = {
    classes: Clazz[];
    groups: { [index: number]: Group };
    nodes: { [index: number]: Node };
    jewelSlots: number[];
    constants: Constants;
};

export type ClusterJewelMetadata = {
    sizeIndex: number;
    notableIndicies: number[];
    socketIndicies: number[];
    smallIndicies: number[];
    totalIndicies: number;
};

export interface Data {
    tree: Tree;
    phreciaAscendancyMap: { [key: string]: string };
    rarityMap: { [index: number]: string };
    slotMap: { [key: string]: string };
    clusterJewels: {
        jewels: { [index: string]: ClusterJewelMetadata };
    };
}
