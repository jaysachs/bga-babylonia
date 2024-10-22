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

/*
 * We use doubled coordinate representation.
 * (see https://www.redblobgames.com/grids/hexagons/#neighbors)
 */
class Hex {

    public function __toString(): string {
        return sprintf("%s %d:%d %s", $this->type->value, $this->row, $this->col, $this->piece->value);
    }

    public function __construct(public HexType $type,
                                public int $row,
                                public int $col,
                                public Piece $piece = Piece::EMPTY,
                                public int $player_id = 0,
                                public bool $scored = false) {
    }

    public function placeFeature(Piece $feature) {
        if ($this->piece != Piece::EMPTY) {
            throw new \LogicException("attempt to place city or field on top of $this");
        }
        if ($this->isWater()) {
            throw new \LogicException("attempt to place city or field on water hex $this");
        }
        if (!$feature->isCity() && !$feature->isField() && $feature != Piece::ZIGGURAT) {
            throw new \LogicException("attempt to place a non-city or field on $this");
        }
        $this->piece = $feature;
    }

    public function playPiece(Piece $piece, int $player_id) {
        if ($player_id == 0) {
            throw new \InvalidArgumentException("playing a piece requires a non-zero player_id");
        }
        if ($this->player_id != 0) {
            throw new \LogicException("attempt to play piece $p to occupied hex $this");
        }
        if ($this->piece != Piece::EMPTY) {
            if (!$this->piece.isField()) {
                throw new \LogicException("attempt to play a piece $p on non-empty non-crop field hex $this");
            }
        }
        if ($this->isWater()) {
            $this->piece = Piece::SECRET;
        } else {
            $this->piece = $piece;
        }
        $this->player_id = $player_id;
    }

    public function isLand(): bool {
        return $this->type == HexType::LAND;
    }

    public function isWater(): bool {
        return $this->type == HexType::WATER;
    }

    public static function land(int $row, int $col):Hex {
        return new Hex(HexType::LAND, $row, $col);
    }

    public static function water(int $row, int $col): Hex {
        return new Hex(HexType::WATER, $row, $col);
    }

    public static function ziggurat(int $row, int $col): Hex {
        return new Hex(HexType::LAND, $row, $col, Piece::ZIGGURAT);
    }

    public static function fromDbResult(array &$dbresult): Hex {
        $row = intval($dbresult['row']);
        $col = intval($dbresult['col']);
        $piece = Piece::from($dbresult['piece']);
        $type = HexType::from($dbresult['hextype']);
        $player_id = intval($dbresult['board_player']);
        return new Hex($type, $row, $col, $piece, $player_id);
    }

}

?>
