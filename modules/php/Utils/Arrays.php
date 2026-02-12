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

namespace Bga\Games\babylonia\Utils;

class Arrays
{
    /**
     * @template T of null|scalar|\Stringable|array<null|scalar|\Stringable>
     * @param T[] $arr
     */
    public static function arrayToString(array $arr, ?bool $keys = false): string {
        /** @var string[] */
        $arr = array_map(
            /** @param array|scalar|null $k */
            function ($k, $v) use (&$keys) : string {
                $ks = "{$k}";
                $vs = is_array($v) ? self::arrayToString($v, $keys) : "{$v}";
                return $keys ? "{$ks}=>{$vs}" : "{$vs}";
            },
            array_keys($arr),
            array_values($arr));
        return "[" . implode(',', $arr) . "]";
    }

    /**
     * @template T
     * @param array<int,T> $arr
     */
    public static function shuffle(array &$arr): void
    {
        $e = sizeof($arr) - 1;
        for ($i = 0; $i < $e; $i++) {
            // FIXME: not sure why this is needed.
            /** @phpstan-ignore argument.type */
            $j = random_int($i, $e);
            if ($j <> $i) {
                $tmp = $arr[$j];
                $arr[$j] = $arr[$i];
                $arr[$i] = $tmp;
            }
        }
    }

}
