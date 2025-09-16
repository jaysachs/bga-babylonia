<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\RowCol;

class ScoreZiggurat extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 8,
            type: StateType::GAME,
        );
    }

    function onEnteringState() : mixed {
        $model = $this->createModel();
        $zighex = $model->board()->hexAt($this->rowColBeingScored());

        $scored_zig = $model->scoreZiggurat($zighex->rc);
        $winner = $scored_zig->captured_by;
        if ($winner == 0) {
            $winner_name = 'noone';
            $msg = clienttranslate('${city} at (${row},${col}) scored, no winner');
        } else {
            $winner_name = $this->getPlayerNameById($winner);
            $msg = clienttranslate('${city} at (${row},${col}) scored, winner is ${player_name}');
        }
        $this->notify->all(
            "zigguratScored",
            $msg,
            [
                "row" => $zighex->rc->row,
                "col" => $zighex->rc->col,
                "winner_hexes" => $scored_zig->winnerRowCols(),
                "other_hexes" => $scored_zig->othersRowCols(),
                "player_name" => $winner_name,
                "player_id" => $winner,
                "city" => "ziggurat",
            ]
        );

        if ($winner != 0) {
            if ($winner != $this->activePlayerId()) {
                $this->gamestate->changeActivePlayer($winner);
                $this->giveExtraTime($winner);
            }
            return SelectZigguratCard::class;
        } else {
            return EndOfTurnScoring::class;
        }
    }
}
