<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\TableOption;
use Bga\Games\babylonia\ZigguratCardType;

class NextPlayer extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 4,
            type: StateType::GAME,
        );
    }

    function onEnteringState() : mixed {
        $this->activeNextPlayer();
        return StartTurn::class;
    }
}
