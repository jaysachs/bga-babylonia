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

class Hand
{

    /** @param Piece[] $pieces */
    public function __construct(private array $pieces) {}

    public static function new(int $size = 5): Hand
    {
        $pieces = [];
        for ($i = 0; $i < $size; $i++) {
            $pieces[] = Piece::EMPTY;
        }
        return new Hand($pieces);
    }

    public function extend(int $newsize): void
    {
        if ($newsize <= count($this->pieces)) {
            throw new \InvalidArgumentException("Can't shrink hand from " . $this->size() . " to " . $newsize);
        }
        error_log("extending from " . count($this->pieces) . " to " . $newsize);
        for ($i = count($this->pieces); $i < $newsize; $i++) {
            $this->pieces[] = Piece::EMPTY;
        }
    }

    /** @return Piece[] */
    public function pieces(): array
    {
        return $this->pieces;
    }

    public function limit(): int
    {
        return count($this->pieces);
    }

    public function size(): int
    {
        $x = 0;
        foreach ($this->pieces as $p) {
            if (!$p->isEmpty()) {
                $x++;
            }
        }
        return $x;
    }

    public function contains(Piece $piece): bool
    {
        return in_array($piece, $this->pieces);
    }

    public function play(int $pos): Piece
    {
        $p = $this->pieces[$pos];
        if ($p->isEmpty()) {
            throw new \InvalidArgumentException("Can't play hand piece at empty position $pos");
        }
        $this->pieces[$pos] = Piece::EMPTY;
        return $p;
    }

    public function isEmpty(): bool
    {
        return $this->size() == 0;
    }

    public function replenish(Piece $piece): void
    {
        if (!$piece->isPlayerPiece() || $piece == Piece::HIDDEN) {
            throw new \InvalidArgumentException("Can't add $piece->value to hand");
        }
        for ($i = 0; $i < count($this->pieces); $i++) {
            if ($this->pieces[$i]->isEmpty()) {
                $this->pieces[$i] = $piece;
                return;
            }
        }
        throw new \LogicException("Can't replenish a full hand");
    }
}
