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

namespace Bga\Games\babylonia\Model;

class Board
{

    private function __construct() {}

    // key is int-ified RowCol
    /** @var array<int,Hex> */
    private array $hexes = [];

    private function addHex(Hex $hex): void
    {
        $this->hexes[$hex->rc] = $hex;
    }

    public function hexAt(int $rc): Hex
    {
        $hex = $this->maybeHexAt($rc);
        if ($hex != null) {
            return $hex;
        }
        throw new \InvalidArgumentException("No hex at $rc");
    }

    /** @phpstan-ignore return.unusedType */
    private function maybeHexAt(int $rc): ?Hex
    {
        if (!isset($this->hexes[$rc])) {
            return null;
        }
        return $this->hexes[$rc];
    }

    public function asTestMap(): string
    {
        $lines = [];
        $row = -1;
        $col = -2;
        $this->visitAll(function (Hex $hex) use (&$row, &$col, &$lines): void {
            if (RowCol::row($hex->rc) != $row) {
                $lines[] = [];
                $row = RowCol::row($hex->rc);
                $col = -2;
                if ($row & 1) {
                    $col = -1;
                }
            }
            $z = count($lines) - 1;
            for ($i = $col + 2; $i < RowCol::col($hex->rc); $i += 2) {
                $lines[$z][] = 'XXX';
            }
            $col = RowCol::col($hex->rc);

            $r = match ($hex->piece) {
                PieceType::EMPTY => match ($hex->terrain) {
                    Terrain::NORTH => '---',
                    Terrain::CENTER => '---',
                    Terrain::SOUTH => '---',
                    Terrain::RIVER => '≈≈≈',
                    // FIXME
                    Terrain::UNKNOWN => '!!!',
                },
                PieceType::CITY_P => 'C.P',
                PieceType::CITY_S => 'C.S',
                PieceType::CITY_M => 'C.M',
                PieceType::CITY_SP => 'CSP',
                PieceType::CITY_MS => 'CMS',
                PieceType::CITY_MP => 'CMP',
                PieceType::CITY_MSP => 'C**',
                PieceType::FIELD_5 => 'F.5',
                PieceType::FIELD_6 => 'F.6',
                PieceType::FIELD_7 => 'F.7',
                PieceType::FIELD_CITIES => 'F.C',
                PieceType::ZIGGURAT => 'ZZZ',
                PieceType::MERCHANT => 'm-' . $hex->player_id,
                PieceType::PRIEST => 'p-' . $hex->player_id,
                PieceType::FARMER => 'f-' . $hex->player_id,
                PieceType::SERVANT => 's-' . $hex->player_id,
                PieceType::HIDDEN => 'h-' . $hex->player_id,
            };
            $lines[$z][] = $r;
        });

        $x = '';
        $row = 0;
        foreach ($lines as $line) {
            if ($row++ & 1) {
                $x .= '   ';
            }
            $x .= implode('   ', $line) . "\n";
        }
        return $x;
    }

    public static function fromTestMap(string $map): Board
    {
        $dev_locs = [];
        return self::fromMap($map, $dev_locs, Terrain::CENTER);
    }

    /** @param int[] $dev_locs */
    private static function fromMap(string $map, array &$dev_locs, Terrain $terrain): Board
    {
        $board = new Board();
        $lines = explode("\n", trim($map));
        $row = 0;

        // convenience utility function
        $play = function (Hex $hex, PieceType $piece, string $playerMatch) use (&$board): void {
            $board->addHex($hex);
            $hex->playPiece($piece, intval($playerMatch));
        };

        $land = function(int $rc) use (&$terrain): Hex { return new Hex($terrain, $rc); };

        foreach ($lines as &$s) {
            $col = ($row & 1) ? 1 : 0;
            $fields = preg_split("/\s+/", trim($s));
            if ($fields === false) {
                continue;
            }
            foreach ($fields as $t) {
                $rc = RowCol::fromRowCol($row, $col);
                $m = [];
                if ($t == "XXX") {
                    // nothing, unplayable hex
                } else if (preg_match('/^m-([0-9])$/', $t, $m)) {
                    $play($land($rc), PieceType::MERCHANT, $m[1]);
                } else if (preg_match('/^s-([0-9])$/', $t, $m)) {
                    $play($land($rc), PieceType::SERVANT, $m[1]);
                } else if (preg_match('/^f-([0-9])$/', $t, $m)) {
                    $play($land($rc), PieceType::FARMER, $m[1]);
                } else if (preg_match('/^h-([0-9])$/', $t, $m)) {
                    $play($land($rc), PieceType::HIDDEN, $m[1]);
                } else if (preg_match('/^p-([0-9])$/', $t, $m)) {
                    $play($land($rc), PieceType::PRIEST, $m[1]);
                } else if ($t == "---") {
                    $board->addHex($land($rc));
                } else if ($t == "≈≈≈" || $t == '===') {
                    $board->addHex(new Hex(Terrain::RIVER, $rc));
                } else if ($t == "ZZZ") {
                    $board->addHex(new Hex(Terrain::UNKNOWN, $rc, PieceType::ZIGGURAT));
                } else if ($t == "CCC") {
                    $board->addHex($land($rc));
                    $dev_locs[] = $rc;
                } else if ($t == "C.P") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::CITY_P)
                    );
                } else if ($t == "C.S") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::CITY_S)
                    );
                } else if ($t == "C.M") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::CITY_M)
                    );
                } else if ($t == "CSP") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::CITY_SP)
                    );
                } else if ($t == "CMS") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::CITY_MS)
                    );
                } else if ($t == "CMP") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::CITY_MP)
                    );
                } else if ($t == "C**") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::CITY_MSP)
                    );
                } else if ($t == "F.5") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::FIELD_5)
                    );
                } else if ($t == "F.6") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::FIELD_6)
                    );
                } else if ($t == "F.7") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::FIELD_7)
                    );
                } else if ($t == "F.C") {
                    $board->addHex(
                        $land($rc)->placeDevelopment(PieceType::FIELD_CITIES)
                    );
                } else {
                    throw new \InvalidArgumentException("Unexpected string in board map: '$t' in '$s'");
                }
                $col += 2;
            }
            $row++;
        }
        return $board;
    }

    const ACTUAL_MAP = <<<'END'
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

    public static function forPlayerCount(int $numPlayers): Board
    {
        if ($numPlayers < 2 || $numPlayers > 4) {
            throw new \InvalidArgumentException(sprintf("invalid number of players: %s", $numPlayers));
        }

        /** @var int[] */
        $development_locations = [];
        $board = Board::fromMap(Board::ACTUAL_MAP, $development_locations, Terrain::UNKNOWN);
        $board->markLandmass(Terrain::CENTER, RowCol::fromRowCol(5, 7));
        $board->markLandmass(Terrain::SOUTH, RowCol::fromRowCol(18, 16));
        $board->markLandmass(Terrain::NORTH, RowCol::fromRowCol(2, 0));

        switch ($numPlayers) {
            case 2:
                $board->removeLandmass(Terrain::SOUTH, $development_locations);
                break;
            case 3:
                $board->removeLandmass(Terrain::NORTH, $development_locations);
        }

        $available_developments = self::initializePool($numPlayers);
        $board->placeDevelopments($available_developments, $development_locations);
        if (count($available_developments) != 0) {
            throw new \LogicException("placed all cities and fields but developments leftover");
        }
        return $board;
    }

    /**
     * @param PieceType[] $available_developments
     * @param int[] $development_locations
     */
    private function placeDevelopments(
        array &$available_developments,
        array &$development_locations
    ): void {
        foreach ($development_locations as $rc) {
            $hex = $this->hexAt($rc);
            $x = array_shift($available_developments);
            if ($x == null) {
                throw new \LogicException("insufficient available developments");
            }
            $hex->placeDevelopment($x);
        }
    }

    public function cityCount(): int
    {
        $city_count = 0;
        $this->visitAll(function (Hex $hex) use (&$city_count): void {
            if ($hex->piece->isCity()) {
                $city_count++;
            }
        });
        return $city_count;
    }

    public function visitAll(\Closure $visit): void
    {
        foreach ($this->hexes as $hex) {
            $visit($hex);
        }
    }

    /** @param Hex[] $hexes */
    public static function fromHexes(array &$hexes): Board
    {
        $board = new Board();
        foreach ($hexes as $hex) {
            $board->addHex($hex);
        }
        return $board;
    }

    /* visit should return true if continue exploring */
    public function bfs(int $start, \Closure $visit): void
    {
        $seen = [];
        $queue = [$this->hexAt($start)];
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

    private function markLandmass(Terrain $terrain, int $start): void
    {
        $this->bfs(
            $start,
            function (Hex $hex) use ($terrain) {
                if ($hex->isLand()) {
                    if ($hex->terrain == Terrain::UNKNOWN) {
                        // $this->hexes[$hex->rc] = new Hex($terrain, $hex->rc, $hex->piece, $hex->player_id, $hex->scored);
                        $hex->terrain = $terrain;
                    }
                    return true;
                }
                return false;
            }
        );
    }

    /** @param int[] $development_locations */
    private function removeLandmass(Terrain $terrain, array &$development_locations): void
    {
        foreach ($this->hexes as $hex) {
            if ($hex->terrain == $terrain) {
                unset($this->hexes[$hex->rc]);
                $v = array_search($hex->rc, $development_locations);
                if ($v !== false) {
                    array_splice($development_locations, intval($v), 1);
                }
            }
        }
    }

    /** @return int[] */
    public function touchedZiggurats(int $player_id): array
    {
        $adjacent = [];
        $this->visitAll(function (Hex $hex) use ($player_id, &$adjacent): void {
            if ($hex->piece == PieceType::ZIGGURAT) {
                $nb = $this->neighbors($hex, function (Hex $nh) use ($player_id): bool {
                    return $nh->player_id == $player_id;
                });
                if (count($nb) > 0) {
                    $adjacent[] = $hex->rc;
                }
            }
        });
        return $adjacent;
    }

    /**
     * @return array<int, Hex>
     */
    public function neighbors(Hex $hex, ?\Closure $matching = null): array
    {
        $rc = $hex->rc;
        return array_filter(
            [
                $this->maybeHexAt(RowCol::north($rc)),
                $this->maybeHexAt(RowCol::northeast($rc)),
                $this->maybeHexAt(RowCol::southeast($rc)),
                $this->maybeHexAt(RowCol::south($rc)),
                $this->maybeHexAt(RowCol::southwest($rc)),
                $this->maybeHexAt(RowCol::northwest($rc)),
            ],
            function ($nh) use ($matching) {
                return $nh != null && ($matching === null || $matching($nh));
            }
        );
    }

    /** @return PieceType[] */
    private static function initializePool(int $numPlayers): array
    {
        $available_developments = array();
        for ($i = 0; $i < 2; $i++) {
            $available_developments[] = PieceType::CITY_P;
            $available_developments[] = PieceType::CITY_S;
            $available_developments[] = PieceType::CITY_M;
            $available_developments[] = PieceType::CITY_SP;
            $available_developments[] = PieceType::CITY_MS;
            $available_developments[] = PieceType::CITY_MP;
        }
        for ($i = 0; $i < 3; $i++) {
            $available_developments[] = PieceType::FIELD_CITIES;
        }
        $available_developments[] = PieceType::FIELD_5;
        $available_developments[] = PieceType::FIELD_6;
        $available_developments[] = PieceType::FIELD_7;
        if ($numPlayers > 2) {
            $available_developments[] = PieceType::CITY_SP;
            $available_developments[] = PieceType::CITY_MS;
            $available_developments[] = PieceType::CITY_MP;
            $available_developments[] = PieceType::CITY_MSP;
            $available_developments[] = PieceType::FIELD_5;
            $available_developments[] = PieceType::FIELD_6;
            $available_developments[] = PieceType::FIELD_7;
            $available_developments[] = PieceType::FIELD_CITIES;
        }
        if ($numPlayers > 3) {
            $available_developments[] = PieceType::CITY_P;
            $available_developments[] = PieceType::CITY_S;
            $available_developments[] = PieceType::CITY_M;
            for ($i = 0; $i < 3; $i++) {
                $available_developments[] = PieceType::FIELD_CITIES;
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
