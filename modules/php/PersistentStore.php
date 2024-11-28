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
    public function __construct(private mixed $db) {
        Logging::debug("PersistentStore initialized");
    }

    private function boolValue(bool $b): string {
        return $b ? 'TRUE' : 'FALSE';
    }

    private function enumValue(mixed $e): string {
        return $e == null ? 'NULL' : "'$e->value'";
    }

    public function retrieveBoard(): Board {
        /** @var Hex[] */
        $hexes = [];
        /** @var string[][] $data */
        $data = $this->db->getObjectListFromDB2(
                "SELECT board_row row, board_col col, hextype, piece, scored,
                        player_id board_player, landmass
                 FROM board");
        foreach ($data as &$hex) {
            $hexes[] = new Hex(HexType::from($hex['hextype']),
                               new RowCol(intval($hex['row']),
                                          intval($hex['col'])),
                               Piece::from($hex['piece']),
                               intval($hex['board_player']),
                               boolval($hex['scored']),
                               Landmass::from($hex['landmass']));
        }
        return Board::fromHexes($hexes);
    }

    public function insertBoard(Board $board): void {
        $sql = "INSERT INTO board (board_row, board_col, hextype, piece, scored, player_id, landmass) VALUES ";
        $sql_values = [];
        $board->visitAll(function (Hex $hex) use (&$sql_values) {
            $piece = $this->enumValue($hex->piece);
            $player_id = $hex->player_id;
            $scored = $this->boolValue($hex->scored);
            $t = $hex->type->value;
            $lm = $hex->landmass->value;
            $rc = $hex->rc;
            $sql_values[] = "($rc->row, $rc->col, '$t', $piece, $scored, $hex->player_id, '$lm')";
        });
        $sql .= implode(',', $sql_values);
        $this->db->DbQuery( $sql );
    }

    public function upsertPool(int $player_id, Pool $pool): void {
        $sql = "DELETE FROM handpools WHERE player_id = $player_id";
        $this->db->DbQuery( $sql );

        $sql_values = [];
        foreach ($pool->pieces() as $i => $p) {
            $x = $p->value;
            $sql_values[] = "($player_id, $i, '$x')";
        }
        if (count($sql_values) > 0) {
            $sql = "INSERT INTO handpools (player_id, seq_id, piece) VALUES "
                . implode(',', $sql_values);
            $this->db->DbQuery( $sql );
        }
    }

    public function retrievePool(int $player_id): Pool {
        $sql = "SELECT piece
                FROM handpools
                WHERE player_id = $player_id";
        /** @var string[] $data */
        $data = $this->db->getObjectListFromDB2( $sql, true );

        return new Pool(
            array_map(function (string $p): Piece { return Piece::from($p); }, $data)
        );
    }

    // Not efficient, but there are at most seven rows involed here.
    public function upsertHand(int $player_id, Hand $hand): void {
        $sql = "DELETE FROM hands WHERE player_id = $player_id";
        $this->db->DbQuery( $sql );
        // then the hands
        $sql_values = [];
        foreach ($hand->pieces() as $i => $p) {
            $sql_values[] = "($player_id, $i, '$p->value')";
        }
        if (count($sql_values) > 0) {
            $sql = "INSERT INTO hands (player_id, pos, piece) VALUES "
                . implode(',', $sql_values);
            $this->db->DbQuery( $sql );
        }
    }

    public function retrieveHand(int $player_id): Hand {
        /** @var string[] $data */
        $data = $this->db->getObjectListFromDB2(
            "SELECT piece from hands WHERE player_id = $player_id ORDER BY pos",
            true
        );
        return new Hand(
            array_map(function (string $p): Piece { return Piece::from($p); }, $data)
        );
    }

    public function updatePlayer(PlayerInfo $player_info): void {
        $this->db->DbQuery(
            "UPDATE player q
             SET q.player_score = $player_info->score,
                 q.captured_city_count=$player_info->captured_city_count
             WHERE q.player_id = $player_info->player_id"
        );
    }

    /** @param array<int,PlayerInfo> $player_infos */
    public function updatePlayers(array $player_infos): void {
        foreach ($player_infos as $player_id => $pi) {
            $this->updatePlayer($pi);
        }
    }

    public function deleteAllMoves(int $player_id): void {
        $sql = "DELETE FROM turn_progress WHERE player_id=$player_id";
        $this->db->DbQuery( $sql );
    }

    public function deleteSingleMove(Move $move): void {
        $this->db->DbQuery( "DELETE FROM turn_progress
                             WHERE player_id = $move->player_id
                             AND seq_id = $move->seq_id" );
    }

    public function updateHex(RowCol $rc,
                              ?Piece $piece = null,
                              ?bool $scored = null): void {
        $sql = "UPDATE board SET ";
        $updates = [];
        if ($piece !== null) {
            $updates[] = "piece='$piece->value'";
        }
        if ($scored !== null) {
            $bs = $this->boolValue($scored);
            $updates[] = "scored='$bs'";
        }
        $this->db->DbQuery("UPDATE board SET"
                           . implode(',', $updates)
                           . " WHERE board_row=$rc->row AND board_col=$rc->col");
    }

    public function updateHand(int $player_id, int $handpos, Piece $piece): void {
        $this->db->DbQuery(
            "UPDATE hands
             SET piece = '$piece->value'
             WHERE player_id=$player_id AND pos=$handpos");
    }

    public function incPlayerScore(int $player_id, int $points): void {
        if ($points > 0) {
            $this->db->DbQuery(
                "UPDATE player q
                 SET q.player_score = (
                     SELECT p.sc + $points
                     FROM (SELECT player_score sc
                           FROM player
                           WHERE player_id = $player_id) p)
                     WHERE q.player_id = $player_id" );
        }
    }

    public function insertMove(Move $move): void {
        $captured_piece = $move->captured_piece->value;
        $piece = $move->piece->value;
        $opiece = $move->original_piece->value;
        $rc = $move->rc;
        $this->db->DbQuery( "INSERT INTO turn_progress
                      (player_id, seq_id,
                       original_piece, piece, handpos,
                       board_row, board_col,
                       captured_piece, field_points, ziggurat_points)
                      VALUES($move->player_id, NULL, '$opiece', '$piece',
                             $move->handpos, $rc->row, $rc->col,
                             '$captured_piece', $move->field_points,
                             $move->ziggurat_points)");
    }

    public function retrieveTurnProgress(int $player_id): TurnProgress {
        /** @var array<int,string[]> $dbresults */
        $dbresults = $this->db->getCollectionFromDb(
            "SELECT seq_id, player_id, handpos, piece, original_piece, board_row, board_col, captured_piece, field_points, ziggurat_points
             FROM turn_progress
             WHERE player_id = $player_id
             ORDER BY seq_id");
        $moves = [];
        foreach ($dbresults as &$move) {
            $moves[] = new Move(intval($move['player_id']),
                                Piece::from($move['piece']),
                                Piece::from($move['original_piece']),
                                intval($move['handpos']),
                                new RowCol(intval($move['board_row']),
                                           intval($move['board_col'])),
                                Piece::from($move['captured_piece']),
                                intval($move['field_points']),
                                intval($move['ziggurat_points']),
                                intval($move['seq_id']));
        }
        return new TurnProgress($moves);
    }

    /** @param array<int,int> $aux_scores */
    public function updateAuxScores(array $aux_scores): void {
        if (count($aux_scores) == 0) {
            return;
        }
        $sql = 'UPDATE player SET player_score_aux = CASE player_id ';
        foreach ($aux_scores as $pid => $city_count) {
            $sql .= " WHEN {$pid} THEN {$city_count} ";
        }
        $sql .= ' ELSE 0 END WHERE player_id IN '
                . '(' . implode(',', array_keys($aux_scores)) . ')';
        $this->db->DbQuery($sql);
    }

    /** @return array<int,PlayerInfo> */
    public function retrieveAllPlayerInfo(): array {
        $result = [];
        /** @var array<int,string[]> $data */
        $data = $this->db->getCollectionFromDB( PersistentStore::SQL_PLAYER_INFO );
        foreach ($data as $pid => $pd) {
            $result[$pid] = $this->playerInfoFromData($pid, $pd);
        }
        return $result;
    }

    const SQL_PLAYER_INFO =
        "SELECT P.player_id id, P.player_id, P.player_score score,
                P.player_color player_color,
                P.captured_city_count captured_city_count, P.player_no player_number,
                P.player_name player_name, H.hand_size, Q.pool_size
         FROM player P
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


    /** @param string[] $pd */
    private function playerInfoFromData(int $player_id, array $pd): PlayerInfo {
        return new PlayerInfo($player_id,
                              $pd["player_name"],
                              $pd["player_color"],
                              intval($pd["player_number"]),
                              intval($pd["score"]),
                              intval($pd["captured_city_count"]),
                              intval($pd["hand_size"]),
                              intval($pd["pool_size"]));
    }

    public function insertComponents(Components $components): void {
        $sql = "INSERT INTO ziggurat_cards (card_type, used, player_id) VALUES ";

        $sql_values = [];
        foreach ($components->allZigguratCards() as &$zc) {
            $used = $this->boolValue($zc->used);
            $type = $zc->type->value;
            $sql_values[] = "('$type', $used, $zc->owning_player_id)";
        }
        $sql .= implode(',', $sql_values);
        $this->db->DbQuery( $sql );
    }

    public function retrieveComponents(): Components {
        return new Components(array_map(
            /** @param string[] $d */
            function (array $d) {
                return new ZigguratCard(ZigguratCardType::from($d["card_type"]),
                                        intval($d["player_id"]),
                                        boolval($d["used"]));
            },
            $this->db->getObjectListFromDB2(
                "SELECT card_type, player_id, used FROM ziggurat_cards")
        ));
    }

    public function updateZigguratCard(ZigguratCard $card): void {
        $player_id = $card->owning_player_id;
        $used = $this->boolValue($card->used);
        $type = $card->type->value;
        $this->db->DbQuery("UPDATE ziggurat_cards
                            SET player_id = $player_id, used = $used
                            WHERE card_type = '$type'");
    }
}



?>
