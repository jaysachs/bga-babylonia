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
        return sprintf("%s %d:%d %s", $this->type->value, $this->row, $this->col, $this->piece);
    }

    public function __construct(public HexType $type,
                                public int $row,
                                public int $col,
                                public Piece|null $piece,
                                public int $player_id = 0,
                                public bool $scored = false) {
    }

    public function isPlayable(): bool {
        return $this->piece == null || $this->piece->isFarm();
    }

    public function placeFeature(Piece $feature) {
        if ($this->type == HexType::WATER) {
            throw new \LogicException("attempt to place city or farm on water");
        }
        if ($this->piece != null) {
            throw new \LogicException("attempt to place city or farm where it is not expected");
        }
        if (!$feature->isCity() && !$feature->isFarm() && $feature != Piece::ZIGGURAT) {
            throw new \LogicException("attempt to place a non-city or farm");
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
        if ($this->piece != null) {
            if (!$this->piece.isFarm()) {
                throw new \LogicException("attempt to play a piece $p on non-empty non-crop field hex $this");
            }
        }
        if ($this->type == HexType::WATER) {
            $this->piece = Piece::SECRET;
        } else {
            $this->piece = $piece;
        }
        $this->player_id = $player_id;
    }

    public static function land(int $row, int $col):Hex {
        return new Hex(HexType::LAND, $row, $col, null);
    }

    public static function water(int $row, int $col): Hex {
        return new Hex(HexType::WATER, $row, $col, null);
    }

    public static function ziggurat(int $row, int $col): Hex {
        return new Hex(HexType::LAND, $row, $col, Piece::ZIGGURAT);
    }

}

?>
