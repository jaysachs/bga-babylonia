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

class TurnProgress {
    function __construct(public array &$moves) {}

    public function addMove(Move $move) {
        $this->moves[] = $move;
    }

    public function uniquePiecesPlayed(): array /* Piece */ {
        $seen = [];
        foreach ($this->moves as &$move) {
            $seen[$move->piece] = 1;
        }
        return array_keys($seen);
    }

    public function allMovesFarmersOnLand(Board $board): bool {
        foreach ($this->moves as &$move) {
            if ($move->piece != Piece::FARMER) {
                return false;
            }
            $hex = $board->hexAt($move->row, $move->col);
            if ($hex->isWater()) {
                return false;
            }
        }
        return true;
    }
}

?>
