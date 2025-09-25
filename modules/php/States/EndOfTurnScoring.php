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
use Bga\Games\babylonia\TableOption;

class EndOfTurnScoring extends AbstractState
{
    function __construct(Game $game)
    {
        parent::__construct(game: $game, id: 5, type: StateType::GAME);
    }

    function onEnteringState(int $active_player_id)
    {
        // switch back to player on turn if necessary.
        $player_on_turn = $this->ps->playerOnTurn();
        if ($active_player_id != $player_on_turn) {
            $this->gamestate->changeActivePlayer($player_on_turn);
            $this->giveExtraTime($player_on_turn);
            $active_player_id = $player_on_turn;
        }

        $model = $this->createModel($active_player_id);
        $rcs = $model->locationsRequiringScoring();

        if (count($rcs) == 0) {
            return FinishTurn::class;
        }
        if (count($rcs) == 1) {
            // TODO: is this notif useful/needed?
            // $this->notify->all(
            //     "automatedScoringSingle",
            //     clienttranslate('Single hex requiring scoring selected automatically')
            // );
            return AutomatedHexSelection::class;
        }

        if ($this->optionEnabled(TableOption::AUTOMATED_SCORING_SELECTION)) {
            return AutomatedHexSelection::class;
        }

        $this->notify->all(
            "scoringHexChoice",
            clienttranslate('${player_name} must select a hex to score'),
            [
                "player_name" => $this->getPlayerNameById($active_player_id),
            ]
        );
        return SelectScoringHex::class;
    }
}
