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

class ScoreCity extends AbstractState
{
    function __construct(Game $game)
    {
        parent::__construct(game: $game, id: 7, type: StateType::GAME);
    }

    function onEnteringState(int $active_player_id): mixed
    {
        $model = $this->createModel($active_player_id);
        $cityhex = $model->board()->hexAt($this->ps->rowColBeingScored());
        // grab this, as it will change underneath when the model scores it.
        $city = $cityhex->piece->value;
        $scored_city = $model->scoreCity($cityhex->rc);

        $player_infos = $model->allPlayerInfo();

        $details = [];
        foreach ($player_infos as $pid => $pi) {
            $points = $scored_city->pointsForPlayer($pid);
            $details[$pid] = [
                "player_id" => $pid,
                "captured_city_count" => $pi->captured_city_count,
                "scored_locations" => $scored_city->scoringLocationsForPlayer($pid),
                "network_locations" => $scored_city->networkLocationsForPlayer($pid),
                "network_points" => $scored_city->networkPointsForPlayer($pid),
                "capture_points" => $scored_city->capturePointsForPlayer($pid),
                "score" => $pi->score,
            ];
            if ($points > 0) {
                // TODO: should we notify/log each player's point change?
                // $details[$pid]["message"] =
                //     clienttranslate('${' . $pnk2 . '} scored ${points}');
                // $details[$pid][$pnk] = $this->getPlayerNameById($pid);
            }
        }

        // FIXME: need to better distinguish unset.
        $this->ps->setRowColBeingScored(new RowCol(0, 0));

        $captured_by = $scored_city->hex_winner->captured_by;
        if ($captured_by > 0) {
            $msg = clienttranslate('${city} at (${row},${col}) scored, captured by ${player_name}');
        } else {
            $msg = clienttranslate('${city} at (${row},${col}) scored, uncaptured');
        }
        $this->notify->all(
            "cityScored",
            $msg,
            [
                "city" => $city,
                "row" => $cityhex->rc->row,
                "col" => $cityhex->rc->col,
                "winner_hexes" => $scored_city->hex_winner->winnerRowCols(),
                "other_hexes" => $scored_city->hex_winner->othersRowCols(),
                "player_id" => $captured_by,
                "details" => $details,
            ]
        );
        return EndOfTurnScoring::class;
    }
}
