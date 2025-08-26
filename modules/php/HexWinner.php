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

class HexWinner
{

    /** @param array<int, Hex> $neighbors */
    public function __construct(
        public Hex $hex,
        public int $captured_by,
        public array $neighbors
    ) {}

    /** @return array<int, RowCol> */
    public function winnerRowCols(): array
    {
        return $this->rcs(
            array_filter(
                $this->neighbors,
                function ($hex): bool {
                    return $hex->player_id == $this->captured_by;
                }
            )
        );
    }

    /** @return array<int, RowCol> */
    public function othersRowCols(): array
    {
        return $this->rcs(
            array_filter(
                $this->neighbors,
                function ($hex): bool {
                    return $hex->player_id > 0
                        && $hex->player_id != $this->captured_by;
                }
            )
        );
    }

    /**
     * @param array<int, Hex> $hexes
     * @return array<int, RowCol>
     */
    private function rcs(array $hexes): array
    {
        $a = array_map(
            function (Hex $hex): RowCol {
                return $hex->rc;
            },
            $hexes
        );
        return [...$a];
    }
}
