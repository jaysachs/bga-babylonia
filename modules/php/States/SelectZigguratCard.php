<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\RowCol;
use Bga\Games\babylonia\ZigguratCardType;
use Override;

class SelectZigguratCard extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 10,
            type: StateType::ACTIVE_PLAYER,
            description: clienttranslate('${actplayer} must select a ziggurat card'),
            descriptionMyTurn: clienttranslate('${you} must select a ziggurat card'),
            updateGameProgression: true,
        );
    }

    #[Override]
    function getArgs(): array {
        $model = $this->createModel();
        $zcards = $model->components()->availableZigguratCards();
        return [
            "hex" => $this->rowColBeingScored(),
            "available_cards" => array_map(
                function ($z): string {
                    return $z->type->value;
                },
                $model->components()->availableZigguratCards()
            ),
        ];
    }

    #[PossibleAction]
    public function actSelectZigguratCard(int $active_player_id, string $zctype): mixed
    {
        $model = $this->createModel();
        $selection =
            $model->selectZigguratCard(ZigguratCardType::from($zctype));
        $this->notify->all(
            "zigguratCardSelection",
            clienttranslate('${player_name} chose ziggurat card ${zcard}'),
            [
                "player_id" => $active_player_id,
                "player_name" => $this->getActivePlayerName(),
                "zcard" => $selection->card->type->value,
                "cardused" => $selection->card->used,
                "points" => $selection->points,
                "score" => $model->allPlayerInfo()[$active_player_id]->score,
                "hex" => $this->rowColBeingScored(),
            ]
        );
        // FIXME: need to better distinguish unset.
        $this->setRowColBeingScored(new RowCol(0, 0));
        return EndOfTurnScoring::class;
    }

    public function zombie($player_id): mixed {
            $model = $this->createModel();
        $zcards = $model->components()->availableZigguratCards();
        // We could be slightly smarter and grab in order:
        //   10pts, river, hand7?, ...
        $this->shuffle($zcards);
        return $this->actSelectZigguratCard($player_id, $zcards[0]->type->value);
    }
}
