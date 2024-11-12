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

class ScoredCity {

    private array $playerHexes = [];
    public int $captured_by = 0;
    public array $captured_city_points = [];

    public function __construct(public Piece $type,
                                array $player_ids) {
        foreach ($player_ids as $pid) {
            $this->playerHexes[$pid] = [];
            $this->captured_city_points[$pid] = 0;
        }
    }

    public function addScoredHex(Hex $hex): void {
        $this->playerHexes[$hex->player_id][] = $hex;
    }

    public function pointsForPlayer(int $player_id): int {
        return 2 * count($this->playerHexes[$player_id])
            + $this->captured_city_points[$player_id];
    }

    public function hexesScoringForPlayer(int $player_id): array {
        return $this->playerHexes[$player_id];
    }
}

?>
