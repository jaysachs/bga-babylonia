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

class TurnProgress {
    function __construct(public array &$moves = []) {}

    public function addMove(Move $move): void {
        $this->moves[] = $move;
    }

    public function canUndo(): bool {
        return count($this->moves) > 0;
    }

    public function undoLastMove(): Move {
        if (! $this->canUndo() ) {
            throw new \LogicException("No moves to undo!");
        }
        return array_pop($this->moves);
    }

    public function uniqueNoblesPlayed(): array /* Piece */ {
        $seen = [];
        foreach ($this->moves as &$move) {
            if ($move->piece->isNoble()) {
                $seen[$move->piece->value] = 1;
            }
        }
        return array_map(function ($p) { return Piece::from($p); },
                         array_keys($seen));
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
