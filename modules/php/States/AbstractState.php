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
use Bga\GameFramework\States\GameState;
use Bga\Games\babylonia\DefaultDb;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\Model;
use Bga\Games\babylonia\PersistentStore;
use Bga\Games\babylonia\Stats;
use Bga\Games\babylonia\TableOption;

abstract class AbstractState extends GameState
{
    protected PersistentStore $ps;
    protected Stats $stats;

    function __construct(
        private Game $game,
        int $id,
        StateType $type,
        ?string $description = '',
        ?string $descriptionMyTurn = '',
        bool $updateGameProgression = false
    ) {
        parent::__construct(
            game: $game,
            id: $id,
            type: $type,
            name: null,
            description: $description,
            descriptionMyTurn: $descriptionMyTurn,
            updateGameProgression: $updateGameProgression);
        $this->ps = new PersistentStore(new DefaultDb(), $this->globals);
        $this->stats = Stats::createForGame($game);
    }

    protected function createModel(int $player_id): Model {
        return new Model($this->ps, $this->stats, $player_id);
    }

    protected function optionEnabled(TableOption $option): bool
    {
        return $this->game->optionEnabled($option);
    }

    protected function getPlayerNameById(int $player_id): string {
        return $this->game->getPlayerNameById($player_id);
    }

    protected function giveExtraTime(int $player_id, ?int $specificTime = null): void {
        $this->game->giveExtraTime($player_id, $specificTime);
    }

    protected function activeNextPlayer(): void {
        $this->game->activeNextPlayer();
    }
}
