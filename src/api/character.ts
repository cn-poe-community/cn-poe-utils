export interface Character {
    name: string;
    realm: string;
    class: string;
    league: string;
    level: number;
    lastLoginTime: number;
}

export type GetCharactersResult = Character[];
