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

class Scorer {

    public function __construct(private Board $board,
                                private array /* PlayerInfo */ $player_infos,
                                private Components $components) { }

    private function newEmptyPlayerMap(mixed $value): array {
        $result = [];
        foreach ($this->player_infos as $pi) {
            $result[$pi->player_id] = $value;
        }
        return $result;
    }

    public function computeHexWinner(Hex $hex): int {
        // first compute who will win the city / ziggurat, if anyone.
        $neighbors = $this->board->neighbors(
            $hex,
            function (&$h): bool { return $h->piece->isPlayerPiece(); }
        );
        $adjacent = $this->newEmptyPlayerMap(0);
        foreach ($neighbors as $h) {
            $adjacent[$h->player_id]++;
        }
        $captured_by = 0;
        $maxc = 0;
        foreach ($adjacent as $p => $c) {
            if ($c > $maxc) {
                $maxc = $c;
                $captured_by = $p;
            } else if ($c > 0 && $c == $maxc) {
                $captured_by = 0;
            }
        }
        return $captured_by;
    }

    public function computeCityScores(Hex $hex): ScoredCity {
        $result = ScoredCity::makeEmpty(array_keys($this->player_infos));
        $result->captured_by = $this->computeHexWinner($hex);

        $this->computeNetworks($hex, $result);
        $this->computeCapturedCityPoints($result);

        return $result;
    }

    private function computeNetworks(Hex $hex, ScoredCity $result) {
        $this->board->bfs(
            $hex->row,
            $hex->col,
            function (&$h) use (&$result, &$hex) {
                if ($h == $hex) {
                    return true;
                }
                $player_id = $this->networkOwnerOf($h);
                if ($player_id > 0) {
                    if ($this->inNetwork($h, $hex, $player_id, $result->networkHexesForPlayer($player_id))) {
                        $result->addNetworkHex($h, $player_id);
                        if ($hex->piece->scores($h->piece)) {
                            $result->addScoredHex($h, $player_id);
                        }
                        return true;
                    }
                }
                return false;
            }
        );
    }

    private function computeCapturedCityPoints(ScoredCity $result): void {
        // Now each player gets 1 point for city they've captured.
        foreach ($this->player_infos as $pid => $pi) {
            $points = $pi->captured_city_count;
            if ($result->captured_by == $pid) {
                $points++;
            }
            if ($pid == $this->components->zigguratCardOwner(
                ZigguratCardType::EXTRA_CITY_POINTS)) {
                $points += intval(floor($points / 2));
            }
            $result->captured_city_points[$pid] = $points;

        }
    }

    private function inNetwork(Hex $h,
                               Hex $scored_hex,
                               int $player_id,
                               array $nwhexes): bool {
        $nb = $this->board->neighbors($h);
        foreach ($nb as $nbh) {
            if ($nbh == $scored_hex) {
                return true;
            }
            foreach ($nwhexes as $nwh) {
                if ($nwh == $nbh) {
                    return true;
                }
            }
        }
        return false;
    }

    private function networkOwnerOf(Hex $h): int /* player_id */ {
        if ($h->player_id > 0) {
            return $h->player_id;
        }
        if ($h->isWater()) {
            return $this->components->zigguratCardOwner(
                ZigguratCardType::FREE_RIVER_CONNECTS);
        } else if ($h->landmass == Landmass::CENTER) {
            return $this->components->zigguratCardOwner(
                ZigguratCardType::FREE_CENTER_LAND_CONNECTS);
        }
        return 0;
    }
}

?>
