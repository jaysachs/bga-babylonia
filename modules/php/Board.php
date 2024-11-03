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

class Board {

    private function addHex(Hex $hex) {
        @ $hexrow = &$this->hexes[$hex->row];
        if ($hexrow == null) {
            $this->hexes[$hex->row] = [];
        }
        $hexrow[$hex->col] = $hex;
    }

    public function hexAt(int $row, int $col) : ?Hex {
        if (key_exists($row, $this->hexes)) {
            return @ $this->hexes[$row][$col];
        }
        return null;
    }

    const MAP = <<<'END'
        .   .   .   .   =   _   .   .   .
          _   .   .   _   C   _   .   .
        _   =   _   _   =   _   C   .   .
          !   C   _   _   _   _   _   .
        _   =   _   C   =   _   _   C   .
          _   _   _   _   =   !   _   .
        C   =   _   _   C   =   _   _   .
          _   =   C   _   _   _   _   C
        _   _   =   _   _   =   C   _   .
          C   _   =   _   C   _   _   _
        _   _   C   _   _   =   _   _   .
          _   _   =   _   _   _   C   _
        C   _   _   C   !   =   _   _   C
          _   _   =   _   _   C   _   _
        _   C   C   _   _   =   _   C   _
          =   _   =   _   =   _   _   _
        =   =   _   _   C   _   C   _   _
          _   =   =   _   =   _   _   _
        =   !   =   _   _   C   _   !   C
          _   _   C   C   =   _   _   _
        =   _   _   _   _   =   _   _   _
          C   _   _   _   _   _   _   _
        .   _   C   _   C   =   C   C   .
END;

    public static function forPlayerCount(int $numPlayers, bool $random = true): Board {
        if ($numPlayers < 2 || $numPlayers > 4) {
            throw new \InvalidArgumentException(sprintf("invalid number of players: %s", $numPlayers));
        }
        $board = new Board();
        $lines = explode("\n", Board::MAP);
        $row = 0;
        $development_locations = [];
        foreach ($lines as &$s) {
            $col = ($row & 1) ? 1 : 0;
            foreach (preg_split("/\s+/", trim($s)) as $t) {
                if ($t == ".") {
                    // nothing, unplayable hex
                } else if ($t == "_") {
                    $board->addHex(Hex::land($row, $col));
                } else if ($t == "C") {
                    $board->addHex(Hex::land($row, $col));
                    $development_locations[] = [ $row, $col ];
                } else if ($t == "!" || $t == "Z") {
                    $board->addHex(Hex::ziggurat($row, $col));
                } else if ($t == "=" || $t == "W") {
                    $board->addHex(Hex::water($row, $col));
                } else {
                    throw new \InvalidArgumentException("Unexpected string in board map: '$t'");
                }
                $col += 2;
            }
            $row++;
        }

        $board->markLandmass(Landmass::WEST, 18, 16);
        $board->markLandmass(Landmass::EAST, 2, 0);
        $board->markLandmass(Landmass::CENTER, 11, 7);

        switch ($numPlayers) {
        case 2:
            $board->removeLandmass(Landmass::WEST);
            break;
        case 3:
            $board->removeLandmassAt(Landmass::EAST);
        }

        $available_developments = self::initializePool($numPlayers, $random);
        $board->placeDevelopments($available_developments, $development_locations);
        if (count($available_developments) != 0) {
            throw new \LogicException("placed all cities and fields but developments leftover");
        }
        return $board;
    }

    private function placeDevelopments(array &$available_developments,
                                       array &$development_locations) {
        foreach ($development_locations as $rc) {
            $hex = $this->hexAt($rc[0], $rc[1]);
            if ($hex != null) {
                $x = array_shift($available_developments);
                $hex->placeDevelopment($x);
            }
        }
    }

    public function cityCount(): int {
        $city_count = 0;
        $this->visitAll(function (&$hex) use (&$city_count): void {
            if ($hex->piece->isCity()) {
                $city_count++;
            }
        });
        return $city_count;
    }

    public function visitAll(\Closure $visit) {
        foreach ($this->hexes as &$hexrow) {
            foreach ($hexrow as &$hex) {
                $visit($hex);
            }
        }
    }

    public static function fromHexes(array /* Hex */ &$hexes): Board {
        $board = new Board();
        foreach ($hexes as &$hex) {
            $board->addHex($hex);
        }
        return $board;
    }

    private function __construct() {}
    private array $hexes = [];

    /* visit should return true if continue exploring */
    public function bfs(int $start_row, int $start_col, \Closure $visit) {
        $seen = [];
        $queue = [ $this->hexAt($start_row, $start_col) ];
        while ($queue) {
            $hex = array_pop($queue);
            $seen[] = $hex;
            if ($visit($hex)) {
                $nb = $this->neighbors($hex, $visit);
                foreach ($nb as $n) {
                    if (!in_array($n, $seen)) {
                        $queue[] = $n;
                    }
                }
            }
        }
    }

    private function markLandmass(Landmass $landmass, int $start_row, int $start_col) {
        $this->bfs(
            $start_row,
            $start_col,
            function(&$hex) use ($landmass) {
                if ($hex->isLand()) {
                    $hex->landmass = $landmass;
                    return true;
                }
                return false;
            }
        );
    }

    private function removeLandmass(Landmass $landmass) {
        foreach ($this->hexes as &$hexrow) {
            foreach ($hexrow as &$hex) {
                if ($hex->landmass == $landmass) {
                    unset($hexrow[$hex->col]);
                }
            }
        }
    }

    public function adjacentZiggurats(int $player_id): int {
        $adjacent = 0;
        $this->visitAll(function (&$hex) use ($player_id, &$adjacent) {
            if ($hex->piece == Piece::ZIGGURAT) {
                $nb = $this->neighbors($hex, function(&$nh) use ($player_id) {
                    return $nh->player_id == $player_id;
                });
                if (count($nb) > 0) {
                    $adjacent++;
                }
            }
        });
        return $adjacent;
    }

    public function neighbors(Hex &$hex, \Closure $matching): array {
        $r = $hex->row;
        $c = $hex->col;

        return array_filter(
                [
                    $this->hexAt($r-2, $c),
                    $this->hexAt($r-1, $c+1),
                    $this->hexAt($r+1, $c+1),
                    $this->hexAt($r+2, $c),
                    $this->hexAt($r+1, $c-1),
                    $this->hexAt($r-1, $c-1)
                ], function ($nh) use ($matching) {
                    return $nh != null && $matching($nh);
                }
            );
    }

    private static function initializePool(int $numPlayers, bool $random) {
        $available_developments = array();
        for ($i = 0; $i < 2; $i++) {
            $available_developments[] = Piece::CITY_P;
            $available_developments[] = Piece::CITY_S;
            $available_developments[] = Piece::CITY_M;
            $available_developments[] = Piece::CITY_SP;
            $available_developments[] = Piece::CITY_MS;
            $available_developments[] = Piece::CITY_MP;
        }
        for ($i = 0; $i < 3; $i++) {
            $available_developments[] = Piece::FIELD_CITIES;
        }
        $available_developments[] = Piece::FIELD_5;
        $available_developments[] = Piece::FIELD_6;
        $available_developments[] = Piece::FIELD_7;
        if ($numPlayers > 2) {
            $available_developments[] = Piece::CITY_SP;
            $available_developments[] = Piece::CITY_MS;
            $available_developments[] = Piece::CITY_MP;
            $available_developments[] = Piece::CITY_MSP;
            $available_developments[] = Piece::FIELD_5;
            $available_developments[] = Piece::FIELD_6;
            $available_developments[] = Piece::FIELD_7;
            $available_developments[] = Piece::FIELD_CITIES;
        }
        if ($numPlayers > 3) {
            $available_developments[] = Piece::CITY_P;
            $available_developments[] = Piece::CITY_S;
            $available_developments[] = Piece::CITY_M;
            for ($i = 0; $i < 3; $i++) {
                $available_developments[] = Piece::FIELD_CITIES;
            }
        }
        if ($random) {
            shuffle($available_developments);
        }
        return $available_developments;
    }
}

?>
