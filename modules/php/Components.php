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

class Components
{
    public static function forNewGame(bool $use_advanced_ziggurats): Components
    {
        $cards = array_map(
            function (ZigguratCardType $z) {
                return new ZigguratCard($z);
            },
            ZigguratCardType::sevenTypes($use_advanced_ziggurats)
        );
        return new Components($cards);
    }


    /** @param ZigguratCard[] $ziggurat_cards */
    public function __construct(private array $ziggurat_cards) {}

    public function getOwnedCard(int $player_id, ZigguratCardType $type): ?ZigguratCard
    {
        foreach ($this->ziggurat_cards as $card) {
            if ($card->type == $type && $player_id == $card->owning_player_id) {
                return $card;
            }
        }
        return null;
    }

    /** @return ZigguratCard[] */
    public function &allZigguratCards(): array
    {
        return $this->ziggurat_cards;
    }

    /** @return ZigguratCard[] */
    public function availableZigguratCards(): array
    {
        return $this->zigguratCardsOwnedBy(0);
    }

    public function hasUnusedZigguratCard(int $player_id, ZigguratCardType $type): bool
    {
        $card = $this->getOwnedCard($player_id, $type);
        if ($card == null) {
            return false;
        }
        return !$card->used;
    }

    public function zigguratCardOwner(ZigguratCardType $type): int /* player_id */
    {
        foreach ($this->ziggurat_cards as $zc) {
            if ($zc->type == $type) {
                return $zc->owning_player_id;
            }
        }
        return 0;
    }

    /** @return ZigguratCard[] */
    public function zigguratCardsOwnedBy(int $player_id): array
    {
        return array_values(
            array_filter(
                $this->ziggurat_cards,
                function (ZigguratCard $z) use ($player_id) {
                    return $z->owning_player_id == $player_id;
                }
            )
        );
    }

    public function takeCard(int $player_id, ZigguratCardType $type): ZigguratCard
    {
        foreach ($this->allZigguratCards() as &$card) {
            if ($card->type == $type) {
                if ($card->owning_player_id != 0) {
                    throw new \InvalidArgumentException("Ziggurat card $type->value is already taken (by $card->owning_player_id).");
                }
                if ($card->used) {
                    throw new \InvalidArgumentException("Ziggurat card $type->value is already used.");
                }
                $card->owning_player_id = $player_id;
                return $card;
            }
        }
        throw new \InvalidArgumentException("Ziggurat card $type->value not found");
    }
}
