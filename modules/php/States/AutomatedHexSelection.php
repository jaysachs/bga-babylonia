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

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\Games\babylonia\Game;

class AutomatedHexSelection extends AbstractScoringSelection
{
    function __construct(Game $game)
    {
        parent::__construct(game: $game, id: 6, type: StateType::GAME);
    }

    function onEnteringState(int $active_player_id): mixed
    {
        $model = $this->createModel($active_player_id);
        $rcs = $model->locationsRequiringScoring();
        if (count($rcs) == 0) {
            return FinishTurn::class;
        }
        $rc = array_shift($rcs);
        return $this->selectHex($rc, $active_player_id);
    }
}
