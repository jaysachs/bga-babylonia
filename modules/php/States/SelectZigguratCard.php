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
use Bga\Games\babylonia\RowCol;
use Bga\Games\babylonia\ZigguratCardType;
use Bga\Games\babylonia\Utils;

class SelectZigguratCard extends AbstractState
{
    function __construct(Game $game)
    {
        parent::__construct(
            game: $game,
            id: 10,
            type: StateType::ACTIVE_PLAYER,
            description: clienttranslate('${actplayer} must select a ziggurat card'),
            descriptionMyTurn: clienttranslate('${you} must select a ziggurat card'),
        );
    }

    function getArgs(int $active_player_id): array
    {
        $model = $this->createModel($active_player_id);
        $zcards = $model->components()->availableZigguratCards();
        return [
            "hex" => $this->ps->rowColBeingScored(),
            "available_cards" => array_map(
                function ($z): string {
                    return $z->type->value;
                },
                $model->components()->availableZigguratCards()
            ),
        ];
    }

    #[PossibleAction]
    public function actSelectZigguratCard(int $active_player_id, string $zctype): mixed
    {
        $model = $this->createModel($active_player_id);
        $selection =
            $model->selectZigguratCard(ZigguratCardType::from($zctype));
        $this->notify->all(
            "zigguratCardSelection",
            clienttranslate('${player_name} chose ziggurat card ${zcard}'),
            [
                "player_id" => $active_player_id,
                "zcard" => $selection->card->type->value,
                "cardused" => $selection->card->used,
                "points" => $selection->points,
                "score" => $model->allPlayerInfo()[$active_player_id]->score,
                "hex" => $this->ps->rowColBeingScored(),
            ]
        );
        $this->ps->setRowColBeingScored(null);
        return EndOfTurnScoring::class;
    }

    public function zombie($player_id): mixed
    {
        $model = $this->createModel($player_id);
        $zcards = $model->components()->availableZigguratCards();
        // We could be slightly smarter and grab in order:
        //   10pts, river, hand7?, ...
        Utils::shuffle($zcards);
        return $this->actSelectZigguratCard($player_id, $zcards[0]->type->value);
    }
}
