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

/* a played move */
class Move {
    function __construct(public int $player_id, public $piece, public int $handpos, public int $x, public int $y, public $captured, public int $points) {}

    public static function fromDbResults(array &$dbresults): Move {
        return new Move(intval($dbresults['player_id']),
                        $dbresults['piece'],
                        intval($dbresults['handpos']),
                        intval($dbresults['board_x']),
                        intval($dbresults['board_y']),
                        $dbresults['captured'],
                        intval($dbresults['points']));
    }

    public function dbUpdate($db): void {
        $c = $this->captured ? 'TRUE' : 'FALSE';
        $db->DbQuery( "INSERT INTO moves_this_turn
                      (player_id, seq_id, piece, handpos, board_x, board_y, captured, points)
                      VALUES($this->player_id, 0, '$this->piece', $this->handpos, $this->x, $this->y, $c, $this->points)");
        // update board state
        $db->DbQuery("UPDATE board
                     SET piece='$this->piece', player_id=$this->player_id
                     WHERE board_x=$this->x AND board_y=$this->y");

        // update player scores
        if ($this->points > 0) {
            $db->DbQuery("UPDATE player
                          SET player_score =
                              (SELECT player_score FROM player
                               WHERE player_id=$this->player_id) + $this->points)
                          WHERE player_id=$this->player_id");
        }
        // update hands
        $db->DbQuery(
            "UPDATE hands
             SET piece = NULL
             WHERE player_id=$this->player_id AND pos=$this->handpos");
    }
}

?>
