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

    public static function forPlayerCount(int $numPlayers): Board {
        if ($numPlayers < 2 || $numPlayers > 4) {
            throw new \InvalidArgumentException(sprintf("invalid number of players: %s", $numPlayers));
        }
        $empty = [];
        $board = new Board($empty);
        $lines = explode("\n", Board::MAP);
        $row = 0;
        $cityfarms = [];
        foreach ($lines as &$s) {
            $col = ($row & 1) ? 1 : 0;
            foreach (str_split($s) as $ch) {
                switch ($ch) {
                case ' ':
                    $col -= 2;
                    break;
                case '.':
                    break;
                case '_':
                    $board->addHex(Hex::land($row, $col));
                    break;
                case 'C':
                    $board->addHex(Hex::land($row, $col));
                    $cityfarms[] = [ $row, $col ];
                    break;
                case '!':
                    $board->addHex(Hex::ziggurat($row, $col));
                    break;
                case '=':
                    $board->addHex(Hex::water($row, $col));
                    break;
                }
                $col += 2;
            }
            $row++;
        }

        switch ($numPlayers) {
        case 2:
            $board->removeLandmassAt(18, 16);
            break;
        case 3:
            $board->removeLandmassAt(2, 0);
        }

        $pool = self::initializePool($numPlayers);
        $board->placeCitiesAndFarms($pool, $cityfarms);
        if (count($pool) != 0) {
            throw new \LogicException("placed all cities and farms but tiles leftover");
        }
        return $board;
    }

    private function placeCitiesAndFarms(array &$pool, array &$cityfarms) {
        foreach ($cityfarms as $rc) {
            $hex = $this->hexAt($rc[0], $rc[1]);
            if ($hex != null) {
                $x = array_pop($pool);
                $hex->placeFeature($x);
            }
        }
    }

    public function visitAll(\Closure $visit) {
        foreach ($this->hexes as &$hexrow) {
            foreach ($hexrow as &$hex) {
                $visit($hex);
            }
        }
    }

    public static function fromDbResult($dbresults): Board {
        $hexes = [];
        $board = new Board($hexes);
        foreach ($dbresults as &$result) {
            $row = intval($result['row']);
            $col = intval($result['col']);

            $hex = null;
            $type = HexType::from($result['hextype']);
            switch ($type) {
            case HexType::LAND :
                $hex = Hex::land($row, $col);
                break;
            case HexType::WATER :
                $hex = Hex::water($row, $col);
                break;
            default:
                throw new \LogicException("Unexpected hextype $type");
            }
            $board->addHex($hex);
            $ps = $result['piece'];
            if ($ps != null) {
                $p = Piece::from($ps);
                if ($p->isPlayerPiece()) {
                    $hex->playPiece($p, intval($result['board_player']));
                } else {
                    $hex->placeFeature($p);
                }
            }
        }
        return $board;
    }

    public function __construct(private array &$hexes) {}

    /* visit should return true if continue exploring */
    private function bfs(int $start_row, int $start_col, \Closure $visit) {
        $seen = [];
        $queue = [ $this->hexAt($start_row, $start_col) ];
        while ($queue) {
            $hex = array_pop($queue);
            $seen[] = $hex;
            if ($visit($hex)) {
                $nb = $this->neighbors($hex, $visit);
                foreach ($nb as $n) {
                    if (!array_search($n, $seen)) {
                        $queue[] = $n;
                    }
                }
            }
        }
    }

    private function removeLandmassAt(int $start_row, int $start_col) {
        $this->bfs(
            $start_row,
            $start_col,
            function(&$hex) {
                if ($hex->type == HexType::LAND) {
                  $hexrow = &$this->hexes[$hex->row];
                  unset($hexrow[$hex->col]);
                  return true;
                }
                return false;
            }
        );
    }

    public function adjacentZiggurats(string $player_id): int {
        $adjacent = 0;
        foreach ($this->hexes as &$hex) {
            if ($hex->piece == Piece::ZIGGURAT) {
                $nb = $this->neighbors($hex, function(&$nh) use ($player_id) {
                    return $nh->piece->isPlayerPiece() && $nh->piece->player_id == $player_id;
                });
                if (count($nb) > 0) {
                    $adjacent++;
                }
            }
        }
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

    private static function initializePool(int $numPlayers) {
        // set up city pool
        $pool = array();
        for ($i = 0; $i < 2; $i++) {
            $pool[] = Piece::CITY_P;
            $pool[] = Piece::CITY_S;
            $pool[] = Piece::CITY_M;
            $pool[] = Piece::CITY_SP;
            $pool[] = Piece::CITY_MS;
            $pool[] = Piece::CITY_MP;
        }
        for ($i = 0; $i < 3; $i++) {
            $pool[] = Piece::FARM_CITIES;
        }
        $pool[] = Piece::FARM_5;
        $pool[] = Piece::FARM_6;
        $pool[] = Piece::FARM_7;
        if ($numPlayers > 2) {
            $pool[] = Piece::CITY_SP;
            $pool[] = Piece::CITY_MS;
            $pool[] = Piece::CITY_MP;
            $pool[] = Piece::CITY_MSP;
            $pool[] = Piece::FARM_5;
            $pool[] = Piece::FARM_6;
            $pool[] = Piece::FARM_7;
            $pool[] = Piece::FARM_CITIES;
        }
        if ($numPlayers > 3) {
            $pool[] = Piece::CITY_P;
            $pool[] = Piece::CITY_S;
            $pool[] = Piece::CITY_M;
            for ($i = 0; $i < 3; $i++) {
                $pool[] = Piece::FARM_CITIES;
            }
        }
        shuffle($pool);
        return $pool;
    }
}

?>
