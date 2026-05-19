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

/*
 * We use doubled coordinate representation.
 * (see https://www.redblobgames.com/grids/hexagons/#neighbors)
 */

class Hex
{

    public function __toString(): string
    {
        return sprintf("%s %d %s(%d) %s", $this->terrain->value, $this->rc, $this->piece->value, $this->player_id, $this->scored ? "true" : "false");
    }

    public function __construct(
        public /* readonly */ Terrain $terrain,
        public readonly int $rc,
        public PieceType $piece = PieceType::EMPTY,
        public int $player_id = 0,
        public bool $scored = false
    ) {}

    public function clone(): Hex {
        return new Hex($this->terrain, $this->rc, $this->piece, $this->player_id, $this->scored);
    }

    public function equals(Hex $other): bool
    {
        return $this->terrain == $other->terrain
            && $this->rc == $other->rc
            && $this->piece == $other->piece
            && $this->player_id == $other->player_id
            && $this->scored == $other->scored
            ;
    }

    public function isFree(): bool {
        return $this->piece->isEmpty();
    }

    public function captureCity(): PieceType
    {
        if (!$this->piece->isCity()) {
            throw new \LogicException("attempt to capture a non-city $this");
        }
        $p = $this->piece;
        $this->piece = PieceType::EMPTY;
        return $p;
    }

    public function placeDevelopment(PieceType $development): Hex
    {
        if ($this->piece != PieceType::EMPTY) {
            throw new \LogicException("attempt to place city or field on top of $this");
        }
        if ($this->isWater()) {
            throw new \LogicException("attempt to place city or field on water hex $this");
        }
        if (!$development->isCity() && !$development->isField() && $development != PieceType::ZIGGURAT) {
            throw new \LogicException("attempt to place a non-city or field on $this");
        }
        $this->piece = $development;
        return $this;
    }

    public function remove(): PieceType {
        if ($this->player_id == 0 || !$this->piece->isPlayerPieceType()) {
            throw new \InvalidArgumentException("Cannot remove non-player piece");
        }
        $piece = $this->piece;
        $this->piece = PieceType::EMPTY;
        $this->player_id = 0;
        return $piece;
    }

    public function playPiece(PieceType $piece, int $player_id): PieceType
    {
        if ($player_id == 0) {
            throw new \InvalidArgumentException("playing a piece requires a non-zero player_id");
        }
        if ($this->player_id != 0) {
            throw new \LogicException("attempt to play piece $piece->value to occupied hex $this");
        }
        if ($this->piece != PieceType::EMPTY) {
            if (!$this->piece->isField()) {
                throw new \LogicException("attempt to play piece $piece->value on non-empty non-crop field hex $this");
            }
        }
        if ($this->isWater() && !$piece->isHidden()) {
            throw new \LogicException("attempt to play piece $piece->value unhidden in water hex $this");
        }
        $result = $this->piece;
        $this->piece = $piece;
        $this->player_id = $player_id;
        return $result;
    }

    public function isLand(): bool
    {
        return !$this->isWater();
        // return match ($this->terrain) {
        //     Terrain::NORTH, Terrain::CENTER, Terrain::SOUTH, Terrain::UNKNOWN => true,
        //     default => false
        // };
    }

    public function isWater(): bool
    {
        return $this->terrain == Terrain::RIVER;
    }

    public function isNeighbor(Hex $hex): bool
    {
        $diff = abs($this->rc - $hex->rc);
        return $diff == 200 || $diff == 101 || $diff == 99;
        // Optimized version of:
        //   $cd = abs(RowCol::col($this->rc) - RowCol::col($hex->rc));
        //   $rd = abs(RowCol::row($this->rc) - RowCol::row($hex->rc));
        //   return $cd == 1 && $rd == 1 || $cd == 0 && $rd == 2;
    }
}
