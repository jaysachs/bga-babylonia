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
    function __construct(public int $player_id, public Piece $piece, public int $handpos, public int $row, public int $col, public bool $captured, public int $points) {}

    public static function fromDbResults(array &$dbresults): Move {
        return new Move(intval($dbresults['player_id']),
                        Piece::from($dbresults['piece']),
                        intval($dbresults['handpos']),
                        intval($dbresults['board_row']),
                        intval($dbresults['board_col']),
                        boolval($dbresults['captured']),
                        intval($dbresults['points']));
    }

}

?>
