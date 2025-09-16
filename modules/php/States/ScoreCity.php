<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\RowCol;

class ScoreCity extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 7,
            type: StateType::GAME,
        );
    }

    function onEnteringState() : mixed {
        $model = $this->createModel();
        $cityhex = $model->board()->hexAt($this->rowColBeingScored());
        // grab this, as it will change underneath when the model scores it.
        $city = $cityhex->piece->value;
        $scored_city = $model->scoreCity($cityhex->rc);
        $captured_by = $scored_city->hex_winner->captured_by;
        if ($captured_by > 0) {
            $msg = clienttranslate('${city} at (${row},${col}) scored, captured by ${player_name}');
        } else {
            $msg = clienttranslate('${city} at (${row},${col}) scored, uncaptured');
        }
        $capturer_name =
            $captured_by > 0 ? $this->getPlayerNameById($captured_by) : "noone";

        $player_infos = $model->allPlayerInfo();

        $details = [];
        foreach ($player_infos as $pid => $pi) {
            $points = $scored_city->pointsForPlayer($pid);
            $details[$pid] = [
                "player_id" => $pid,
                "player_name" => $this->getPlayerNameById($pid),
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
        $this->setRowColBeingScored(new RowCol(0, 0));

        $this->notify->all(
            "cityScored",
            $msg,
            [
                "city" => $city,
                "row" => $cityhex->rc->row,
                "col" => $cityhex->rc->col,
                "winner_hexes" => $scored_city->hex_winner->winnerRowCols(),
                "other_hexes" => $scored_city->hex_winner->othersRowCols(),
                "player_name" => $capturer_name,
                "player_id" => $captured_by,
                "details" => $details,
            ]
        );
        return EndOfTurnScoring::class;
    }
}
