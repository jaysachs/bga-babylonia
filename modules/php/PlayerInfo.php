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

// Ziggurat tiles could continue to live here, maybe?
class PlayerInfo {
    public int $captured_city_count = 0;
    public array $ziggurat_cards = array(); /* ZigguratCard */
    public int $score = 0;
    public int $id = 0;

    public static function newPlayerInfo($pid) {
        $p = new PlayerInfo();
        return $p;
    }

    public static function fromDbResults(int $player_id, array $ziggurat_data, array $player_data): PlayerInfo {
        $p = new PlayerInfo();
        $p->id = $player_id;
        foreach ($ziggurat_data as $zd) {
            $p->ziggurat_cards[] = ZigguratCard::from($zd);
        }
        $p->captured_city_count = intval($player_data['captured_city_count']);
        $p->score = intval($player_data['score']);
        return $p;
    }

    public function hasZigguratCard(ZigguratCard $type): bool {
        return in_array($type, $this->ziggurat_cards);
    }
}

?>
