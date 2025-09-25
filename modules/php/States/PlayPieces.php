<?php

/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <vagabond@covariant.org>
 *
 * Copyright 2024 Jay Sachs <vagabond@covariant.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 */

declare(strict_types=1);

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\Hex;
use Bga\Games\babylonia\RowCol;
use Bga\Games\babylonia\Utils;

class PlayPieces extends AbstractState
{
    function __construct(Game $game)
    {
        parent::__construct(
            game: $game,
            id: 3,
            type: StateType::ACTIVE_PLAYER,
            description: clienttranslate('${actplayer} is playing pieces'),
            descriptionMyTurn: clienttranslate('${you} may play a piece or end the turn'),
        );
    }

    public function getArgs(int $active_player_id): array
    {
        $model = $this->createModel($active_player_id);

        return [
            "allowedMoves" => $model->getAllowedMoves(),
            "canEndTurn" => $model->canEndTurn(),
            "canUndo" => $model->canUndo(),
        ];
    }

    #[PossibleAction]
    public function actPlayPiece(int $active_player_id, int $handpos, int $row, int $col): mixed
    {
        $model = $this->createModel($active_player_id);
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
                "player_name" => $this->getPlayerNameById($active_player_id),
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
    public function actDonePlayPieces(int $active_player_id): mixed
    {
        $model = $this->createModel($active_player_id);
        if (!$model->canEndTurn()) {
            throw new \BgaUserException("Attempt to end turn but less than 2 pieces played");
        }
        $model->donePlayPieces();

        $this->notify->all(
            "donePlayed",
            clienttranslate('${player_name} finishes playing pieces'),
            [
                "player_id" => $active_player_id,
                "player_name" => $this->getPlayerNameById($active_player_id),
            ]
        );

        return EndOfTurnScoring::class;
    }

    #[PossibleAction]
    public function actUndoPlay(int $active_player_id): mixed
    {
        $model = $this->createModel($active_player_id);
        $move = $model->undo();
        $args = [
            "player_name" => $this->getPlayerNameById($active_player_id),
            "player_id" => $active_player_id,
            "row" => $move->rc->row,
            "col" => $move->rc->col,
            "piece" => $move->piece->value,
            "captured_piece" => $move->captured_piece->value,
            "points" => $move->points(),
            "handpos" => $move->handpos,
            "original_piece" => $move->original_piece->value,
        ];

        $this->notify->player($active_player_id, "undoMoveActive", clienttranslate('${player_name} undid their move'), $args);
        unset($args["handpos"]);
        unset($args["original_piece"]);
        $this->notify->all("undoMove", clienttranslate('${player_name} undid their move'), $args);

        return PlayPieces::class;
    }

    function zombie(int $playerId): mixed
    {
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
        Utils::shuffle($rcs);
        return $this->actPlayPiece($playerId, $handpos, $rcs[0]->row, $rcs[0]->col);

        // TODO better choices:
        //   1) win a city or ziggurat
        //   2) next to an appropriate city
        //   3) next to a ziggurat
        //   4) anywhere open
        //  Maybe see if have enough farmers to do > 2 to take ziggurat
    }
}
