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
use Bga\Games\babylonia\ZigguratCardType;

class FinishTurn extends AbstractState
{
    function __construct(Game $game)
    {
        parent::__construct(game: $game, id: 12, type: StateType::GAME, updateGameProgression: true);
    }

    function onEnteringState(int $active_player_id)
    {
        $model = $this->createModel($active_player_id);

        $result = $model->finishTurn();
        if ($result->gameOver()) {
            $this->notify->all(
                "gameEnded",
                clienttranslate('Game has ended'),
                [
                    "player_id" => $active_player_id,
                    "player_name" => $this->getPlayerNamebyId($active_player_id),
                ]
            );
            // TODO: is there a nicer thing to put here?
            return 99;
        }

        $this->notify->player(
            $active_player_id,
            "handRefilled",
            clienttranslate("You refilled your hand"),
            [
                "player_id" => $active_player_id,
                'hand' => array_map(
                    function ($p) {
                        return $p->value;
                    },
                    $model->hand()->pieces()
                ),
            ]
        );

        $this->notify->all(
            "turnFinished",
            clienttranslate('${player_name} finished their turn'),
            [
                "player_id" => $active_player_id,
                "player_name" => $this->getPlayerNameById($active_player_id),
                "hand_size" => $model->hand()->size(),
                "pool_size" => $model->pool()->size(),
            ]
        );

        if ($model->components()->hasUnusedZigguratCard($active_player_id, ZigguratCardType::EXTRA_TURN)) {
            return SelectExtraTurn::class;
        }

        return NextPlayer::class;
    }
}
