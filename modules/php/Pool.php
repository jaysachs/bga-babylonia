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

class Pool {

    // straight list of IDs taken
    /** @var int[] */
    private array $taken = [];

    /** @param array<int,Piece> $pieces */
    public function __construct(private array $pieces) { }

    public static function new(): Pool {
        $pieces = [];
        for ($i = 0; $i < 6; $i++) {
            $pieces[] = Piece::PRIEST;
            $pieces[] = Piece::MERCHANT;
            $pieces[] = Piece::SERVANT;
            $pieces[] = Piece::FARMER;
            $pieces[] = Piece::FARMER;
        }
        return new Pool($pieces);
    }

    /** @return Piece[] */
    public function pieces(): array {
        return $this->pieces;
    }

    public function isEmpty(): bool {
        return $this->size() == 0;
    }

    public function size(): int {
        return count($this->pieces);
    }

    public function piecesTaken(): array /* int */ {
        return $this->taken;
    }

    public function take(bool $random = true): Piece {
        $ids = array_keys($this->pieces);
        if ($random) {
            $id = $ids[array_rand($ids)];
        } else {
            $id = array_shift($ids);
        }
        $this->taken[] = $id;
        $result = $this->pieces[$id];
        unset($this->pieces[$id]);
        return $result;
    }
}


?>
