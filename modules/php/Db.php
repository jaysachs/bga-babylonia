<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <jay@covariant.org>
 *
 * Copyright 2024 Jay Sachs <jay@covariant.org>
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

class Db {
    public function __construct(private mixed $db) {
        Logging::debug("Db initialized");
    }

    private function boolValue(bool $b): string {
        return $b ? 'TRUE' : 'FALSE';
    }

    private function enumValue($e): string {
        return $e == null ? 'NULL' : "'$e->value'";
    }

    public function insertBoard(Board $board): void {
        $sql = "INSERT INTO board (board_row, board_col, hextype, piece, scored, player_id) VALUES ";
        $sql_values = [];
        $board->visitAll(function ($hex) use (&$sql_values) {
            $piece = $this->enumValue($hex->piece);
            $player_id = $hex->player_id;
            $scored = $this->boolValue($hex->scored);
            $t = $hex->type->value;
            $sql_values[] = "($hex->row, $hex->col, '$t', $piece, $scored, $hex->player_id)";
        });
        $sql .= implode(',', $sql_values);
        $this->db->DbQuery( $sql );
    }

    public function retrieveHandPiece(int $player_id, int $handpos): ?Piece {
        $v = $this->db->getUniqueValueFromDB(
            "SELECT piece from hands WHERE player_id = $player_id AND pos=$handpos"
        );
        return $v == null ? null : Piece::from($v);
    }

    public function retrievePlayersData(): array {
        return $this->db->getCollectionFromDb(
            "SELECT P.player_id, P.player_score score, P.captured_city_count captured_city_count, P.player_no player_number, P.player_name player_name, H.hand_size, Q.pool_size
             FROM
               (SELECT player_id, COUNT(*) hand_size
                FROM hands WHERE piece IS NOT NULL AND piece <> 'empty'
                GROUP BY player_id) H
             JOIN player P
             ON P.player_id = H.player_id
             JOIN
               (SELECT player_id, COUNT(*) pool_size
                FROM handpools
                GROUP BY player_id) Q
             ON P.player_id = Q.player_id;"
            // "SELECT P.player_id player_id,
            //         P.player_score score,
            //         P.player_color color,
            //         COUNT(H.piece) hand_size,
            //         GROUP_CONCAT(z.ziggurat_card SEPARATOR ',') cards
            //  FROM player P
            //  INNER JOIN hands H ON P.player_id = H.player_id
            //  INNER JOIN ziggurat_cards Z ON P.player_id = Z.player_id"
        );
    }

    public function retrieveHandData(int $player_id): array {
        return $this->db->getObjectListFromDB2(
            "SELECT piece from hands WHERE player_id = $player_id ORDER BY pos"
        );
    }

    public function retrieveBoard(): Board {
        return Board::fromDbResult($this->retrieveBoardData());
    }

    public function retrieveBoardData(): array {
        return $this->db->getObjectListFromDB2(
            "SELECT board_row row, board_col col, hextype, piece, scored, player_id board_player FROM board ORDER BY col, row"
        );
    }

    public function removeTurnProgress(int $player_id): void {
        $sql = "DELETE FROM turn_progress WHERE player_id=$player_id";
        $this->db->DbQuery( $sql );
    }

    public function updatePlayers(array $player_data): void {
        foreach ($player_data as $player_id => $pd) {
            $score = $pd["score"];
            $captured_city_count = $pd["captured_city_count"];
            $this->db->DbQuery(
                "UPDATE player q
                 SET q.player_score = $score, q.captured_city_count=$captured_city_count
                 WHERE q.player_id = $player_id"
            );
        }
    }

    public function insertMove(Move $move) {
        $c = $this->boolValue($move->captured);
        $piece = $move->piece->value;
        $this->db->DbQuery( "INSERT INTO turn_progress
                      (player_id, seq_id, piece, handpos, board_row, board_col, captured, points)
                      VALUES($move->player_id, NULL, '$piece', $move->handpos, $move->row, $move->col, $c, $move->points)");
        // update board state
        $this->db->DbQuery("UPDATE board
                     SET piece='$piece', player_id=$move->player_id
                     WHERE board_row=$move->row AND board_col=$move->col");

        // update player scores
        if ($move->points > 0) {
            $this->db->DbQuery(
                "UPDATE player q
                 SET q.player_score = (
                     SELECT p.sc + $move->points
                     FROM (SELECT player_score sc
                           FROM player
                           WHERE player_id = $move->player_id) p)
                     WHERE q.player_id = $move->player_id" );
        }
        // update hands
        $empty = Piece::EMPTY->value;
        $this->db->DbQuery(
            "UPDATE hands
             SET piece = '$empty'
             WHERE player_id=$move->player_id AND pos=$move->handpos");
    }

    public function retrieveTurnProgress(int $player_id): TurnProgress {
        $dbresults = $this->db->getCollectionFromDb(
            "SELECT seq_id, player_id, handpos, piece, board_row, board_col, captured, points
             FROM turn_progress
             WHERE player_id = $player_id
             ORDER BY seq_id");
        $moves = [];
        foreach ($dbresults as &$res) {
            $moves[] = Move::fromDbResults($res);
        }
        return new TurnProgress($moves);
    }

    public function updateHex(Hex $hex): void {
        $piece = $hex->piece->value;
        $this->db->DbQuery("UPDATE board
                     SET piece='$piece', player_id=$hex->player_id
                     WHERE board_row=$hex->row AND board_col=$hex->col");
    }

    public function updatePlayerInfo(int $player_id, PlayerInfo $info) {
        $sql = "DELETE FROM handpools WHERE player_id = $player_id";
        $this->db->DbQuery( $sql );
        $sql = "DELETE FROM hands WHERE player_id = $player_id";
        $this->db->DbQuery( $sql );

        $this->insertPlayerInfos([$player_id => $info]);
        $sql = "UPDATE player
                SET captured_city_count = $info->captured_city_count
                WHERE player_id = $player_id";
        $this->db->DbQuery( $sql );
    }

    public function retrievePlayerInfo(int $player_id): PlayerInfo {
        $sql = "SELECT pos, piece
                FROM hands
                WHERE player_id = $player_id
                ORDER BY pos";
        $handdata = $this->db->getObjectListFromDB2( $sql );
        $sql = "SELECT piece
                FROM handpools
                WHERE player_id = $player_id";
        $pooldata = $this->db->getObjectListFromDB2( $sql );
        $sql = "SELECT ziggurat_card
                FROM ziggurat_cards
                WHERE player_id = $player_id";
        $ziggurat_data = $this->db->getObjectListFromDB2( $sql );
        $sql = "SELECT captured_city_count, player_score score
                FROM player
                WHERE player_id = $player_id";
        $player_data = $this->db->getNonEmptyObjectFromDB2( $sql );
        return PlayerInfo::fromDbResults( $player_id, $handdata, $pooldata, $ziggurat_data, $player_data );
    }

    public function insertPlayerInfos(array $player_infos): void {
        // first the pools
        $sql_values = [];
        foreach ($player_infos as $player_id => $pi) {
            foreach ($pi->pool as $piece) {
                $x = $piece->value;
                $sql_values[] = "($player_id, '$x')";
            }
        }
        if (count($sql_values) > 0) {
            $sql = "INSERT INTO handpools (player_id, piece) VALUES "
                . implode(',', $sql_values);
            $this->db->DbQuery( $sql );
        }

        // then the hands
        $sql = "INSERT INTO hands (player_id, pos, piece) VALUES ";
        $sql_values = [];
        foreach ($player_infos as $player_id => $pi) {
            for ($i = 0; $i < count($pi->hand); ++$i) {
                $p = $pi->hand[$i];
                $piece = ($p == null) ? "NULL" : "'$p->value'";
                $sql_values[] = "($player_id, $i, $piece)";
            }
        }
        $sql .= implode(',', $sql_values);
        $this->db->DbQuery( $sql );
    }

    public function retrieveScore(int $player_id): int {
        $v = $this->db->getUniqueValueFromDB(
            "SELECT player_score from player WHERE player_id = $player_id "
        );
        return $v == null ? null : intval($v);
    }

    public function insertZigguratCards(array $ziggurats): void {
        $sql = "INSERT INTO ziggurat_cards (ziggurat_card, player_id) VALUES ";

        $sql_values = [];
        foreach ($ziggurats as $zc) {
            $sql_values[] = "('$zc->value', 0)";
        }
        $sql .= implode(',', $sql_values);
        $this->db->DbQuery( $sql );
    }

    public function retrieveZigguratCards(): array {
        return $this->db->getObjectListFromDB2(
            "SELECT ziggurat_card, player_id
             FROM ziggurat_cards"
        );
    }
}



?>
