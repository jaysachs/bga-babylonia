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

namespace Bga\Games\babylonia\Model\ModelImpl {

use Bga\Games\babylonia\Model\ZigguratCardType;

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

namespace Bga\Games\babylonia\Model {

use Bga\GameFramework\UserException;
use Bga\Games\babylonia\Model\ModelImpl\PlayAllowedResult;
use Bga\Games\babylonia\Stats;

class Model
{
    /** @var array{player_infos:array<int,PlayerInfo>,board:Board,components:Components,turnProgress:TurnProgress} */
    private ?array $_allData = null;

    public function __construct(private PersistentStore $ps, private Stats $stats, private int $player_id) {
    }

    /** @param int[] $player_ids */
    public static function createNewGame(PersistentStore $ps, array $player_ids, bool $use_advanced_ziggurats): void
    {
        $board = Board::forPlayerCount(count($player_ids));
        $components = Components::forNewGame($use_advanced_ziggurats);
        $pinfos = [];
        foreach ($player_ids as $player_id) {
            $hand = Hand::new();
            $pool = Pool::new();
            Model::refill($hand, $pool);
            $pinfos[$player_id] = new PlayerInfo($player_id, 0, $hand, $pool, 0);
        }
        $ps->insertAll($board, $components, $pinfos);
    }

    private function makeScorer(): Scorer
    {
        return new Scorer(
            $this->board(),
            $this->allPlayerInfo(),
            $this->components()
        );
    }

    /** @return array{player_infos:array<int,PlayerInfo>,board:Board,components:Components,turnProgress:TurnProgress} */
    private function &allData(): array {
        if ($this->_allData == null) {
            $this->_allData = $this->ps->retrieveAllData($this->player_id);
            $turnProgress = $this->_allData["turnProgress"];
            $moves = [];
            $this->_allData["turnProgress"] = new TurnProgress($moves);
            foreach ($turnProgress->moves as $move) {
                $this->doPlayPiece($move->player_id, $move->handpos, $move->rc);
                $this->_allData["player_infos"][$move->player_id]->score += $move->points();
            }
            $this->_allData["turnProgress"] = $turnProgress;
        }
        return $this->_allData;
    }

    public function components(): Components
    {
        return $this->allData()['components'];
    }

    /**
     * Compute and return the current game progression.
     *    aspercent complete (0 .. 100 inclusive)
     *
     * This is based on total number of pieces played. Probably
     * can improve based on taking the max of that and cities scored.
     */
    public function getProgressionPercent(): int {
        $player_infos = $this->allPlayerInfo();
        $total_pieces = 30 * count($player_infos);
        $remaining_pieces = 0;
        foreach ($player_infos as $pi) {
            $remaining_pieces += $pi->hand->size() + $pi->pool->size();
        }
        return intval(100.0 - ($remaining_pieces * 100.0) / floatval($total_pieces));
    }

    /** @return array<int,PlayerInfo> */
    public function &allPlayerInfo(): array
    {
        return $this->allData()['player_infos'];
    }

    public function activePlayerInfo(): PlayerInfo {
        return $this->allPlayerInfo()[$this->player_id];
    }

    public function board(): Board
    {
        return $this->allData()['board'];
    }

    private function turnProgress(): TurnProgress
    {
        return $this->allData()['turnProgress'];
    }

    public function checkPlay(int $player_id, PieceType $piece, Hex $hex): PlayAllowedResult
    {
        $zcardsUsed = [];
        if ($hex->piece->isField()) {
            if ($piece->isFarmer()) {
                // ensure player has at least one non-hidden piece adjacent.
                $is_non_hidden = function (Hex $h) use (&$player_id) : bool {
                    return $h->player_id == $player_id
                        && !$h->piece->isHidden();
                };
                if (count($this->board()->neighbors($hex, $is_non_hidden)) == 0) {
                    return PlayAllowedResult::failure("can't place farmer in field with no adjacent unhidden piece");
                }
            } else if (!$this->components()->hasUnusedZigguratCard(
                $player_id,
                ZigguratCardType::NOBLES_IN_FIELDS
            )) {
                return PlayAllowedResult::failure("can't place nobles in field without ziggurat card");
            } else {
                $zcardsUsed[] = ZigguratCardType::NOBLES_IN_FIELDS;
            }
        } else if ($hex->piece != PieceType::EMPTY) {
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
                $player_id,
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
                $player_id,
                ZigguratCardType::NOBLES_3_KINDS
            )
        ) {
            $zcardsUsed[] = ZigguratCardType::NOBLES_3_KINDS;
            return PlayAllowedResult::success($zcardsUsed);
        }

        return PlayAllowedResult::failure("cannot place extra nobles");
    }

    /**
     * Returns an array ["piece" => [rc1, rc2,...], ...]
     * for piece types that are in hand
     *
     * @return array<string,list<int>>
     */
    public function getAllowedMoves(): array
    {
        $result = [ "" => [] ];
        $hand = $this->activePlayerInfo()->hand;
        $allPieces = PieceType::playerPieceTypes();
        foreach ($allPieces as $piece) {
            $result[$piece->value] = [];
        }
        $handPieces = array_filter($allPieces, fn ($p) => $hand->contains($p));
        foreach ($this->board()->allHexes() as $hex) {
            $all = count(array_filter($allPieces, fn ($p) => $this->checkPlay($this->player_id, $p, $hex)->isAllowed()))
                    == count($allPieces);
            if ($all) {
                $result[""][] = $hex->rc;
            }
            else {
                foreach ($handPieces as $piece) {
                    if ($this->checkPlay($this->player_id, $piece, $hex)->isAllowed()) {
                        $result[$piece->value][] = $hex->rc;
                    }
                }
            }
        }
        return array_filter($result, fn ($am) => count($am) > 0);
    }

    private function doPlayPiece(int $player_id, int $handpos, int $rc): ElaboratedMove {
        $piece = $this->allPlayerInfo()[$player_id]->hand->play($handpos);
        $hex = $this->board()->hexAt($rc);
        $result = $this->checkPlay($player_id, $piece, $hex);
        if (!$result->isAllowed()) {
            throw new \InvalidArgumentException("Illegal to play $piece->value to $rc by player $this->player_id: $result->reason");
        }

        $originalPiece = $piece;
        if ($hex->isWater()) {
            $piece = PieceType::HIDDEN;
        }
        $hexPiece = $hex->playPiece($piece, $player_id);

        $field_points = 0;
        $ziggurats = [];
        // score field
        switch ($hexPiece) {
            case PieceType::FIELD_5:
                $field_points = 5;
                break;
            case PieceType::FIELD_6:
                $field_points = 6;
                break;
            case PieceType::FIELD_7:
                $field_points = 7;
                break;
            case PieceType::FIELD_CITIES:
                $field_points = $this->totalCapturedCities();
                break;
        }
        $zigs = $this->board()->neighbors($hex, function (Hex $h): bool {
            return $h->piece == PieceType::ZIGGURAT;
        });
        if (count($zigs) > 0) {
            $ziggurats = $this->board()->touchedZiggurats($this->player_id);
        }
        return new ElaboratedMove(
            $this->player_id,
            $piece,
            $originalPiece,
            $handpos,
            $rc,
            $hexPiece,
            $field_points,
            count($ziggurats),
            $ziggurats,
            $result->activatedCards()
        );
    }

    public function playPiece(int $handpos, int $rc): ElaboratedMove
    {
        $move = $this->doPlayPiece($this->player_id, $handpos, $rc);
        $this->turnProgress()->addMove($move);
        $this->ps->insertMove($move);
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

    /**
     * Returns array map of pool location to hand location.
     * @return array<int,int>
     */
    private static function refill(Hand $hand, Pool $pool): array
    {
        $taken = $pool->takeN($hand->limit() - $hand->size());
        $result = [];
        foreach ($taken as $pp => $p) {
            $result[$pp] = $hand->replenish($p);
        }
        return $result;
    }

    /**
     * Returns array map of pool location to hand location.
     * @return array<int,int>
     */
    private function refillHand(): array
    {
        $hand = $this->activePlayerInfo()->hand;
        $result = self::refill($hand, $this->activePlayerInfo()->pool);
        if ($hand->size() > Hand::DEFAULT_SIZE) {
            $this->stats->PLAYER_ZC_USED_HAND_SIZE_7->inc($this->player_id);
        }
        return $result;
    }

    private function fetchCommittedOnly(): TurnProgress {
        $this->_allData = $this->ps->retrieveAllData($this->player_id);
        $turnProgress = $this->turnProgress();
        $moves = [];
        $this->_allData["turnProgress"] = new TurnProgress($moves);
        return $turnProgress;
    }

    public function donePlayPieces(): void {
        foreach ($this->fetchCommittedOnly()->moves as $move) {
            $emove = $this->doPlayPiece($move->player_id, $move->handpos, $move->rc);
            $this->ps->updatePlayedPiece($move);
            foreach ($emove->activated_ziggurat_cards as $zctype) {
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
        }

        // adjust avg pieces player per turn statistic
        $pid = $this->player_id;

        $numplayed = floatval(count($this->turnProgress()->moves));
        $numturns = floatval($this->stats->PLAYER_NUMBER_TURNS->get($pid));
        $sum = $this->stats->PLAYER_AVERAGE_PIECES_PLAYED_PER_TURN->get($pid) * ($numturns - 1.0);
        $this->stats->PLAYER_AVERAGE_PIECES_PLAYED_PER_TURN->set($pid, ($sum + $numplayed) / $numturns);

        // delete turn progress
        $this->ps->deleteAllMoves($this->player_id);
    }

    /* return true if game should end */
    public function finishTurn(): TurnResult
    {
        $hand = $this->activePlayerInfo()->hand;
        $refilled = $this->refillHand();
        $this->ps->updateRefill($this->player_id, $refilled);

        $result = new TurnResult($hand, $this->board());
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
        $aux_scores = array_map(fn ($pi) => $pi->captured_city_count, $this->allPlayerInfo());
        $this->ps->updateAuxScores($aux_scores);
    }

    public function selectScoringHex(int $rc): Hex {
        $hex = $this->board()->hexAt($rc);
        $lrs = $this->locationsRequiringScoring();
        if (array_search($hex->rc, $lrs) === false) {
            throw new UserException("hex {$hex} is not scoreable");
        }
        if ($hex->piece->isCity()) {
            $this->stats->PLAYER_CITY_SCORING_TRIGGERED->inc($this->player_id);
        } else if ($hex->piece->isZiggurat()) {
            $this->stats->PLAYER_ZIGGURAT_SCORING_TRIGGERED->inc($this->player_id);
        }
        return $hex;
    }

    public function scoreZiggurat(int $rc): HexWinner
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
        $this->ps->updateScoredZiggurat($hex->rc);

        return $this->makeScorer()->computeHexWinner($hex);
    }

    public function scoreCity(int $rc): ScoredCity
    {
        $hex = $this->board()->hexAt($rc);
        if (!$hex->piece->isCity()) {
            throw new \InvalidArgumentException("Attempt to score non-city {$hex} as a city");
        }

        if (!$this->hexRequiresScoring($hex)) {
            throw new \InvalidArgumentException("{$hex} is not a city to be scored");
        }
        $scoredCity = $this->makeScorer()->computeCityScores($hex);
        $playerInfos = $this->allPlayerInfo();
        $captured_by = $scoredCity->hex_winner->captured_by;
        // Increase captured_city_count for capturing player, if any
        if ($captured_by > 0) {
            $this->stats->PLAYER_CITIES_CAPTURED->inc($captured_by);
            $playerInfos[$captured_by]->captured_city_count++;
        }
        // Give players points for connected pieces
        foreach ($playerInfos as $pid => $_pi) {
            $this->stats->PLAYER_POINTS_FROM_CITY_NETWORKS->inc($pid, $scoredCity->networkPointsForPlayer($pid));
            $this->stats->PLAYER_POINTS_FROM_CAPTURED_CITIES->inc($pid, $scoredCity->capturePointsForPlayer($pid));
            $this->ps->incPlayerScore($pid, $scoredCity->networkPointsForPlayer($pid) + $scoredCity->capturePointsForPlayer($pid));
        }

        $components = $this->components();
        $pid = $components->zigguratCardOwner(ZigguratCardType::EMPTY_CENTER_LAND_CONNECTS);
        if ($pid > 0) {
            $this->stats->PLAYER_ZC_POINTS_EMPTY_CENTER_LAND->inc($pid, $scoredCity->zigguratCardPoints(ZigguratCardType::EMPTY_CENTER_LAND_CONNECTS));
        }
        $pid = $components->zigguratCardOwner(ZigguratCardType::EMPTY_RIVER_CONNECTS);
        if ($pid > 0) {
            $this->stats->PLAYER_ZC_POINTS_EMPTY_RIVER->inc($pid, $scoredCity->zigguratCardPoints(ZigguratCardType::EMPTY_RIVER_CONNECTS));
        }
        $pid = $components->zigguratCardOwner(ZigguratCardType::EXTRA_CITY_POINTS);
        if ($pid > 0) {
            $this->stats->PLAYER_ZC_POINTS_EXTRA_CITY->inc($pid, $scoredCity->zigguratCardPoints(ZigguratCardType::EXTRA_CITY_POINTS));
        }

        $_unused = $hex->captureCity();

        $this->ps->updateScoredCity($scoredCity);

        return $scoredCity;
    }

    /** @return list<int> */
    public function locationsRequiringScoring(): array
    {
        $result = [];
        $scorer = $this->makeScorer();
        $val = function (Hex $hex) use (&$scorer): int {
            // order is:
            // 0: ziggurats that player on turn is winning
            // 1: ziggurats no one is winning
            // 2: cities that player on turn is winning
            // 3: cities that no one is winning
            // 4: cities that other players are winning
            // 5: zigurats that other players are winning

            $winner = $scorer->computeHexWinner($hex);
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
        foreach ($this->board()->allHexes() as $hex) {
            if ($this->hexRequiresScoring($hex)) {
                $result[$hex->rc] = [$hex->rc, $val($hex)];
            }
        }
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
        /** @param array{0:int,1:int} $a */
        return array_map(function (array $a): int {
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
                    return $nh->piece === PieceType::EMPTY && $nh->isLand();
                }
            );
            return (count($missing) == 0);
        }
        return false;
    }

    public function canUndo(): bool {
        return count($this->turnProgress()->moves) > 0;
    }

    public function canEndTurn(): bool
    {
        // NOTE: could check that there allowed moves but given the
        // board size and piece count, there are always allowed moves.
        return count($this->turnProgress()->moves) >= 2
            || $this->activePlayerInfo()->hand->size() == 0;
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
            $this->ps->incPlayerScore($this->player_id, $points);
        } else if ($card_type == ZigguratCardType::HAND_SIZE_7) {
            $added = $this->activePlayerInfo()->hand->extend(7);
            $this->ps->updateExtendedHand($this->player_id, $added);
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
        $this->board()->hexAt($move->rc)->remove();
        if (!$move->captured_piece->isEmpty()) {
            $this->board()->hexAt($move->rc)->playPiece($move->captured_piece, $move->player_id);
        }
        $this->activePlayerInfo()->hand->replace($move->original_piece, $move->handpos);
        if ($move->points() <> 0) {
            $pinfo = $this->allPlayerInfo()[$move->player_id];
        }
        $this->ps->deleteSingleMove($move);
        $this->ps->updateUndoneMove($move);
        return $move;
    }
}

}