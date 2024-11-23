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

    public function __construct(
        public Hex $scoredHex,
        public int $captured_by,
        public array /* player_id => int */ $captured_city_points,
        private array /* player_id => Hex */ $scoringHexes,
        private array /* player_id => Hex */ $networkHexes) { }

    public static function makeEmpty(Hex $scoredHex, array $player_ids) {
        $sc = new ScoredCity($scoredHex, 0, [], [], []);
        foreach ($player_ids as $pid) {
            $sc->networkHexes[$pid] = [];
            $sc->scoringHexes[$pid] = [];
            $sc->captured_city_points[$pid] = 0;
        }
        return $sc;
    }

    public function addIfInNetwork(Hex $hex, int $player_id): bool {
        if ($hex->isNeighbor($this->scoredHex)) {
            $this->addNetworkHex($hex, $player_id);
            return true;
        }
        foreach ($this->networkHexes[$player_id] as $nwh) {
            if ($hex->isNeighbor($nwh)) {
                $this->addNetworkHex($hex, $player_id);
                return true;
            }
        }
        return false;
    }

    public function addNetworkHex(Hex $hex, int $player_id): void {
        $this->networkHexes[$player_id][] = $hex;
        if ($this->scoredHex->piece->scores($hex->piece)) {
            $this->scoringHexes[$player_id][] = $hex;
        }
    }

    public function pointsForPlayer(int $player_id): int {
        return $this->networkPointsForPlayer($player_id)
            + $this->capturePointsForPlayer($player_id);
    }

    public function networkPointsForPlayer(int $player_id): int {
        return 2 * count($this->scoringHexes[$player_id]);
    }

    public function capturePointsForPlayer(int $player_id): int {
        return intval(floor($this->captured_city_points[$player_id]/2));
    }

    public function scoringHexesForPlayer(int $player_id): array {
        return $this->scoringHexes[$player_id];
    }

    public function networkHexesForPlayer(int $player_id): array {
        return $this->networkHexes[$player_id];
    }
}

?>
