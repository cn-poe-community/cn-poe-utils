export interface Character {
    name: string;
    realm: string;
    class: string;
    league: string;
    level: number;
}

export type GetCharactersResult = Character[];
