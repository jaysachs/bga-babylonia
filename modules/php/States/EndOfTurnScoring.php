<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\TableOption;

class EndOfTurnScoring extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 5,
            type: StateType::GAME,
        );
    }

    function onEnteringState() {
        // switch back to player on turn if necessary.
        $player_on_turn = $this->playerOnTurn();
        if ($this->activePlayerId() != $player_on_turn) {
            $this->gamestate->changeActivePlayer($player_on_turn);
            $this->giveExtraTime($player_on_turn);
        }

        $model = $this->createModel();
        $rcs = $model->locationsRequiringScoring();

        if (count($rcs) == 0) {
            return FinishTurn::class;
        }
        if (count($rcs) == 1) {
            // TODO: is this notif useful/needed?
            // $this->notify->all(
            //     "automatedScoringSingle",
            //     clienttranslate('Single hex requiring scoring selected automatically')
            // );
            return AutomatedHexSelection::class;
        }

        if ($this->optionEnabled(TableOption::AUTOMATED_SCORING_SELECTION)) {
            return AutomatedHexSelection::class;
        }

        $this->notify->all(
            "scoringHexChoice",
            clienttranslate('${player_name} must select a hex to score'),
            [
                "player_name" => $this->getActivePlayerName(),
            ]
        );
        return SelectScoringHex::class;
    }
}
