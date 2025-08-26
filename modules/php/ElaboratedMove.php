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
 * ̰
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 */

declare(strict_types=1);

namespace Bga\Games\babylonia;

/* A played move with details */

class ElaboratedMove extends Move
{
    function __construct(
        int $player_id,
        Piece $piece,
        Piece $original_piece,
        int $handpos,
        RowCol $rc,
        Piece $captured_piece,
        int $field_points,
        int $ziggurat_points,
        /** RowCol[] */
        public array $touched_ziggurats,
        int $seq_id = 0
    ) {
        parent::__construct(
            $player_id,
            $piece,
            $original_piece,
            $handpos,
            $rc,
            $captured_piece,
            $field_points,
            $ziggurat_points,
            $seq_id
        );
    }

    public function __toString(): string
    {
        return parent::__toString()
            . sprintf(" zigs: %s", implode(',', $this->touched_ziggurats));
    }
}
