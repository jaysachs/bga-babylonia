export interface BblPlayer extends Player {
    hand_size: number;
    pool_size: number;
    captured_city_count: number;
    // FIXME: remove this?
    player_id: number;
    color_index: number;
}

export type PieceType = 'empty' | 'hidden' | 'merchant' | 'priest' | 'servant' | 'farmer'
    | 'ziggurat'
    | 'city_p' | 'city_s' | 'city_m' | 'city_sp' | 'city_mp' | 'city_ms' | 'city_msp'
    | 'field_5' | 'field_6' | 'field_7' | 'field_x';

export interface Hex {
    rc: number;
    board_player: number;
    piece?: PieceType;
    scored: boolean;
    terrain: 'NORTH' | 'SOUTH' | 'CENTRAL' | 'RIVER' | 'UNUSED';
}

export type ZType = 'zc_10pts' | 'zc_xturn' | 'zc_hand7' | 'zc_3nobles' | 'zc_farmers' | 'zc_fields' | 'zc_citypts' | 'zc_land' | 'zc_river' ;

export interface Zcard {
    type: ZType;
    used: boolean;
    tooltip: string;
    owning_player_id: number;
}

export type PotentialCityScoring = Record<string, Record<string, number>>;

export interface HandPiece {
    piece_type: PieceType;
    position: number;
    played: boolean;
}

export interface PieceCount {
    pieceType: PieceType;
    count: number;
}

export interface BGamedatas extends Gamedatas<BblPlayer> {
    board: Hex[];
    hand?: HandPiece[];
    pool?: Record<PieceType, number>;
    ziggurat_cards: Zcard[];
    translated_pieces: Record<PieceType, string>;
    potential_city_scoring: PotentialCityScoring;
    captured_city_count: number;
}
