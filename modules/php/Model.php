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

namespace Bga\Games\babylonia;

class Model
{

    private ?Board $_board = null;
    private ?TurnProgress $_turn_progress = null;
    /** @var array<int, PlayerInfo> */
    private ?array $_allPlayerInfo = null;
    private ?Hand $_hand = null;
    private ?Pool $_pool = null;
    private ?Components $_components = null;
    private ?Scorer $_scorer = null;

    public function __construct(private PersistentStore $ps, private int $player_id) {}

    /** @param int[] $player_ids */
    public function createNewGame(array $player_ids, bool $use_advanced_ziggurats): void
    {
        $this->_board = Board::forPlayerCount(count($player_ids));
        $this->ps->insertBoard($this->_board);

        foreach ($player_ids as $player_id) {
            $hand = Hand::new();
            $pool = Pool::new();
            $this->refill($hand, $pool);
            $this->ps->upsertHand($player_id, $hand);
            $this->ps->upsertPool($player_id, $pool);
        }
        $this->_components = Components::forNewGame($use_advanced_ziggurats);
        $this->ps->insertComponents($this->_components);
    }

    private function scorer(): Scorer
    {
        if ($this->_scorer == null) {
            $this->_scorer =
                new Scorer(
                    $this->board(),
                    $this->allPlayerInfo(),
                    $this->components()
                );
        }
        return $this->_scorer;
    }

    public function components(): Components
    {
        if ($this->_components == null) {
            $this->_components = $this->ps->retrieveComponents();
        }
        return $this->_components;
    }

    /** @return array<int,PlayerInfo> */
    public function &allPlayerInfo(): array
    {
        if ($this->_allPlayerInfo == null) {
            $this->_allPlayerInfo = $this->ps->retrieveAllPlayerInfo();
        }
        return $this->_allPlayerInfo;
    }

    /** @return int[] */
    public function allPlayerIds(): array
    {
        return array_keys($this->allPlayerInfo());
    }

    public function hand(): Hand
    {
        if ($this->_hand == null) {
            $this->_hand = $this->ps->retrieveHand($this->player_id);
        }
        return $this->_hand;
    }

    public function pool(): Pool
    {
        if ($this->_pool == null) {
            $this->_pool = $this->ps->retrievePool($this->player_id);
        }
        return $this->_pool;
    }

    public function board(): Board
    {
        if ($this->_board == null) {
            $this->_board = $this->ps->retrieveBoard();
        }
        return $this->_board;
    }

    public function canUndo(): bool
    {
        return $this->turnProgress()->canUndo();
    }

    private function turnProgress(): TurnProgress
    {
        if ($this->_turn_progress == null) {
            $this->_turn_progress = $this->ps->retrieveTurnProgress($this->player_id);
        }
        return $this->_turn_progress;
    }

    public function isPlayAllowed(Piece $piece, Hex $hex): bool
    {
        if ($hex->piece->isField()) {
            if ($piece->isFarmer()) {
                // ensure player has at least one noble adjacent.
                $is_noble = function (Hex $h): bool {
                    return $h->player_id == $this->player_id
                        && $h->piece->isNoble();
                };
                if (count($this->board()->neighbors($hex, $is_noble)) == 0) {
                    return false;
                }
            } else if (!$this->components()->hasUnusedZigguratCard(
                $this->player_id,
                ZigguratCardType::NOBLES_IN_FIELDS
            )) {
                return false;
            }
        } else if ($hex->piece != Piece::EMPTY) {
            return false;
        }

        // if 0 or 1 moves made, can play in any valid hex
        if (count($this->turnProgress()->moves) < 2) {
            return true;
        }

        // extra moves can not go in water
        if ($hex->isWater()) {
            return false;
        }

        $non_land_farmer_played =
            !$this->turnProgress()->allMovesFarmersOnLand($this->board());
        if ($piece->isFarmer()) {
            return !$non_land_farmer_played;
        }
        if (
            !$non_land_farmer_played
            && count($this->turnProgress()->moves) >= 3
            && $this->components()->hasUnusedZigguratCard(
                $this->player_id,
                ZigguratCardType::NOBLE_WITH_3_FARMERS
            )
        ) {
            return true;
        }

        $nobles_played = $this->turnProgress()->uniqueNoblesPlayed();
        if (
            count($nobles_played) == 2
            && !in_array($piece, $nobles_played)
            && $this->components()->hasUnusedZigguratCard(
                $this->player_id,
                ZigguratCardType::NOBLES_3_KINDS
            )
        ) {
            return true;
        }

        return false;
    }

    /*
     * Returns an array ["piece" => [rc1, rc2,...], ...]
     * for piece types that are in hand
     *
     * @return RowCol[]
     */
    public function getAllowedMoves(): array
    {
        $result = [];
        $hand = $this->hand();
        $this->board()->visitAll(function (Hex $hex) use (&$result, &$hand): void {
            foreach (Piece::playerPieces() as $piece) {
                if ($hand->contains($piece)) {
                    if ($this->isPlayAllowed($piece, $hex)) {
                        if (!isset($result[$piece->value])) {
                            $result[$piece->value] = [];
                        }
                        $result[$piece->value][] = $hex->rc;
                    }
                }
            }
        });
        return $result;
    }

    public function playPiece(int $handpos, RowCol $rc): ElaboratedMove
    {
        // also retrieve ziggurat cards held

        $piece = $this->hand()->play($handpos);
        $hex = $this->board()->hexAt($rc);
        if (!$this->isPlayAllowed($piece, $hex)) {
            $pv = $piece->value;
            throw new \InvalidArgumentException("Illegal to play $pv to $rc by $this->player_id");
        }

        $originalPiece = $piece;
        if ($hex->isWater()) {
            $piece = Piece::HIDDEN;
        }
        $hexPiece = $hex->playPiece($piece, $this->player_id);

        $field_points = 0;
        $ziggurats = [];
        // score field
        switch ($hexPiece) {
            case Piece::FIELD_5:
                $field_points = 5;
                break;
            case Piece::FIELD_6:
                $field_points = 6;
                break;
            case Piece::FIELD_7:
                $field_points = 7;
                break;
            case Piece::FIELD_CITIES:
                $field_points = $this->totalCapturedCities();
                break;
        }
        $zigs = $this->board()->neighbors($hex, function (Hex $h): bool {
            return $h->piece == Piece::ZIGGURAT;
        });
        if (count($zigs) > 0) {
            $ziggurats = $this->board()->touchedZiggurats($this->player_id);
        }
        $move = new ElaboratedMove(
            $this->player_id,
            $piece,
            $originalPiece,
            $handpos,
            $rc,
            $hexPiece,
            $field_points,
            count($ziggurats),
            $ziggurats
        );
        $this->turnProgress()->addMove($move);

        // update the database
        $this->ps->insertMove($move);
        $this->ps->updateHex($move->rc, $move->piece, $move->player_id);
        // NOTE: we update the DB but not the player info
        // This is OK at present because this is a top-level entry point
        //  and we haven't retrieved player_infos.
        // Could do:
        //   if ($this->_player_infos != null) {
        //      update the right one
        //   }
        $this->ps->incPlayerScore($move->player_id, $move->points());
        $this->ps->updateHand($move->player_id, $move->handpos, Piece::EMPTY);

        return $move;
    }

    private function totalCapturedCities(): int
    {
        $result = 0;
        foreach ($this->allPlayerInfo() as $_ => $pi) {
            $result += $pi->captured_city_count;
        }
        return $result;
    }

    private function refill(Hand $hand, Pool $pool): void
    {
        while ($hand->size() < $hand->limit() && !$pool->isEmpty()) {
            $hand->replenish($pool->take());
        }
    }

    private function refillHand(): void
    {
        $this->refill($this->hand(), $this->pool());
    }

    /* return true if game should end */
    public function finishTurn(): TurnResult
    {
        $hand = $this->hand();
        $this->refillHand();
        $this->ps->upsertHand($this->player_id, $hand);
        $this->ps->upsertPool($this->player_id, $this->pool());

        $result = new TurnResult(
            $hand->size() == 0,
            $this->board()->cityCount() <= 1
        );
        if ($result->gameOver()) {
            $this->resolveAnyTies();
            return $result;
        }

        $this->ps->deleteAllMoves($this->player_id);
        return $result;
    }

    private function resolveAnyTies(): void
    {
        $infos = array_values($this->allPlayerInfo());
        usort($infos, function (PlayerInfo $i1, PlayerInfo $i2): int {
            return $i1->score - $i2->score;
        });
        $aux_scores = [];
        for ($i = 1; $i < count($infos); $i++) {
            if ($infos[$i]->score == $infos[$i - 1]->score) {
                $aux_scores[$infos[$i]->player_id] =
                    $infos[$i]->captured_city_count;
                $aux_scores[$infos[$i - 1]->player_id] =
                    $infos[$i - 1]->captured_city_count;
            }
        }
        $this->ps->updateAuxScores($aux_scores);
    }

    public function scoreZiggurat(RowCol $rc): HexWinner
    {
        $hex = $this->board()->hexAt($rc);
        if (!$hex->piece->isZiggurat()) {
            throw new \InvalidArgumentException("Attempt to score non-ziggurat {$hex} as a ziggurat");
        }
        if ($hex->scored) {
            throw new \InvalidArgumentException("Attempt to score and already scored ziggurat {$hex}");
        }

        if (!$this->hexRequiresScoring($hex)) {
            throw new \InvalidArgumentException("{$hex} is not ready to be scored");
        }
        $hex->scored = true;
        $this->ps->updateHex($hex->rc, null, null, true);

        return $this->scorer()->computeHexWinner($hex);
    }

    public function scoreCity(RowCol $rc): ScoredCity
    {
        $hex = $this->board()->hexAt($rc);
        if (!$hex->piece->isCity()) {
            throw new \InvalidArgumentException("Attempt to score non-city {$hex} as a city");
        }

        if (!$this->hexRequiresScoring($hex)) {
            throw new \InvalidArgumentException("{$hex} is not a city to be scored");
        }
        $scoredCity = $this->scorer()->computeCityScores($hex);
        $playerInfos = $this->allPlayerInfo();

        // Increase captured_city_count for capturing player, if any
        if ($scoredCity->hex_winner->captured_by > 0) {
            $playerInfos[$scoredCity->hex_winner->captured_by]->captured_city_count++;
        }
        // Give players points for connected pieces
        foreach ($playerInfos as $pid => $pi) {
            $pi->score += $scoredCity->pointsForPlayer($pid);
        }

        $_unused = $hex->captureCity();

        $this->ps->updateHex($hex->rc, $hex->piece, null, true);
        $this->ps->updatePlayers($playerInfos);

        return $scoredCity;
    }

    /** @return RowCol[] */
    public function locationsRequiringScoring(): array
    {
        $result = [];
        $val = function (Hex $hex): int {
            // order is:
            // 0: ziggurats that player on turn is winning
            // 1: ziggurats no one is winning
            // 2: cities that player on turn is winning
            // 3: cities that no one is winning
            // 4: cities that other players are winning
            // 5: zigurats that other players are winning

            $winner = $this->scorer()->computeHexWinner($hex);
            if ($hex->piece->isZiggurat()) {
                if ($winner->captured_by == $this->player_id) {
                    return 0;
                }
                if ($winner->captured_by == 0) {
                    return 1;
                }
                return 5;
            }
            if ($hex->piece->isCity()) {
                if ($winner->captured_by == $this->player_id) {
                    return 2;
                }
                if ($winner->captured_by == 0) {
                    return 3;
                }
                return 4;
            }
            throw new \InvalidArgumentException("hex should be a city or ziggurat but is $hex");
        };
        $this->board()->visitAll(
            function (Hex $hex) use (&$result, $val) {
                if ($this->hexRequiresScoring($hex)) {
                    $result[$hex->rc->asKey()] = [$hex->rc, $val($hex)];
                }
            }
        );
        usort(
            $result,
            /**
             * @param array{0:RowCol,1:int} $a
             * @param array{0:RowCol,1:int} $b
             */
            function (array $a, array $b): int {
                return $a[1] - $b[1];
            }
        );
        /** @param array{0:RowCol,1:int} $a */
        return array_map(function (array $a): RowCol {
            return $a[0];
        }, $result);
    }

    private function hexRequiresScoring(Hex $hex): bool
    {
        if (($hex->piece->isZiggurat() && !$hex->scored)
            || $hex->piece->isCity()
        ) {
            $missing = $this->board()->neighbors(
                $hex,
                function (Hex $nh): bool {
                    return $nh->piece == Piece::EMPTY
                        && $nh->type == HexType::LAND;
                }
            );
            return (count($missing) == 0);
        }
        return false;
    }

    public function canEndTurn(): bool
    {
        // NOTE: could check that there allowed moves but given the
        // board size and piece count, there are always allowed moves.
        return count($this->turnProgress()->moves) >= 2
            || $this->hand()->size() == 0;
    }

    public function selectZigguratCard(ZigguratCardType $card_type): ZigguratCardSelection
    {
        $card = $this->components()->takeCard($this->player_id, $card_type);
        $points = 0;
        if ($card_type == ZigguratCardType::PLUS_10) {
            $card->used = true;
            $points = 10;
            $pi = $this->allPlayerInfo()[$this->player_id];
            $pi->score += $points;
            $this->ps->updatePlayer($pi);
        } else if ($card_type == ZigguratCardType::HAND_SIZE_7) {
            $this->hand()->extend(7);
            $this->ps->upsertHand($this->player_id, $this->hand());
        }
        $this->ps->updateZigguratCard($card);
        return new ZigguratCardSelection($card, $points);
    }

    public function useExtraTurnCard(): void
    {
        $card = $this->components()->getOwnedCard($this->player_id, ZigguratCardType::EXTRA_TURN);
        if ($card == null) {
            throw new \InvalidArgumentException(ZigguratCardType::EXTRA_TURN->value . " is not owned by $this->player_id");
        }
        if ($card->used) {
            throw new \InvalidArgumentException(ZigguratCardType::EXTRA_TURN->value . " has already been used");
        }
        $card->used = true;
        $this->ps->updateZigguratCard($card);
    }

    public function undo(): Move
    {
        $tp = $this->turnProgress();
        $move = $tp->undoLastMove();
        if ($move->player_id != $this->player_id) {
            throw new \InvalidArgumentException(
                "Move $move is not for player $this->player_id"
            );
        }
        $this->ps->deleteSingleMove($move);
        $this->ps->updateHex($move->rc, $move->captured_piece, 0);
        $this->ps->updateHand($move->player_id, $move->handpos, $move->original_piece);
        // NOTE: we update the DB but not the player info
        // This seems OK since this is the main entry point and we
        // haven't retrieve the player info yet.
        $this->ps->incPlayerScore($move->player_id, -$move->points());
        return $move;
    }
}
