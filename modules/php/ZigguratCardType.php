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

enum ZigguratCardType : string {
    case PLUS_10 = 'zc_10pts';
    case EXTRA_TURN = 'zc_xturn';
    case HAND_SIZE_7 = 'zc_hand7';
    case NOBLES_3_KINDS = 'zc_3nobles';
    case NOBLE_WITH_3_FARMERS = 'zc_3farmers';
    case NOBLES_IN_FIELDS = 'zc_fields';
    case EXTRA_CITY_POINTS = 'zc_citypts';
    case FREE_CENTER_LAND_CONNECTS = 'zc_land';
    case FREE_RIVER_CONNECTS = 'zc_river';

    public static function sevenTypes(bool $use_advanced = false): array /* ZigguratCardType */ {
        $ziggurats = [
            ZigguratCardType::PLUS_10,
            ZigguratCardType::EXTRA_TURN,
            ZigguratCardType::HAND_SIZE_7,
            ZigguratCardType::NOBLES_3_KINDS,
            ZigguratCardType::NOBLE_WITH_3_FARMERS,
            ZigguratCardType::NOBLES_IN_FIELDS,
            ZigguratCardType::EXTRA_CITY_POINTS ];
        if ($use_advanced) {
            $ziggurats[] = ZigguratCardType::FREE_CENTER_LAND_CONNECTS;
            $ziggurats[] = ZigguratCardType::FREE_RIVER_CONNECTS;
            shuffle($ziggurats);
            array_pop($ziggurats);
            array_pop($ziggurats);
        }
        return $ziggurats;

    }

    public function tooltip(): string {
        return match ($this) {
            ZigguratCardType::PLUS_10 =>
            clienttranslate("Receive 10 points immediately. Next, turn the card face down: you can not use it any longer."),
            ZigguratCardType::EXTRA_TURN =>
            clienttranslate("Play an additional turn at the end of one of your turns (that is, after refilling your Stand). Next, turn the card face down: you can not use it any longer."),
            ZigguratCardType::HAND_SIZE_7 =>
            clienttranslate("From now on you can have 7 Clan Tokens on your Stand instead of 5."),
            ZigguratCardType::NOBLES_3_KINDS =>
            clienttranslate("From now on you can play exactly 3 different Nobles face up instead of any 2 Clan Tokens."),
            ZigguratCardType::NOBLE_WITH_3_FARMERS =>
            clienttranslate("From now on you can also play a Noble face up when you play 3 or more Farmers."),
            ZigguratCardType::NOBLES_IN_FIELDS =>
            clienttranslate("From now on you can place the Nobles in the Crop Fields, even without having one of your Clan Tokens next to those Crop Fields."),
            ZigguratCardType::EXTRA_CITY_POINTS =>
            clienttranslate("From now on, when the Cities are scored, you will receive 1 additional point for every two Cities that you have in front of you."),
            ZigguratCardType::FREE_CENTER_LAND_CONNECTS =>
            clienttranslate("From now on all the free land hexagons of the central area between the 2 rivers serve to connect your Clan Tokens."),
            ZigguratCardType::FREE_RIVER_CONNECTS =>
            clienttranslate("From now on all the free river hexagons serve to connect your Clan Tokens."),
            default => ""
        };
    }
};

?>
