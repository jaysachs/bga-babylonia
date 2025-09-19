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
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\ZigguratCardType;

class SelectExtraTurn extends AbstractState
{
    function __construct(Game $game)
    {
        parent::__construct(
            game: $game,
            id: 11,
            type: StateType::ACTIVE_PLAYER,
            description: clienttranslate('${actplayer} may choose to take another turn'),
            descriptionMyTurn: clienttranslate('${you} must choose whether to take another turn'),
            updateGameProgression: true,
        );
    }

    #[PossibleAction]
    public function actChooseExtraTurn(int $active_player_id, bool $take_extra_turn)
    {
        if ($take_extra_turn) {
            $model = $this->createModel($active_player_id);
            $model->useExtraTurnCard();
            $this->notify->all(
                "extraTurnUsed",
                clienttranslate('${player_name} is taking an extra turn'),
                [
                    "player_id" => $active_player_id,
                    "player_name" => $this->getPlayerNameById($active_player_id),
                    "card" => ZigguratCardType::EXTRA_TURN->value,
                    "cardused" => true,
                ]
            );
            return StartTurn::class;
        } else {
            return NextPlayer::class;
        }
    }

    public function zombie(int $player_id): mixed
    {
        return $this->actChooseExtraTurn($player_id, true);
    }
}
