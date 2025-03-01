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

    private function __construct() {}

    // key is stringified RowCol
    /** @var array<int,Hex> */
    private array $hexes = [];

    private function addHex(Hex $hex): void {
        $this->hexes[$hex->rc->asKey()] = $hex;
    }

    public function hexAt(RowCol $rc) : Hex {
        $hex = $this->maybeHexAt($rc);
        if ($hex != null) {
            return $hex;
        }
        throw new \InvalidArgumentException("No hex at $rc");
    }

    private function maybeHexAt(RowCol $rc) : ?Hex {
        return @ $this->hexes[$rc->asKey()];
    }

    public function asTestMap(): string {
        $lines = [];
        $row = -1;
        $col = -2;
        $this->visitAll(function (Hex $hex) use (&$row, &$col, &$lines): void {
            if ($hex->rc->row != $row) {
                $lines[] = [];
                $row = $hex->rc->row;
                $col = -2;
                if ($row & 1) {
                    $col = -1;
                }
            }
            $z = count($lines)-1;
            for ($i = $col+2; $i < $hex->rc->col; $i+=2) {
                $lines[$z][] = 'XXX';
            }
            $col = $hex->rc->col;

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

    public static function fromTestMap(string $map): Board {
        $dev_locs = [];
        return self::fromMap($map, $dev_locs);
    }

    /** @param RowCol[] $dev_locs */
    private static function fromMap(string $map, array &$dev_locs): Board {
        $board = new Board();
        $lines = explode("\n", trim($map));
        $row = 0;

        // convenience utility function
        $play = function(Hex $hex, Piece $piece, string $playerMatch) use (&$board): void {
            $board->addHex($hex);
            $hex->playPiece($piece, intval($playerMatch));
        };

        foreach ($lines as &$s) {
            $col = ($row & 1) ? 1 : 0;
            foreach (preg_split("/\s+/", trim($s)) as $t) {
                $rc = new RowCol($row, $col);
                $m = [];
                if ($t == "XXX") {
                    // nothing, unplayable hex
                } else if (preg_match('/^m-([0-9])$/', $t, $m)) {
                    $play(Hex::land($rc), Piece::MERCHANT, $m[1]);
                } else if (preg_match('/^s-([0-9])$/', $t, $m)) {
                    $play(Hex::land($rc), Piece::SERVANT, $m[1]);
                } else if (preg_match('/^f-([0-9])$/', $t, $m)) {
                    $play(Hex::land($rc), Piece::FARMER, $m[1]);
                } else if (preg_match('/^h-([0-9])$/', $t, $m)) {
                    $play(Hex::land($rc), Piece::HIDDEN, $m[1]);
                } else if (preg_match('/^p-([0-9])$/', $t, $m)) {
                    $play(Hex::land($rc), Piece::PRIEST, $m[1]);
                } else if ($t == "---") {
                    $board->addHex(Hex::land($rc));
                } else if ($t == "≈≈≈" || $t == '===') {
                    $board->addHex(Hex::water($rc));
                } else if ($t == "ZZZ") {
                    $board->addHex(Hex::ziggurat($rc));
                } else if ($t == "CCC") {
                    $board->addHex(Hex::land($rc));
                    $dev_locs[] = $rc;
                } else if ($t == "C.P") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::CITY_P));
                } else if ($t == "C.S") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::CITY_S));
                } else if ($t == "C.M") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::CITY_M));
                } else if ($t == "CSP") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::CITY_SP));
                } else if ($t == "CMS") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::CITY_MS));
                } else if ($t == "CMP") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::CITY_MP));
                } else if ($t == "C**") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::CITY_MSP));
                } else if ($t == "F.5") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::FIELD_5));
                } else if ($t == "F.6") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::FIELD_6));
                } else if ($t == "F.7") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::FIELD_7));
                } else if ($t == "F.C") {
                    $board->addHex(
                        Hex::land($rc)->placeDevelopment(Piece::FIELD_CITIES));
                } else {
                    throw new \InvalidArgumentException("Unexpected string in board map: '$t' in '$s'");
                }
                $col += 2;
            }
            $row++;
        }
        return $board;
    }

    const ACTUAL_MAP =<<<'END'
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

    public static function forPlayerCount(int $numPlayers): Board {
        if ($numPlayers < 2 || $numPlayers > 4) {
            throw new \InvalidArgumentException(sprintf("invalid number of players: %s", $numPlayers));
        }

        /** @var RowCol[] */
        $development_locations = [];
        $board = Board::fromMap(Board::ACTUAL_MAP, $development_locations);
        $board->markLandmass(Landmass::WEST, new RowCol(18, 16));
        $board->markLandmass(Landmass::EAST, new RowCol(2, 0));
        $board->markLandmass(Landmass::CENTER, new RowCol(11, 7));

        switch ($numPlayers) {
        case 2:
            $board->removeLandmass(Landmass::WEST, $development_locations);
            break;
        case 3:
            $board->removeLandmass(Landmass::EAST, $development_locations);
        }

        $available_developments = self::initializePool($numPlayers);
        $board->placeDevelopments($available_developments, $development_locations);
        if (count($available_developments) != 0) {
            throw new \LogicException("placed all cities and fields but developments leftover");
        }
        return $board;
    }

    /**
     * @param Piece[] $available_developments
     * @param RowCol[] $development_locations
     */
    private function placeDevelopments(array &$available_developments,
                                       array &$development_locations): void {
        foreach ($development_locations as $rc) {
            $hex = $this->hexAt($rc);
            $x = array_shift($available_developments);
            $hex->placeDevelopment($x);
        }
    }

    public function cityCount(): int {
        $city_count = 0;
        $this->visitAll(function (Hex $hex) use (&$city_count): void {
            if ($hex->piece->isCity()) {
                $city_count++;
            }
        });
        return $city_count;
    }

    public function visitAll(\Closure $visit): void {
        foreach ($this->hexes as $hex) {
            $visit($hex);
        }
    }

    /** @param Hex[] $hexes */
    public static function fromHexes(array &$hexes): Board {
        $board = new Board();
        foreach ($hexes as $hex) {
            $board->addHex($hex);
        }
        return $board;
    }

    /* visit should return true if continue exploring */
    public function bfs(RowCol $start, \Closure $visit): void {
        $seen = [];
        $queue = [ $this->hexAt($start) ];
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

    private function markLandmass(Landmass $landmass, RowCol $start): void {
        $this->bfs(
            $start,
            function(Hex $hex) use ($landmass) {
                if ($hex->isLand()) {
                    $hex->landmass = $landmass;
                    return true;
                }
                return false;
            }
        );
    }

    /** @param RowCol[] $development_locations */
    private function removeLandmass(Landmass $landmass, array &$development_locations): void {
        foreach ($this->hexes as $hex) {
            if ($hex->landmass == $landmass) {
                unset($this->hexes[$hex->rc->asKey()]);
                $v = array_search($hex->rc, $development_locations);
                if ($v !== false) {
                    array_splice($development_locations, intval($v), 1);
                }
            }
        }
    }

    public function adjacentZiggurats(int $player_id): int {
        $adjacent = 0;
        $this->visitAll(function (Hex $hex) use ($player_id, &$adjacent): void {
            if ($hex->piece == Piece::ZIGGURAT) {
                $nb = $this->neighbors($hex, function(Hex $nh) use ($player_id): bool {
                    return $nh->player_id == $player_id;
                });
                if (count($nb) > 0) {
                    $adjacent++;
                }
            }
        });
        return $adjacent;
    }

    /**
     * @return Hex[]
     */
    public function neighbors(Hex $hex, ?\Closure $matching = null): array {
        $rc = $hex->rc;
        return array_filter(
                [
                    $this->maybeHexAt($rc->north()),
                    $this->maybeHexAt($rc->northeast()),
                    $this->maybeHexAt($rc->southeast()),
                    $this->maybeHexAt($rc->south()),
                    $this->maybeHexAt($rc->southwest()),
                    $this->maybeHexAt($rc->northwest()),
                ], function ($nh) use ($matching) {
                    return $nh != null && ($matching === null || $matching($nh));
                }
            );
    }

    /** @return Piece[] */
    private static function initializePool(int $numPlayers): array {
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
        shuffle($available_developments);
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
