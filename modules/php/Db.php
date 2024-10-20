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
    public function __construct(private mixed $db) {}

    public function insertBoard($board): void {
        $sql = "INSERT INTO board (board_x, board_y, hextype, piece, scored, player_id) VALUES ";
        $sql_values = [];
        $board->visitAll(function ($hex) use (&$sql_values) {
            $player_id = 'NULL';
            $piece = 'NULL';
            if (is_a($hex->piece, 'PlayedPiece')) {
                $piece = "'" . $hex->piece->type->value . "'";
                $player_id = $hex->piece->player_id;
            } else if ($hex->piece != null) {
                $piece = "'" . $hex->piece->value . "'";
            }
            $t = $hex->type->value;
            $scored = $hex->scored ? 'TRUE' : 'FALSE';
            $sql_values[] = "($hex->col, $hex->row, '$t', $piece, $scored, $player_id)";
        });
        $sql .= implode(',', $sql_values);
        $this->db->DbQuery( $sql );
    }

    public function updateMove($move) {
        $c = ($move->captured) ? 'TRUE' : 'FALSE';
        $this->db->DbQuery( "INSERT INTO moves_this_turn
                      (player_id, seq_id, piece, handpos, board_x, board_y, captured, points)
                      VALUES($move->player_id, 0, '$move->piece', $move->handpos, $move->x, $move->y, $c, $move->points)");
        // update board state
        $this->db->DbQuery("UPDATE board
                     SET piece='$move->piece', player_id=$move->player_id
                     WHERE board_x=$move->x AND board_y=$move->y");

        // update player scores
        if ($move->points > 0) {
            $this->db->DbQuery("UPDATE player
                          SET player_score =
                              (SELECT player_score FROM player
                               WHERE player_id=$move->player_id) + $move->points)
                          WHERE player_id=$move->player_id");
        }
        // update hands
        $this->db->DbQuery(
            "UPDATE hands
             SET piece = NULL
             WHERE player_id=$move->player_id AND pos=$move->handpos");
    }
    
    public function retrievePlayedTurn(int $player_id): PlayedTurn {
        $dbresults = $this->db->getCollectionFromDb(
            "SELECT player_id, handpos, piece, board_x, board_y, captured, points
             FROM moves_this_turn
             WHERE player_id = $player_id
             ORDER BY seq_id");
        $moves = [];
        foreach ($dbresults as &$res) {
            $moves[] = Move::fromDbResults($res);
        }
        return new PlayedTurn($moves);
    }

    public function insertPlayerInfos(array $player_infos): void {
        // first the pools
        $sql = "INSERT INTO handpools (player_id, seq_id, piece) VALUES ";
        $sql_values = [];
        foreach ($player_infos as $player_id => $pi) {
            foreach ($pi->pool as $piece) {
                $sql_values[] = "($player_id, NULL, '$piece->value')";
            }
        }
        $sql .= implode(',', $sql_values);
        $this->db->DbQuery( $sql );

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
}    

        

?>
