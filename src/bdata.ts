export interface RowCol { row: number, col: number };

export interface PlayerData {
  player_id: number;
  hand_size: number;
  pool_size: number;
  captured_city_count: number;
  score: number;
}

export interface Hex extends RowCol {
  board_player: number;
  piece: string;
}

export interface PlayState {
  canEndTurn: boolean;
  canUndo: boolean;
  allowedMoves: RowCol[];
}
