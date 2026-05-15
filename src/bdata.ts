export interface PlayerData {
  player_id: number;
  hand_size: number;
  pool_size: number;
  captured_city_count: number;
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

export interface BGamedatas extends Gamedatas<Player> {
  player_data: PlayerData[];
  board: Hex[];
  hand: string[];
  ziggurat_cards: Zcard[];
  translated_pieces: Record<string,string>;
  current_scoring_hex: number | null;
}
