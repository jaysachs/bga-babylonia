<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\TableOption;
use Bga\Games\babylonia\ZigguratCardType;

class FinishTurn extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 12,
            type: StateType::GAME,
        );
    }

    function onEnteringState() {
        $player_id = $this->activePlayerId();
        $model = $this->createModel();

        $result = $model->finishTurn();
        if ($result->gameOver()) {
            $this->notify->all(
                "gameEnded",
                clienttranslate('Game has ended'),
                [
                    "player_id" => $player_id,
                    "player_name" => $this->getActivePlayerName(),
                ]
            );
            // TODO: is there a nicer thing to put here?
            return 99;
        }

        $this->notify->player(
            $player_id,
            "handRefilled",
            clienttranslate("You refilled your hand"),
            [
                "player_id" => $player_id,
                'hand' => array_map(
                    function ($p) {
                        return $p->value;
                    },
                    $model->hand()->pieces()
                ),
            ]
        );

        $this->notify->all(
            "turnFinished",
            clienttranslate('${player_name} finished their turn'),
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "hand_size" => $model->hand()->size(),
                "pool_size" => $model->pool()->size(),
            ]
        );

        if ($model->components()->hasUnusedZigguratCard($player_id, ZigguratCardType::EXTRA_TURN)
        ) {
            return SelectExtraTurn::class;
        }

        return NextPlayer::class;
    }
}
