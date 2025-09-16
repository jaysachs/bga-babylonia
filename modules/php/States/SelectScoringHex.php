<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\RowCol;

class SelectScoringHex extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 9,
            type: StateType::ACTIVE_PLAYER,
            description: clienttranslate('${actplayer} must select a hex to score'),
            descriptionMyTurn: clienttranslate('${you} must select a hex to score'),
            updateGameProgression: true
        );
    }

    // #[Override]
    public function getArgs(): array
    {
        $model = $this->createModel();
        $rcs = $model->locationsRequiringScoring();
        return ["hexes" => $rcs];
    }

    #[PossibleAction]
    public function actSelectHexToScore(int $active_player_id, int $row, int $col): mixed
    {
        $model = $this->createModel();
        $hex = $model->selectScoringHex(new RowCol($row, $col));
        $msg = clienttranslate('${player_name} chose ${city} at (${row},${col}}) to score');
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

    function zombie(int $playerId): mixed {
            // if a player goes zombie when they are on turn
        // and have surrounded one or more ziggurats / cities.
        // the game cannot progress properly. So choose one
        // randomly.
        $model = $this->createModel();
        $rcs = $model->locationsRequiringScoring();
        if (count($rcs) > 0) {
            $rc = array_shift($rcs);
            return $this->actSelectHexToScore($playerId, $rc->row, $rc->col);
        }
        return EndOfTurnScoring::class;
    }
}
