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

class Components {
    public static function forNewGame(bool $use_advanced_ziggurats) {
        $cards = array_map(
            function ($z) { return new ZigguratCard($z); },
            ZigguratCardType::sevenTypes($use_advanced_ziggurats)
        );
        return new Components($cards);
    }

    public function __construct(private array /* ZigguratCards */ $ziggurat_cards) {
    }

    public function &allZigguratCards(): array /* ZigguratCard */ {
        return $this->ziggurat_cards;
    }

    public function availableZigguratCards(): array /* ZigguratCard */ {
        return array_values(
            array_filter($this->ziggurat_cards,
                         function ($z) { return $z->owning_player_id == 0; }
            )
        );
    }

    public function zigguratCardsOwnedBy(int $player_id): array /* ZigguratCard */ {
        return array_values(
            array_filter(
                $this->ziggurat_cards,
                function ($z) { return $z->owning_player_id == $player_id; }
            )
        );
    }
}
?>
