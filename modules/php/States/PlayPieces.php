<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\Hex;
use Bga\Games\babylonia\RowCol;
use Override;

class PlayPieces extends AbstractState
{
    function __construct(
        Game $game,
    ) {
        parent::__construct(
            game: $game,
            id: 3,
            type: StateType::ACTIVE_PLAYER,
            description: clienttranslate('${actplayer} is playing pieces'),
            descriptionMyTurn: clienttranslate('${you} may play a piece or end the turn'),
        );
    }

    #[Override]
    public function getArgs(): array
    {
        $model = $this->createModel();

        return [
            "allowedMoves" => $model->getAllowedMoves(),
            "canEndTurn" => $model->canEndTurn(),
            "canUndo" => $model->canUndo(),
        ];
    }

    #[PossibleAction]
    public function actPlayPiece(int $active_player_id, int $handpos, int $row, int $col): mixed
    {
        $model = $this->createModel();
        $move = $model->playPiece($handpos, new RowCol($row, $col));
        $points = $move->points();
        $piece = $move->piece->value;
        $msg = ($points > 0)
            ? clienttranslate('${player_name} plays ${piece} to (${row},${col}) scoring ${points}')
            : clienttranslate('${player_name} plays ${piece} to (${row},${col})');

        $this->notify->all(
            "piecePlayed",
            $msg,
            [
                "player_id" => $active_player_id,
                "player_name" => $this->getActivePlayerName(),
                "piece" => $piece,
                "handpos" => $handpos,
                "row" => $row,
                "col" => $col,
                "captured_piece" => $move->captured_piece->value,
                "points" => $points,
                "ziggurat_points" => $move->ziggurat_points,
                "field_points" => $move->field_points,
                "hand_size" => $model->hand()->size(),
                "touched_ziggurats" => $move->touched_ziggurats,
            ]
        );
        return PlayPieces::class;
    }

    #[PossibleAction]
    public function actDonePlayPieces(): mixed
    {
        $model = $this->createModel();
        if (!$model->canEndTurn()) {
            throw new \BgaUserException("Attempt to end turn but less than 2 pieces played");
        }
        $model->donePlayPieces();

        $this->notify->all(
            "donePlayed",
            clienttranslate('${player_name} finishes playing pieces'),
            [
                "player_id" => $this->activePlayerId(),
                "player_name" => $this->getActivePlayerName(),
            ]
        );

        return EndOfTurnScoring::class;
    }

    #[PossibleAction]
    public function actUndoPlay() : mixed
    {
        $player_id = $this->activePlayerId();
        $model = $this->createModel();
        $move = $model->undo();
        $args = [
            "player_name" => $this->getActivePlayerName(),
            "player_id" => $this->activePlayerId(),
            "row" => $move->rc->row,
            "col" => $move->rc->col,
            "piece" => $move->piece->value,
            "captured_piece" => $move->captured_piece->value,
            "points" => $move->points(),
            "handpos" => $move->handpos,
            "original_piece" => $move->original_piece->value,
        ];

        $this->notify->player($this->activePlayerId(), "undoMoveActive", clienttranslate('${player_name} undid their move'), $args);
        unset($args["handpos"]);
        unset($args["original_piece"]);
        $this->notify->all("undoMove", clienttranslate('${player_name} undid their move'), $args);

        return PlayPieces::class;
    }

    function zombie(int $playerId): mixed {
        // For now, play randomly but legally
        $model = $this->createModel($playerId);
        if ($model->canEndTurn()) {
            return EndOfTurnScoring::class;
        }

        $pieces = $model->hand()->pieces();
        // Need to not choose empty hand positions.
        $pos = [];
        foreach ($pieces as $i => $piece) {
            if (!$piece->isEmpty()) {
                $pos[] = $i;
            }
        }
        $handpos = $pos[bga_rand(0, count($pos) - 1)];

        // Find empty land spaces. River play is so situational that we just don't do it.
        $rcs = [];
        $model->board()->visitAll(function (Hex $hex) use (&$rcs): void {
            if ($hex->piece->isEmpty() && !$hex->isWater()) {
                $rcs[] = $hex->rc;
            }
        });
        $this->shuffle($rcs);
        return $this->actPlayPiece($playerId, $handpos, $rcs[0]->row, $rcs[0]->col);

        // TODO better choices:
        //   1) win a city or ziggurat
        //   2) next to an appropriate city
        //   3) next to a ziggurat
        //   4) anywhere open
        //  Maybe see if have enough farmers to do > 2 to take ziggurat
    }
}
