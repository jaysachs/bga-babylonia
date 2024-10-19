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

enum ZigguratCard : string {
    case PLUS_10 = 'zcard1';
    case EXTRA_TURN = 'zcard2';
    case SEVEN_TOKENS = 'zcard3';
    case THREE_NOBLES = 'zcard4';
    case NOBLE_WITH_3_FARMERS = 'zcard5';
    case NOBLES_IN_FIELDS = 'zcard6';
    case EXTRA_CITY_POINTS = 'zcard7';
    case FREE_CENTRAL_LAND_CONNECTS = 'zcard8';
    case FREE_RIVER_CONNECTS = 'zcard9';
};

?>
