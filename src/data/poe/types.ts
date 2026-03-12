export interface Attribute {
    zh: string;
    en: string;
    values?: AttributeValue[];
}

export interface AttributeValue {
    zh: string;
    en: string;
}

export interface BaseType {
    zh: string;
    en: string;
    uniques?: Unique[];
}

export interface Unique {
    zh: string;
    en: string;
}

export interface Skill {
    zh: string;
    en: string;
}

export interface Node {
    zh: string;
    en: string;
}

export interface Property {
    zh: string;
    en: string;
    values?: PropertyValue[];
}

export interface PropertyValue {
    zh: string;
    en: string;
}

export interface Requirement {
    zh: string;
    en: string;
    values?: RequirementValue[];
}

export interface RequirementValue {
    zh: string;
    en: string;
}

export interface RequirementSuffix {
    zh: string;
    en: string;
}

export interface Stat {
    zh: string;
    en: string;
    refs?: {
        [key: string]: string;
    };
}

export interface ClientString {
    id: string;
    zh: string;
    en: string;
    type: string;
}

export interface Data {
    // item types
    amulets: BaseType[];
    belts: BaseType[];
    bodyArmours: BaseType[];
    boots: BaseType[];
    flasks: BaseType[];
    gloves: BaseType[];
    helmets: BaseType[];
    jewels: BaseType[];
    quivers: BaseType[];
    rings: BaseType[];
    shields: BaseType[];
    tattoos: BaseType[];
    tinctures: BaseType[];
    weapons: BaseType[];
    // skills
    gemSkills: Skill[];
    hybridSkills: Skill[];
    indexableSupports: Skill[];
    transfiguredSkills: Skill[];
    // passive skill nodes
    anointed: Node[];
    ascendant: Node[];
    keystones: Node[];
    // stats
    stats: Stat[];
    // others
    attributes: Attribute[];
    properties: Property[];
    requirements: Requirement[];
    requirementSuffixes: RequirementSuffix[];
    strings: ClientString[];
}
