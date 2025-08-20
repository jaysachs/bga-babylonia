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

class RowCol {

    public function __toString(): string {
        return sprintf("%d:%d", $this->row, $this->col);
    }

    public function equals(RowCol $other): bool {
        return $this->row == $other->row && $this->col == $other->col;
    }

    public function __construct(public readonly int $row,
                                public readonly int $col) { }

    public function north(): RowCol {
        return new RowCol($this->row-2, $this->col);
    }

    public function northwest(): RowCol {
        return new RowCol($this->row-1, $this->col-1);
    }

    public function northeast(): RowCol {
        return new RowCol($this->row-1, $this->col+1);
    }

    public function south(): RowCol {
        return new RowCol($this->row+2, $this->col);
    }

    public function southwest(): RowCol {
        return new RowCol($this->row+1, $this->col-1);
    }

    public function southeast(): RowCol {
        return new RowCol($this->row+1, $this->col+1);
    }

    public function isNeighbor(RowCol $rc): bool {
        $cd = abs($this->col - $rc->col);
        $rd = abs($this->row - $rc->row);
        return $cd == 1 && $rd == 1 || $cd == 0 && $rd == 2;
    }

    public function asKey(): int {
        return $this->row * 100000 + $this->col;
    }

    public static function fromKey(int $key): RowCol {
        return new RowCol(intval($key / 100000), $key % 100000);
    }
 }

?>
