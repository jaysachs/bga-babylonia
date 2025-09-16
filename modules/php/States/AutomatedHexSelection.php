<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\RowCol;
use Bga\Games\babylonia\TableOption;

class AutomatedHexSelection extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 6,
            type: StateType::GAME
        );
    }

    function onEnteringState() {
        $model = $this->createModel();
        $rcs = $model->locationsRequiringScoring();
        if (count($rcs) == 0) {
            $this->gamestate->nextState("done");
            return;
        }
        $rc = array_shift($rcs);

        $hex = $model->selectScoringHex($rc);
        $row = $rc->row;
        $col = $rc->col;
        $msg = clienttranslate('${city} at (${row},${col}) is selected to be scored');
        $this->notify->all(
            "scoringSelection",
            $msg,
            [
                "player_id" => $this->activePlayerId(),
                "player_name" => $this->getActivePlayerName(),
                "row" => $hex->rc->row,
                "col" => $hex->rc->col,
                "city" => $hex->piece->value,
            ]
        );
        $this->setRowColBeingScored($hex->rc);
        if ($hex->piece->isCity()) {
            return ScoreCity::class;
        } else if ($hex->piece->isZiggurat()) {
            return ScoreZiggurat::class;
        }
        // TODO: throw exception
        return null; // PlayerSelectScoringHex::class
    }
}
