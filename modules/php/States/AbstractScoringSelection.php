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
use Bga\Games\babylonia\RowCol;

abstract class AbstractScoringSelection extends AbstractState
{

    protected function __construct(
        Game $game,
        int $id,
        StateType $type,
        ?string $description = '',
        ?string $descriptionMyTurn = '',
    ) {
        parent::__construct(
            game: $game,
            id: $id,
            type: $type,
            description: $description,
            descriptionMyTurn: $descriptionMyTurn
        );
    }

    protected function selectHex(RowCol $rc, int $active_player_id): mixed
    {
        $model = $this->createModel($active_player_id);
        $hex = $model->selectScoringHex($rc);
        $msg = clienttranslate('${city} at (${row},${col}) is selected to be scored');
        $this->notify->all(
            "scoringSelection",
            $msg,
            [
                "player_id" => $active_player_id,
                "row" => $hex->rc->row,
                "col" => $hex->rc->col,
                "city" => $hex->piece->value,
            ]
        );
        $this->ps->setRowColBeingScored($hex->rc);
        if ($hex->piece->isCity()) {
            return ScoreCity::class;
        } else if ($hex->piece->isZiggurat()) {
            return ScoreZiggurat::class;
        }
        // TODO: throw exception
        return null; // PlayerSelectScoringHex::class
    }
}
