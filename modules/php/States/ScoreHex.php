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
use Bga\Games\babylonia\HexWinner;
use Bga\Games\babylonia\Model;
use Bga\Games\babylonia\ScoredCity;

class ScoreHex extends AbstractState
{
    function __construct(Game $game)
    {
        parent::__construct(game: $game, id: 7, type: StateType::GAME);
    }

    private function sendNotify(HexWinner $hexWinner, array $data) {
        $player_id = $hexWinner->captured_by;
        $rc = $hexWinner->hex->rc;
        $piece = $hexWinner->hex->piece;
        $data = array_merge($data, [
            "row" =>  $rc->row,
            "col" => $rc->col,
            "winner_hexes" => $hexWinner->winnerRowCols(),
            "other_hexes" => $hexWinner->othersRowCols(),
            "player_id" => $player_id,
            "city" => $piece->value,
        ]);
        if ($player_id == 0) {
            $msg = clienttranslate('${city} at (${row},${col}) scored, no winner');
        } else {
            $msg = clienttranslate('${city} at (${row},${col}) scored, winner is ${player_name}');
        }
        if ($piece->isZiggurat()) {
            $this->notify->all("zigguratScored", $msg, $data);
        } else {
            $this->notify->all("cityScored", $msg, $data);
        }
    }

    function onEnteringState(int $active_player_id): mixed {
        $model = $this->createModel($active_player_id);
        $rc = $this->ps->rowColBeingScored();
        // TODO: verify it is scoreable in the Model

        if ($model->board()->hexAt($rc)->piece->isZiggurat()) {
            $scored_zig = $model->scoreZiggurat($rc);

            $this->sendNotify($scored_zig, []);

            $winner = $scored_zig->captured_by;
            if ($winner != 0) {
                if ($winner != $active_player_id) {
                    $this->gamestate->changeActivePlayer($winner);
                    $this->giveExtraTime($winner);
                }
                return SelectZigguratCard::class;
            } else {
                return EndOfTurnScoring::class;
            }
        } else {
            $scored_city = $model->scoreCity($rc);

            $this->sendNotify($scored_city->hex_winner, [ "details" => $this->computeCityScoringDetails($model, $scored_city) ]);

            return EndOfTurnScoring::class;
        }
    }

    private function computeCityScoringDetails(Model $model, ScoredCity $scored_city): array {
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
        return $details;
    }
}
