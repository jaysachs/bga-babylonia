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

namespace Bga\Games\babylonia\ModelImpl {

use Bga\Games\babylonia\ZigguratCardType;

class PlayAllowedResult {
    /** @param array<ZigguratCardType> $ziggurat_cards_activated */
    private function __construct(private ?array $ziggurat_cards_activated, public ?string $reason) {}

    /** @param array<ZigguratCardType> $ziggurat_cards_activated */
    static function success(array $ziggurat_cards_activated): PlayAllowedResult {
        return new PlayAllowedResult($ziggurat_cards_activated, null);
    }

    static function failure(string $reason): PlayAllowedResult {
        return new PlayAllowedResult(null, $reason);
    }

    /** @return array<ZigguratCardType> */
    function activatedCards(): array {
        return $this->ziggurat_cards_activated ?? [];
    }

    function isAllowed(): bool {
        return $this->ziggurat_cards_activated !== null;
    }
}

}

namespace Bga\Games\babylonia {

use Bga\Games\babylonia\ModelImpl\PlayAllowedResult;

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

    public function __construct(private PersistentStore $ps, private Stats $stats, private int $player_id) {
    }

    /** @param int[] $player_ids */
    public static function createNewGame(PersistentStore $ps, array $player_ids, bool $use_advanced_ziggurats): void
    {
        $ps->insertBoard(Board::forPlayerCount(count($player_ids)));

        foreach ($player_ids as $player_id) {
            $hand = Hand::new();
            $pool = Pool::new();
            Model::refill($hand, $pool);
            $ps->upsertHand($player_id, $hand);
            $ps->upsertPool($player_id, $pool);
        }
        $ps->insertComponents(Components::forNewGame($use_advanced_ziggurats));
    }

    private function scorer(): Scorer
    {
        if ($this->_scorer == null) {
            $this->_scorer =
                new Scorer(
                    $this->board(),
                    $this->allPlayerInfo(),
                    $this->components(),
                    $this->stats
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

    public function checkPlay(Piece $piece, Hex $hex): PlayAllowedResult
    {
        $zcardsUsed = [];
        if ($hex->piece->isField()) {
            if ($piece->isFarmer()) {
                // ensure player has at least one noble adjacent.
                $is_noble = function (Hex $h): bool {
                    return $h->player_id == $this->player_id
                        && $h->piece->isNoble();
                };
                if (count($this->board()->neighbors($hex, $is_noble)) == 0) {
                    return PlayAllowedResult::failure("can't place farmer in field with no adjacent nobles");
                }
            } else if (!$this->components()->hasUnusedZigguratCard(
                $this->player_id,
                ZigguratCardType::NOBLES_IN_FIELDS
            )) {
                    return PlayAllowedResult::failure("can't place nobles in field without ziggurat card");
            } else {
                $zcardsUsed[] = ZigguratCardType::NOBLES_IN_FIELDS;
            }
        } else if ($hex->piece != Piece::EMPTY) {
            return PlayAllowedResult::failure("can't place in occupied non-field space");
        }

        // if 0 or 1 moves made, can play in any valid hex
        if (count($this->turnProgress()->moves) < 2) {
            return PlayAllowedResult::success($zcardsUsed);
        }

        // extra moves can not go in water
        if ($hex->isWater()) {
            return PlayAllowedResult::failure("can't place extra moves in river");
        }

        $non_land_farmer_played =
            !$this->turnProgress()->allMovesFarmersOnLand($this->board());
        if ($piece->isFarmer()) {
            if ($non_land_farmer_played) {
                return PlayAllowedResult::failure("can't place extra farmers unless all previous moves were farmers onto land");
            }
            return PlayAllowedResult::success($zcardsUsed);
        }
        if (
            !$non_land_farmer_played
            && count($this->turnProgress()->moves) >= 3
            && $this->components()->hasUnusedZigguratCard(
                $this->player_id,
                ZigguratCardType::NOBLE_WITH_3_FARMERS
            )
        ) {
            $zcardsUsed[]= ZigguratCardType::NOBLE_WITH_3_FARMERS;
            return PlayAllowedResult::success($zcardsUsed);
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
            $zcardsUsed[] = ZigguratCardType::NOBLES_3_KINDS;
            return PlayAllowedResult::success($zcardsUsed);
        }

        return PlayAllowedResult::failure("cannot place extra nobles");
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
                    if ($this->checkPlay($piece, $hex)->isAllowed()) {
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
        $this->stats->enterDeferredMode();

        $piece = $this->hand()->play($handpos);
        $hex = $this->board()->hexAt($rc);
        $result = $this->checkPlay($piece, $hex);
        if (!$result->isAllowed()) {
            throw new \InvalidArgumentException("Illegal to play $piece->value to $rc by player $this->player_id");
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

        foreach ($result->activatedCards() as $zctype) {
            switch ($zctype) {
                case ZigguratCardType::NOBLE_WITH_3_FARMERS:
                    $this->stats->PLAYER_ZC_USED_NOBLE_WITH_3_FARMERS->inc($this->player_id);
                    break;
                case ZigguratCardType::NOBLES_3_KINDS:
                    $this->stats->PLAYER_ZC_USED_NOBLES_3_KINDS->inc($this->player_id);
                    break;
                case ZigguratCardType::NOBLES_IN_FIELDS:
                    $this->stats->PLAYER_ZC_USED_NOBLES_IN_FIELDS->inc($this->player_id);
                    break;
                default:
                    error_log("Unexpected used ziggurat card during move: $zctype->value");
            }
        }

        if ($move->captured_piece->isField()) {
            $this->stats->PLAYER_FIELDS_CAPTURED->inc($this->player_id);
        }
        if ($move->piece->isHidden()) {
            $this->stats->PLAYER_RIVER_SPACES_PLAYED->inc($this->player_id);
        }
        if ($move->points() > 0) {
            $this->stats->PLAYER_POINTS_FROM_FIELDS->inc($this->player_id, $move->field_points);
            $this->stats->PLAYER_POINTS_FROM_ZIGGURATS->inc($this->player_id, $move->ziggurat_points);
        }

        $this->ps->insertMove($move, $this->stats->exitDeferredMode());
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

    private static function refill(Hand $hand, Pool $pool): void
    {
        while ($hand->size() < $hand->limit() && !$pool->isEmpty()) {
            $hand->replenish($pool->take());
        }
    }

    private function refillHand(): void
    {
        Model::refill($this->hand(), $this->pool());
        if ($this->hand()->size() > Hand::DEFAULT_SIZE) {
            $this->stats->PLAYER_ZC_USED_HAND_SIZE_7->inc($this->player_id);
        }
    }

    public function donePlayPieces(): void {
        // adjust avg pieces player per turn statistic
        $pid = $this->player_id;

        $numplayed = floatval(count($this->turnProgress()->moves));
        $numturns = floatval($this->stats->PLAYER_NUMBER_TURNS->get($pid));
        $sum = $this->stats->PLAYER_AVERAGE_PIECES_PLAYED_PER_TURN->get($pid) * ($numturns - 1.0);
        $this->stats->PLAYER_AVERAGE_PIECES_PLAYED_PER_TURN->set($pid, ($sum + $numplayed) / $numturns);

        // delete turn progress, but apply any deferred stats
        $statOps = $this->ps->deleteAllMoves($this->player_id);
        $this->stats->applyAll($statOps);
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
            if ($result->less_than_two_remaining_cities) {
                $this->stats->TABLE_GAME_END_BY_CITY_CAPTURES->set(true);
            }
            if ($result->pieces_exhausted) {
                $this->stats->TABLE_GAME_END_BY_POOL_EXHAUSTION->set(true);
            }
            return $result;
        }

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

    public function selectScoringHex(RowCol $rc): Hex {
        $hex = $this->board()->hexAt($rc);
        $lrs = $this->locationsRequiringScoring();
        if (array_search($hex->rc, $lrs) === false) {
            throw new \BgaUserException("hex {$hex} is not scoreable");
        }
        if ($hex->piece->isCity()) {
            $this->stats->PLAYER_CITY_SCORING_TRIGGERED->inc($this->player_id);
        } else if ($hex->piece->isZiggurat()) {
            $this->stats->PLAYER_ZIGGURAT_SCORING_TRIGGERED->inc($this->player_id);
        }
        return $hex;
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
            throw new \InvalidArgumentException("ziggurat at {$hex} is not ready to be scored");
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
        $captured_by = $scoredCity->hex_winner->captured_by;
        // Increase captured_city_count for capturing player, if any
        if ($captured_by > 0) {
            $this->stats->PLAYER_CITIES_CAPTURED->inc($captured_by);
            $playerInfos[$captured_by]->captured_city_count++;
        }
        // Give players points for connected pieces
        foreach ($playerInfos as $pid => $pi) {
            $pi->score += $scoredCity->pointsForPlayer($pid);
            $this->stats->PLAYER_POINTS_FROM_CITY_NETWORKS->inc($pid, $scoredCity->networkPointsForPlayer($pid));
            $this->stats->PLAYER_POINTS_FROM_CAPTURED_CITIES->inc($pid, $scoredCity->capturePointsForPlayer($pid));
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

    function hexRequiresScoring(Hex $hex): bool
    {
        if (($hex->piece->isZiggurat() && !$hex->scored)
            || $hex->piece->isCity()
        ) {
            $missing = $this->board()->neighbors(
                $hex,
                function (Hex $nh): bool {
                    return $nh->piece === Piece::EMPTY
                        && $nh->type === HexType::LAND;
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
            $this->stats->PLAYER_ZC_USED_PLUS_10->inc($this->player_id);
            $pi = $this->allPlayerInfo()[$this->player_id];
            $pi->score += $points;
            $this->ps->updatePlayer($pi);
        } else if ($card_type == ZigguratCardType::HAND_SIZE_7) {
            $this->hand()->extend(7);
            $this->ps->upsertHand($this->player_id, $this->hand());
        }
        $this->ps->updateZigguratCard($card);
        $this->stats->PLAYER_ZIGGURAT_CARDS->inc($this->player_id);
        $stat = match ($card->type) {
            ZigguratCardType::PLUS_10 => $this->stats->PLAYER_ZC_CHOSEN_PLUS_10,
            ZigguratCardType::EXTRA_TURN => $this->stats->PLAYER_ZC_CHOSEN_EXTRA_TURN,
            ZigguratCardType::HAND_SIZE_7 => $this->stats->PLAYER_ZC_CHOSEN_HAND_SIZE_7,
            ZigguratCardType::NOBLES_3_KINDS => $this->stats->PLAYER_ZC_CHOSEN_NOBLES_3_KINDS,
            ZigguratCardType::NOBLE_WITH_3_FARMERS => $this->stats->PLAYER_ZC_CHOSEN_NOBLE_WITH_3_FARMERS,
            ZigguratCardType::NOBLES_IN_FIELDS => $this->stats->PLAYER_ZC_CHOSEN_NOBLES_IN_FIELDS,
            ZigguratCardType::EXTRA_CITY_POINTS => $this->stats->PLAYER_ZC_CHOSEN_EXTRA_CITY_POINTS,
            ZigguratCardType::EMPTY_CENTER_LAND_CONNECTS => $this->stats->PLAYER_ZC_CHOSEN_EMPTY_CENTER_LAND,
            ZigguratCardType::EMPTY_RIVER_CONNECTS => $this->stats->PLAYER_ZC_CHOSEN_EMPTY_RIVER,
        };
        $stat->set($this->player_id, true);
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
        $this->stats->PLAYER_ZC_USED_EXTRA_TURN->inc($this->player_id);
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

}