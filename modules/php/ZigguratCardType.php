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

enum ZigguratCardType : string {
    case PLUS_10 = 'zc_10pts';
    case EXTRA_TURN = 'zc_xturn';
    case HAND_SIZE_SEVEN = 'zc_hand7';
    case THREE_NOBLES = 'zc_3nobles';
    case NOBLE_WITH_3_FARMERS = 'zc_3farmers';
    case NOBLES_IN_FIELDS = 'zc_fields';
    case EXTRA_CITY_POINTS = 'zc_citypts';
    case FREE_CENTRAL_LAND_CONNECTS = 'zc_land';
    case FREE_RIVER_CONNECTS = 'zc_river';

    public static function sevenTypes(bool $use_advanced = false) {
        $ziggurats = [
            ZigguratCardType::PLUS_10,
            ZigguratCardType::EXTRA_TURN,
            ZigguratCardType::HAND_SIZE_SEVEN,
            ZigguratCardType::THREE_NOBLES,
            ZigguratCardType::NOBLE_WITH_3_FARMERS,
            ZigguratCardType::NOBLES_IN_FIELDS,
            ZigguratCardType::EXTRA_CITY_POINTS ];
        if ($use_advanced) {
            $ziggurats[] = ZigguratCardType::FREE_CENTRAL_LAND_CONNECTS;
            $ziggurats[] = ZigguratCardType::FREE_RIVER_CONNECTS;
            shuffle($ziggurats);
            array_pop($ziggurats);
            array_pop($ziggurats);
        }
        return $ziggurats;

    }
};

?>
