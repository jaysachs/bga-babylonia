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
  piece: PieceType;
  terrain: 'NORTH' | 'SOUTH' | 'CENTRAL' | 'RIVER';
}

export interface Zcard {
  type: string;
  used: boolean;
  tooltip: string;
  owning_player_id: number;
}

export interface BGamedatas extends Gamedatas<BblPlayer> {
  board: Hex[];
  hand: PieceType[] | undefined;
  ziggurat_cards: Zcard[];
  translated_pieces: Record<PieceType,string>;
}
