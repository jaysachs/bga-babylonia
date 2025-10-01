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

class Scorer
{

    /** @param array<int, PlayerInfo> $player_infos */
    public function __construct(
        private Board $board,
        private array $player_infos,
        private Components $components,
        private Stats $stats
    ) {}

    public function computeHexWinner(Hex $hex): HexWinner
    {
        // first compute who will win the city / ziggurat, if anyone.
        $neighbors = $this->board->neighbors(
            $hex,
            function (Hex $h): bool {
                return $h->piece->isPlayerPiece();
            }
        );
        $adjacent = [];
        foreach ($this->player_infos as $pi) {
            $adjacent[$pi->player_id] = 0;
        }
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
        return new HexWinner($hex->clone(), $captured_by, $neighbors);
    }

    public function computeCityScores(Hex $hex): ScoredCity
    {
        $hexWinner = $this->computeHexWinner($hex);
        $result = ScoredCity::makeEmpty($hexWinner, array_keys($this->player_infos));
        foreach (array_keys($this->player_infos) as $pid) {
            $this->computeNetwork($result, $pid, null);
        }
        $this->computeCapturedCityPoints($result);

        $no_zc_land_result = ScoredCity::makeEmpty($hexWinner, array_keys($this->player_infos));
        foreach (array_keys($this->player_infos) as $pid) {
            $this->computeNetwork($no_zc_land_result, $pid, ZigguratCardType::EMPTY_CENTER_LAND_CONNECTS);
        }

        $no_zc_river_result = ScoredCity::makeEmpty($hexWinner, array_keys($this->player_infos));
        foreach (array_keys($this->player_infos) as $pid) {
            $this->computeNetwork($no_zc_river_result, $pid, ZigguratCardType::EMPTY_RIVER_CONNECTS);
        }

        foreach ($this->player_infos as $pid => $_) {
            $r8 = $result->networkPointsForPlayer($pid) - $no_zc_land_result->networkPointsForPlayer($pid);
            if ($r8 > 0) {
                $this->stats->PLAYER_ZC_POINTS_EMPTY_CENTER_LAND->inc($pid, $r8);
            }
            $r9 = $result->networkPointsForPlayer($pid) - $no_zc_river_result->networkPointsForPlayer($pid);
            if ($r9 > 0) {
                $this->stats->PLAYER_ZC_POINTS_EMPTY_RIVER->inc($pid, $r9);
            }
        }

        return $result;
    }

    private function computeNetwork(ScoredCity $result, int $pid, ?ZigguratCardType $ignored_zcard): void
    {
        $this->board->bfs(
            $result->hex_winner->hex->rc,
            function (Hex $h) use (&$result, $pid, $ignored_zcard): bool {
                if ($h == $result->hex_winner->hex) {
                    return true;
                }
                $player_id = $this->networkOwnerOf($h, $ignored_zcard);
                if ($player_id != $pid) {
                    return false;
                }
                return $result->addIfInNetwork($h, $player_id);
            }
        );
    }

    private function computeCapturedCityPoints(ScoredCity $result): void
    {
        if ($result->hex_winner->captured_by == 0) {
            // if no capturer of city, no points for anyone
            return;
        }
        // Now each player gets 1 point for city they've captured.
        foreach ($this->player_infos as $pid => $pi) {
            $points = $pi->captured_city_count;
            // Include the currently captured city
            if ($result->hex_winner->captured_by == $pid) {
                $points++;
            }
            if ($pid == $this->components->zigguratCardOwner(
                ZigguratCardType::EXTRA_CITY_POINTS
            )) {
                $extra_points = intval(floor($points / 2));
                $this->stats->PLAYER_ZC_POINTS_EXTRA_CITY->inc($pid, $extra_points);
                $points += $extra_points;
            }
            $result->captured_city_points[$pid] = $points;
        }
    }

    private function networkOwnerOf(Hex $h, ?ZigguratCardType $ignored_zcard): int /* player_id */
    {
        if ($h->player_id > 0) {
            return $h->player_id;
        }
        if ($h->isWater()) {
            if ($ignored_zcard != ZigguratCardType::EMPTY_RIVER_CONNECTS) {
                return $this->components->zigguratCardOwner(ZigguratCardType::EMPTY_RIVER_CONNECTS);
            }
        } else if ($h->landmass == Landmass::CENTER) {
            if ($ignored_zcard != ZigguratCardType::EMPTY_CENTER_LAND_CONNECTS) {
                return $this->components->zigguratCardOwner(ZigguratCardType::EMPTY_CENTER_LAND_CONNECTS);
            }
        }
        return 0;
    }
}
