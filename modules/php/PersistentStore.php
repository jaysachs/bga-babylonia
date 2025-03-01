<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <vagabond@covariant.org>
 *
 * Copyright 2024 Jay Sachs <vagabond@covariant.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 */

declare(strict_types=1);

namespace Bga\Games\babylonia;

class PersistentStore {
    public function __construct(private Db $db) { }

    private function boolValue(bool $b): string {
        return $b ? 'TRUE' : 'FALSE';
    }

    public function retrieveBoard(): Board {
        $sql = "SELECT board_row row, board_col col, hextype, piece, scored,
                       player_id board_player, landmass
                FROM board";
        $data = $this->db->getObjectList($sql);

        /** @var Hex[] */
        $hexes = [];
        foreach ($data as &$hex) {
            $hexes[] = new Hex(HexType::from($hex['hextype']),
                               new RowCol(intval($hex['row']),
                                          intval($hex['col'])),
                               Piece::from($hex['piece']),
                               intval($hex['board_player']),
                               boolval($hex['scored']),
                               Landmass::from($hex['landmass']));
        };
        return Board::fromHexes($hexes);
    }

    public function insertBoard(Board $board): void {
        $sql_values = [];
        $board->visitAll(function (Hex $hex) use (&$sql_values) {
            $piece = $hex->piece->value;
            $player_id = $hex->player_id;
            $sc = $this->boolValue($hex->scored);
            $t = $hex->type->value;
            $lm = $hex->landmass->value;
            $rc = $hex->rc;
            $sql_values[] =
                "($rc->row, $rc->col, '$t', '$piece', $sc, $player_id, '$lm')";
        });
        $values = implode(',', $sql_values);
        $sql = "INSERT INTO board (board_row, board_col, hextype, piece,
                                   scored, player_id, landmass)
                VALUES $values";
        $this->db->execute($sql);
    }

    public function upsertPool(int $player_id, Pool $pool): void {
        $sql = "DELETE FROM handpools WHERE player_id = $player_id";
        $this->db->execute($sql);

        $sql_values = [];
        foreach ($pool->pieces() as $i => $p) {
            $x = $p->value;
            $sql_values[] = "($player_id, $i, '$x')";
        }
        if (count($sql_values) == 0) {
            return;
        }
        $values = implode(',', $sql_values);
        $sql = "INSERT INTO handpools (player_id, seq_id, piece)
                VALUES $values";
        $this->db->execute($sql);
    }

    public function retrievePool(int $player_id): Pool {
        $sql = "SELECT piece
                FROM handpools
                WHERE player_id = $player_id";
        $data = $this->db->getSingleFieldList($sql);

        $pieces = [];
        foreach ($data as $pd) {
            $pieces[] = Piece::from($pd);
        }
        return new Pool($pieces);
    }

    // Not efficient, but there are at most seven rows involed here.
    public function upsertHand(int $player_id, Hand $hand): void {
        $sql = "DELETE FROM hands
                WHERE player_id = $player_id";
        $this->db->execute($sql);

        $sql_values = [];
        foreach ($hand->pieces() as $i => $p) {
            $sql_values[] = "($player_id, $i, '$p->value')";
        }
        if (count($sql_values) == 0) {
            return;
        }
        $values = implode(',', $sql_values);
        $sql = "INSERT INTO hands (player_id, pos, piece)
                VALUES $values";
        $this->db->execute($sql);
    }

    public function retrieveHand(int $player_id): Hand {
        $sql = "SELECT piece
                FROM hands
                WHERE player_id = $player_id
                ORDER BY pos";
        $data = $this->db->getSingleFieldList($sql);
        $pieces = [];
        foreach ($data as $pd) {
            $pieces[] = Piece::from($pd);
        }
        return new Hand($pieces);
    }

    /** @param int[] $player_ids */
    public function initializePlayerData(array $player_ids): void {
        $sql_values = [];
        foreach ($player_ids as $player_id) {
            $sql_values[] = "($player_id, 0)";
        }
        $values = implode(',', $sql_values);
        $sql = "INSERT INTO player_data (player_id, captured_city_count)
                VALUES $values";
        $this->db->execute($sql);
    }

    public function updatePlayer(PlayerInfo $player_info): void {
        $sql = "UPDATE player q
                SET q.player_score = $player_info->score
                WHERE q.player_id = $player_info->player_id";
        $this->db->execute($sql);

        $sql = "UPDATE player_data q
                SET q.captured_city_count=$player_info->captured_city_count
                WHERE q.player_id = $player_info->player_id";

        $this->db->execute($sql);
    }

    /** @param array<int,PlayerInfo> $player_infos */
    public function updatePlayers(array $player_infos): void {
        foreach ($player_infos as $player_id => $pi) {
            $this->updatePlayer($pi);
        }
    }

    public function deleteAllMoves(int $player_id): void {
        $sql = "DELETE FROM turn_progress
                WHERE player_id=$player_id";
        $this->db->execute($sql);
    }

    public function deleteSingleMove(Move $move): void {
        $sql = "DELETE FROM turn_progress
                WHERE player_id = $move->player_id
                AND seq_id = $move->seq_id";
        $this->db->execute($sql);
    }

    public function updateHex(RowCol $rc,
                              ?Piece $piece = null,
                              ?int $player_id = null,
                              ?bool $scored = null): void {
        $updates = [];
        if ($piece !== null) {
            $updates[] = "piece='$piece->value'";
        }
        if ($player_id !== null) {
            $updates[] = "player_id=$player_id";
        }
        if ($scored !== null) {
            $bs = $this->boolValue($scored);
            $updates[] = "scored=$bs";
        }
        $updates = implode(',', $updates);
        $sql = "UPDATE board
                SET $updates
                WHERE board_row=$rc->row AND board_col=$rc->col";
        $this->db->execute($sql);
    }

    public function updateHand(int $player_id, int $handpos, Piece $piece): void {
        $sql = "UPDATE hands
                SET piece = '$piece->value'
                WHERE player_id=$player_id AND pos=$handpos";
        $this->db->execute($sql);
    }

    public function incPlayerScore(int $player_id, int $points): void {
        if ($points == 0) {
            return;
        }
        $sql = "UPDATE player q
                SET q.player_score = (
                    SELECT p.sc + $points
                    FROM (SELECT player_score sc
                          FROM player
                          WHERE player_id = $player_id) p)
                    WHERE q.player_id = $player_id";
        $this->db->execute($sql);
    }

    public function insertMove(Move $move): void {
        $captured_piece = $move->captured_piece->value;
        $piece = $move->piece->value;
        $opiece = $move->original_piece->value;
        $rc = $move->rc;
        $sql = "INSERT INTO turn_progress(player_id, seq_id,
                                          original_piece, piece, handpos,
                                          board_row, board_col,
                                          captured_piece, field_points,
                                          ziggurat_points)
                VALUES($move->player_id, NULL, '$opiece', '$piece',
                       $move->handpos, $rc->row, $rc->col,
                       '$captured_piece', $move->field_points,
                       $move->ziggurat_points)";
        $this->db->execute($sql);
    }

    public function retrieveTurnProgress(int $player_id): TurnProgress {
        $sql = "SELECT seq_id, player_id, handpos, piece, original_piece,
                       board_row, board_col, captured_piece, field_points,
                       ziggurat_points
                FROM turn_progress
                WHERE player_id = $player_id
                ORDER BY seq_id";
        /** @var array<int,string[]> $data */
        $data = $this->db->getObjectList($sql);
        $moves = [];
        foreach ($data as &$md) {
            $moves[] = new Move(intval($md['player_id']),
                                Piece::from($md['piece']),
                                Piece::from($md['original_piece']),
                                intval($md['handpos']),
                                new RowCol(intval($md['board_row']),
                                           intval($md['board_col'])),
                                Piece::from($md['captured_piece']),
                                intval($md['field_points']),
                                intval($md['ziggurat_points']),
                                intval($md['seq_id']));
        }
        return new TurnProgress($moves);
    }

    /** @param array<int,int> $aux_scores */
    public function updateAuxScores(array $aux_scores): void {
        if (count($aux_scores) == 0) {
            return;
        }
        $cases = [];
        foreach ($aux_scores as $pid => $city_count) {
            $cases[] = " WHEN {$pid} THEN {$city_count} ";
        }
        $whens = implode(',', $cases);
        $keys = implode(',', array_keys($aux_scores));
        $sql = "UPDATE player
                SET player_score_aux = CASE player_id
                    $whens
                    ELSE 0
                  END
                WHERE player_id IN ($keys)";
        $this->db->execute($sql);
    }

    /** @return array<int,PlayerInfo> */
    public function &retrieveAllPlayerInfo(): array {
        $sql = "SELECT P.player_id player_id, P.player_score score,
                       D.captured_city_count captured_city_count,
                       H.hand_size, Q.pool_size
                FROM player P
                LEFT OUTER JOIN player_data D
                ON P.player_id = D.player_id
                LEFT JOIN
                    (SELECT player_id, COUNT(*) hand_size
                     FROM hands WHERE piece <> 'empty'
                     GROUP BY player_id) H
                ON P.player_id = H.player_id
                LEFT JOIN
                    (SELECT player_id, COUNT(*) pool_size
                     FROM handpools
                     GROUP BY player_id) Q
                ON P.player_id = Q.player_id";
        //         GROUP_CONCAT(z.ziggurat_card SEPARATOR ',') cards
        //         ...
        //  INNER JOIN ziggurat_cards Z ON P.player_id = Z.player_id"

        /** @var array<int,string[]> $data */
        $data = $this->db->getObjectList($sql);
        $result = [];
        foreach ($data as $pd) {
            $pid = intval($pd['player_id']);
            $result[$pid] = $this->playerInfoFromData($pid, $pd);
        }
        return $result;
    }

    /** @param string[] $pd */
    private function playerInfoFromData(int $player_id, array $pd): PlayerInfo {
        return new PlayerInfo($player_id,
                              intval($pd["score"]),
                              intval($pd["captured_city_count"]),
                              intval($pd["hand_size"]),
                              intval($pd["pool_size"]));
    }

    public function insertComponents(Components $components): void {
        $sql_values = [];
        foreach ($components->allZigguratCards() as &$zc) {
            $used = $this->boolValue($zc->used);
            $type = $zc->type->value;
            $sql_values[] = "('$type', $used, $zc->owning_player_id)";
        }
        $values = implode(',', $sql_values);
        $sql = "INSERT INTO ziggurat_cards (card_type, used, player_id)
                VALUES $values";
        $this->db->execute($sql);
    }

    public function retrieveComponents(): Components {
        $sql = "SELECT card_type, player_id, used
                FROM ziggurat_cards";
        $data = $this->db->getObjectList($sql);

        $cards = [];
        foreach ($data as $zd) {
            $cards[] =
                new ZigguratCard(ZigguratCardType::from($zd["card_type"]),
                                 intval($zd["player_id"]),
                                 boolval($zd["used"]));
        }
        return new Components($cards);
    }

    public function updateZigguratCard(ZigguratCard $card): void {
        $player_id = $card->owning_player_id;
        $used = $this->boolValue($card->used);
        $type = $card->type->value;

        $sql = "UPDATE ziggurat_cards
                SET player_id = $player_id, used = $used
                WHERE card_type = '$type'";
        $this->db->execute($sql);
    }
}



?>
