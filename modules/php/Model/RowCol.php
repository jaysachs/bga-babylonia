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

/**
 * We use double coordinate representation for rows/columns in the hexgrid.
 * See https://www.redblobgames.com/grids/hexagons/#coordinates
 *
 * However, for efficiency (particurly keeping payload size down, but it also keeps
 * server side lean), we use a single int to pack the row col into.
 * Hex "rowcol" = 100 * row + col
 */
class RowCol
{
    public static function north(int $rc): int {
        return $rc - 200;
    }

    public static function northwest(int $rc): int {
        return $rc - 101;
    }

    public static function northeast(int $rc): int {
        return $rc - 99;
    }

    public static function south(int $rc): int {
        return $rc + 200;
    }

    public static function southwest(int $rc): int {
        return $rc + 99;
    }

    public static function southeast(int $rc): int {
        return $rc + 101;
    }

    public static function row(int $rc): int {
        return intval($rc / 100);
    }

    public static function col(int $rc): int {
        return intval($rc % 100);
    }

    public static function fromRowCol(int $row, int $col): int {
        return $row * 100 + $col;
    }

}
