<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\TableOption;
use Bga\Games\babylonia\ZigguratCardType;

class SelectExtraTurn extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 11,
            type: StateType::ACTIVE_PLAYER,
            description :clienttranslate('${actplayer} may choose to take another turn'),
            descriptionMyTurn: clienttranslate('${you} must choose whether to take another turn'),
            updateGameProgression: true,
        );
    }

    #[PossibleAction]
    public function actChooseExtraTurn(int $active_player_id, bool $take_extra_turn)
    {
        if ($take_extra_turn) {
            $player_id = $active_player_id;
            $model = $this->createModel();
            $model->useExtraTurnCard();
            $this->notify->all(
                "extraTurnUsed",
                clienttranslate('${player_name} is taking an extra turn'),
                [
                    "player_id" => $player_id,
                    "player_name" => $this->getActivePlayerName(),
                    "card" => ZigguratCardType::EXTRA_TURN->value,
                    "cardused" => true,
                ]
            );
            return StartTurn::class;
        } else {
            $this->activeNextPlayer();
            return StartTurn::class;
        }
    }

    public function zombie(int $player_id): mixed {
        return $this->actChooseExtraTurn($player_id, true);
    }
}
