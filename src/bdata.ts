export interface BblPlayer extends Player {
  hand_size: number;
  pool_size: number;
  captured_city_count: number;
  // FIXME: remove this?
  player_id: number;
}

export interface Hex {
  rc: number;
  board_player: number;
  piece: string;
}

export interface Zcard {
  type: string;
  used: boolean;
  tooltip: string;
  owning_player_id: number;
}

export interface BGamedatas extends Gamedatas<BblPlayer> {
  board: Hex[];
  hand: string[];
  ziggurat_cards: Zcard[];
  translated_pieces: Record<string,string>;
}
