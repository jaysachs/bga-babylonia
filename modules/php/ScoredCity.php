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

    /**
     * all are from player_id -> ...
     * @param HexWinner $hex_winner
     * @param array<int,int> $captured_city_points
     * @param array<int,Hex[]> $scoringHexes,
     * @param array<int,Hex[]> $networkHexes
     */
    public function __construct(
        public HexWinner $hex_winner,
        public array $captured_city_points,
        private array $scoringHexes,
        private array $networkHexes) { }

    /** @param int[] $player_ids */
    public static function makeEmpty(HexWinner $hex_winner, array $player_ids): ScoredCity {
        $sc = new ScoredCity($hex_winner, [], [], []);
        foreach ($player_ids as $pid) {
            $sc->networkHexes[$pid] = [];
            $sc->scoringHexes[$pid] = [];
            $sc->captured_city_points[$pid] = 0;
        }
        ksort($sc->networkHexes);
        ksort($sc->scoringHexes);
        ksort($sc->captured_city_points);
        return $sc;
    }

    public function addIfInNetwork(Hex $hex, int $player_id): bool {
        if ($hex->isNeighbor($this->hex_winner->hex)) {
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

    private function addNetworkHex(Hex $hex, int $player_id): void {
        $this->networkHexes[$player_id][] = $hex;
        sort($this->networkHexes[$player_id]);
        if ($this->hex_winner->hex->piece->scores($hex->piece)) {
            $this->scoringHexes[$player_id][] = $hex;
            sort($this->scoringHexes[$player_id]);
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
        return $this->captured_city_points[$player_id];
    }

    /** @return RowCol[] */
    public function scoringLocationsForPlayer(int $player_id): array {
        return $this->toRowCol($this->scoringHexes[$player_id]);
    }

    /** @return RowCol[] */
    public function networkLocationsForPlayer(int $player_id): array {
        return $this->toRowCol($this->networkHexes[$player_id]);
    }

    /**
     * @param Hex[] $hexes
     * @return RowCol[]
     */
    private function toRowCol(array &$hexes): array {
        return array_map(
            function (Hex $hex): RowCol {
                return $hex->rc;
            },
            $hexes
        );
    }

    public function equals(ScoredCity $other): bool {
        return $this->hex_winner == $other->hex_winner
            && $this->scoringHexes == $other->scoringHexes
            && $this->networkHexes == $other->networkHexes
            && $this->captured_city_points == $other->captured_city_points
            ;
    }
}

?>
