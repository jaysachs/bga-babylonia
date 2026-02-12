<?php

/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * Zooloretto implementation : © Jay Sachs <vagabond@covariant.org>
 *
 * Copyright 2025 Jay Sachs <vagabond@covariant.org>
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

class LogDecorator {

    /** @param \Closure(int):string $nameMapper  */
    public function __construct(private \Closure $nameMapper) {}

    /**
     * @param array<string,string|int|list<string>> $args
     * @return array<string,string|int|list<string>>
     */
	public function playerNames(string $message, array $args): array {
        foreach (["", "1", "2", "3", "4", "5"] as $suffix) {
            $pid = "player_id{$suffix}";
            $pnm = "player_name{$suffix}";
            if (isset($args[$pid])) {
                if (!isset($args[$pnm]) && str_contains($message, "\${{$pnm}}")) {
                    $args[$pnm] = ($this->nameMapper)(intval($args[$pid]));
                    if (!isset($args['i18n'])) {
                        $args['i18n'] = [];
                    }
                    // FIXME: not sure why this is needed.
                    /** @phpstan-ignore offsetAccess.nonOffsetAccessible */
                    $args['i18n'][] = $pnm;
                }
            }
        }
        return $args;
    }
}
