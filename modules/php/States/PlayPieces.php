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

use Bga\GameFramework\NotificationMessage;
use Bga\GameFramework\StateType;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\Model\Hex;
use Bga\Games\babylonia\Model\Model;
use Bga\Games\babylonia\Model\RowCol;
use Bga\Games\babylonia\Utils\Arrays;

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

    private function addStateArgs(array $args, Model $model, int $active_player_id): array {
        $args["_private"][$active_player_id]["playState"] = [
            "allowedMoves" => $model->getAllowedMoves(),
            "canEndTurn" => $model->canEndTurn(),
            "canUndo" => $model->canUndo(),
        ];
        return $args;
    }

    /** @return array{_private:array<int,array{allowedMoves:array<string,list<int>>,canEndTurn:bool,canUndo:bool}>} */
    public function getArgs(int $active_player_id): array
    {
        $model = $this->createModel($active_player_id);
        return $this->addStateArgs([], $model, $active_player_id);
    }

    #[PossibleAction]
    public function actPlayPiece(int $active_player_id, int $handpos, int $rc): mixed
    {
        $model = $this->createModel($active_player_id);
        $move = $model->playPiece($handpos, $rc);
        $points = $move->points();
        $piece = $move->piece->value;
        $msg = ($points > 0)
            ? clienttranslate('${player_name} plays ${piece} to (${row},${col}) scoring ${points}')
            : clienttranslate('${player_name} plays ${piece} to (${row},${col})');

        $this->notify->all(
            "piecePlayed",
            $msg,
            $this->addStateArgs(
                [
                    "player_id" => $active_player_id,
                    "piece" => $piece,
                    "handpos" => $handpos,
                    "rc" => $rc,
                    "row" => RowCol::row($rc),
                    "col" => RowCol::col($rc),
                    "captured_piece" => $move->captured_piece->value,
                    "points" => $points,
                    "ziggurat_points" => $move->ziggurat_points,
                    "field_points" => $move->field_points,
                    "hand_size" => $model->hand()->size(),
                    "touched_ziggurats" => $move->touched_ziggurats,
                ],
                $model,
                $active_player_id
            )
        );
        return null;
    }

    #[PossibleAction]
    public function actDonePlayPieces(int $active_player_id): mixed
    {
        $model = $this->createModel($active_player_id);
        if (!$model->canEndTurn()) {
            throw new UserException("Attempt to end turn but less than 2 pieces played");
        }
        $model->donePlayPieces();

        $this->notify->all(
            "donePlayed",
            clienttranslate('${player_name} finishes playing pieces'),
            [
                "player_id" => $active_player_id,
            ]
        );

        return EndOfTurnScoring::class;
    }

    #[PossibleAction]
    public function actUndoPlay(int $active_player_id): mixed
    {
        $model = $this->createModel($active_player_id);
        $move = $model->undo();

        $this->notify->all(
            "undoMove",
            clienttranslate('${player_name} undid their move from ${row},${col}'),
            $this->addStateArgs(
                [
                    "player_id" => $active_player_id,
                    "rc" => $move->rc,
                    "row" => RowCol::row($move->rc),
                    "col" => RowCol::col($move->rc),
                    "piece" => $move->piece->value,
                    "captured_piece" => $move->captured_piece->value,
                    "hand_size" => $model->hand()->size(),
                    "points" => $move->points(),
                    "_private" => [
                        $active_player_id => [
                            "handpos" => $move->handpos,
                            "original_piece" => $move->original_piece->value,
                        ]
                    ]
                ],
                $model,
                $active_player_id
            )
        );

        return null;
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
        /** @var list<int> */
        $rcs = [];
        $model->board()->visitAll(function (Hex $hex) use (&$rcs): void {
            if ($hex->piece->isEmpty() && !$hex->isWater()) {
                $rcs[] = $hex->rc;
            }
        });
        Arrays::shuffle($rcs);
        return $this->actPlayPiece($playerId, $handpos, $rcs[0]);

        // TODO better choices:
        //   1) win a city or ziggurat
        //   2) next to an appropriate city
        //   3) next to a ziggurat
        //   4) anywhere open
        //  Maybe see if have enough farmers to do > 2 to take ziggurat
    }
}
