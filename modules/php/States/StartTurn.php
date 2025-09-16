<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;

class StartTurn extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 2,
            type: StateType::GAME,
        );
    }

    function onEnteringState() {
        $activePlayerId = $this->activePlayerId();
        // the code to run when entering the state
        $this->stats->PLAYER_NUMBER_TURNS->inc($activePlayerId);
        $this->giveExtraTime($activePlayerId);
        $this->setPlayerOnTurn($activePlayerId);
        return PlayPieces::class;
    }
}
