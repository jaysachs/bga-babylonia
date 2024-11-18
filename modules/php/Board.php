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

    public function asTestMap(): string {
        $lines = [];
        $row = -1;
        $col = -2;
        $this->visitAll(function ($hex) use (&$row, &$col, &$lines) {
            if ($hex->row != $row) {
                $lines[] = [];
                $row = $hex->row;
                $col = -2;
                if ($row & 1) {
                    $col = -1;
                }
            }
            $z = count($lines)-1;
            for ($i = $col+2; $i < $hex->col; $i+=2) {
                $lines[$z][] = 'XXX';
            }
            $col = $hex->col;

            $r = match ($hex->piece) {
                Piece::EMPTY => match ($hex->type) {
                    HexType::LAND => '---',
                    HexType::WATER => '≈≈≈',
                },
                Piece::CITY_P => 'C.P',
                Piece::CITY_S => 'C.S',
                Piece::CITY_M => 'C.M',
                Piece::CITY_SP => 'CSP',
                Piece::CITY_MS => 'CMS',
                Piece::CITY_MP => 'CMP',
                Piece::CITY_MSP => 'C**',
                Piece::FIELD_5 => 'F.5',
                Piece::FIELD_6 => 'F.6',
                Piece::FIELD_7 => 'F.7',
                Piece::FIELD_CITIES => 'F.C',
                Piece::ZIGGURAT => 'ZZZ',
                Piece::MERCHANT => 'm-' . $hex->player_id,
                Piece::PRIEST => 'p-' . $hex->player_id,
                Piece::FARMER => 'f-' . $hex->player_id,
                Piece::SERVANT => 's-' . $hex->player_id,
                Piece::HIDDEN => 'h-' . $hex->player_id,
            };
            $lines[$z][] = $r;
        });

        $x = '';
        $row = 0;
        foreach ($lines as $line) {
            if ($row++ & 1) { $x .= '   '; }
            $x .= implode('   ', $line) . "\n";
        }
        return $x;
    }

    public static function fromTestMap(string $map, &$dev_locs = null): Board {
        $board = new Board();
        $lines = explode("\n", trim($map));
        $row = 0;
        foreach ($lines as &$s) {
            $col = ($row & 1) ? 1 : 0;
            foreach (preg_split("/\s+/", trim($s)) as $t) {
                $matches = [];
                if ($t == "XXX") {
                    // nothing, unplayable hex
                } else if (preg_match('/^m-([0-9])$/', $t, $matches)) {
                    $board->addHex(
                        Hex::land($row, $col)->playPiece(Piece::MERCHANT, intval($matches[1])));
                } else if (preg_match('/^s-([0-9])$/', $t, $matches)) {
                    $board->addHex(
                        Hex::land($row, $col)->playPiece(Piece::SERVANT, intval($matches[1])));
                } else if (preg_match('/^f-([0-9])$/', $t, $matches)) {
                    $board->addHex(
                        Hex::land($row, $col)->playPiece(Piece::FARMER, intval($matches[1])));
                } else if (preg_match('/^h-([0-9])$/', $t, $matches)) {
                    $board->addHex(
                        Hex::water($row, $col)->playPiece(Piece::HIDDEN, intval($matches[1])));
                } else if (preg_match('/^p-([0-9])$/', $t, $matches)) {
                    $board->addHex(
                        Hex::land($row, $col)->playPiece(Piece::PRIEST, intval($matches[1])));
                } else if ($t == "---") {
                    $board->addHex(Hex::land($row, $col));
                } else if ($t == "≈≈≈" || $t == '===') {
                    $board->addHex(Hex::water($row, $col));
                } else if ($t == "ZZZ") {
                    $board->addHex(Hex::ziggurat($row, $col));
                } else if ($t == "CCC") {
                    $board->addHex(Hex::land($row, $col));
                    if ($dev_locs !== null) {
                        $dev_locs[] = [ $row, $col ];
                    }
                } else if ($t == "C.P") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::CITY_P));
                } else if ($t == "C.S") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::CITY_S));
                } else if ($t == "C.M") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::CITY_M));
                } else if ($t == "CSP") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::CITY_SP));
                } else if ($t == "CMS") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::CITY_MS));
                } else if ($t == "CMP") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::CITY_MP));
                } else if ($t == "C**") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::CITY_MSP));
                } else if ($t == "F.5") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::FIELD_5));
                } else if ($t == "F.6") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::FIELD_6));
                } else if ($t == "F.7") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::FIELD_7));
                } else if ($t == "F.C") {
                    $board->addHex(
                        Hex::land($row, $col)->placeDevelopment(Piece::FIELD_CITIES));
                } else {
                    throw new \InvalidArgumentException("Unexpected string in board map: '$t' in '$s'");
                }
                $col += 2;
            }
            $row++;
        }
        return $board;
    }

    const MAP2 =<<<'END'
XXX   XXX   XXX   XXX   ≈≈≈   ---
   ---   XXX   XXX   ---   CCC   ---
---   ≈≈≈   ---   ---   ≈≈≈   ---   CCC
   ZZZ   CCC   ---   ---   ---   ---   ---
---   ≈≈≈   ---   CCC   ≈≈≈   ---   ---   CCC
   ---   ---   ---   ---   ≈≈≈   ZZZ   ---
CCC   ≈≈≈   ---   ---   CCC   ≈≈≈   ---   ---
   ---   ≈≈≈   CCC   ---   ---   ---   ---   CCC
---   ---   ≈≈≈   ---   ---   ≈≈≈   CCC   ---
   CCC   ---   ≈≈≈   ---   CCC   ---   ---   ---
---   ---   CCC   ---   ---   ≈≈≈   ---   ---
   ---   ---   ≈≈≈   ---   ---   ---   CCC   ---
CCC   ---   ---   CCC   ZZZ   ≈≈≈   ---   ---   CCC
   ---   ---   ≈≈≈   ---   ---   CCC   ---   ---
---   CCC   CCC   ---   ---   ≈≈≈   ---   CCC   ---
   ≈≈≈   ---   ≈≈≈   ---   ≈≈≈   ---   ---   ---
≈≈≈   ≈≈≈   ---   ---   CCC   ---   CCC   ---   ---
   ---   ≈≈≈   ≈≈≈   ---   ≈≈≈   ---   ---   ---
≈≈≈   ZZZ   ≈≈≈   ---   ---   CCC   ---   ZZZ   CCC
   ---   ---   CCC   CCC   ≈≈≈   ---   ---   ---
≈≈≈   ---   ---   ---   ---   ≈≈≈   ---   ---   ---
   CCC   ---   ---   ---   ---   ---   ---   ---
XXX   ---   CCC   ---   CCC   ≈≈≈   CCC   CCC
END;

    public static function forPlayerCount(int $numPlayers, bool $random = true): Board {
        if ($numPlayers < 2 || $numPlayers > 4) {
            throw new \InvalidArgumentException(sprintf("invalid number of players: %s", $numPlayers));
        }
        $development_locations = [];
        $board = Board::fromTestMap(Board::MAP2, $development_locations);
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
            $hex = array_shift($queue);
            $seen[] = $hex;
            if ($visit($hex)) {
                $nb = $this->neighbors($hex);
                foreach ($nb as $n) {
                    if (!in_array($n, $seen) && !in_array($n, $queue)) {
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

    public function neighbors(Hex &$hex, ?\Closure $matching = null): array {
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
                    return $nh != null && ($matching === null || $matching($nh));
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

/*
$b = Board::forPlayerCount(4);
print $b->asTestMap();
$b2 = Board::fromTestMap($b->asTestMap());
print $b2->asTestMap();
*/
?>
