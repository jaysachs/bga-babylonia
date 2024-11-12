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

class Model {

    private ?Board $_board = null;
    private ?TurnProgress $_turn_progress = null;
    private ?array /* PlayerInfo */ $_allPlayerInfo = null;
    private ?Hand $_hand = null;
    private ?Pool $_pool = null;
    private ?Components $_components = null;

    public function __construct(private PersistentStore $ps, private int $player_id) { }

    public function createNewGame(array $player_ids, bool $use_advanced_ziggurats): void {
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

    public function components(): Components {
        if ($this->_components == null) {
            $this->_components = $this->ps->retrieveComponents();
        }
        return $this->_components;
    }

    public function &allPlayerInfo(): array /* PlayerInfo */ {
        if ($this->_allPlayerInfo == null) {
            $this->_allPlayerInfo = $this->ps->retrieveAllPlayerInfo();
        }
        return $this->_allPlayerInfo;
    }

    public function allPlayerIds(): array {
        return array_keys($this->allPlayerInfo());
    }

    public function hand(): Hand {
        if ($this->_hand == null) {
            $this->_hand = $this->ps->retrieveHand($this->player_id);
        }
        return $this->_hand;
    }

    public function pool(): Pool {
        if ($this->_pool == null) {
            $this->_pool = $this->ps->retrievePool($this->player_id);
        }
        return $this->_pool;
    }

    public function board(): Board {
        if ($this->_board == null) {
            $this->_board = $this->ps->retrieveBoard();
        }
        return $this->_board;
    }

    public function turnProgress(): TurnProgress {
        if ($this->_turn_progress == null) {
            $this->_turn_progress = $this->ps->retrieveTurnProgress($this->player_id);
        }
        return $this->_turn_progress;
    }

    public function isPlayAllowed(Piece $piece, Hex $hex): bool {
        if ($hex->piece->isField()) {
            if ($piece->isFarmer()) {
                // ensure player has at least one noble adjacent.
                $is_noble = function ($h): bool {
                    return $h->player_id == $this->player_id
                        && $h->piece->isNoble();
                };
                if (count($this->board()->neighbors($hex, $is_noble)) == 0) {
                    return false;
                }
            } else if (!$this->components()->hasUnusedZigguratCard(
                $this->player_id, ZigguratCardType::NOBLES_IN_FIELDS)) {
                return false;
            }
        }
        else if ($hex->piece != Piece::EMPTY) {
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
        if (!$non_land_farmer_played
            && count($this->turnProgress()->moves) >= 3
            && $this->components()->hasUnusedZigguratCard(
                $this->player_id,
                ZigguratCardType::NOBLE_WITH_3_FARMERS)) {
            return true;
        }

        $nobles_played = $this->turnProgress()->uniqueNoblesPlayed();
        if (count($nobles_played) == 2
            && !in_array($piece, $nobles_played)
            && $this->components()->hasUnusedZigguratCard(
                $this->player_id,
                ZigguratCardType::NOBLES_3_KINDS)) {
            return true;
        }

        return false;
    }

    /*
     * Returns an array ["piece" => [hex1, hex2,...], ...]
     * for piece types that are in hand
     */
    public function getAllowedMoves(): array {
        $result = [];
        $hand = $this->hand();
        $this->board()->visitAll(function (&$hex) use (&$result, &$hand) :void {
            foreach (Piece::playerPieces() as $piece) {
                if ($hand->contains($piece)) {
                    if ($this->isPlayAllowed($piece, $hex)) {
                        if (!isset($result[$piece->value])) {
                            $result[$piece->value] = [];
                        }
                        $result[$piece->value][] = $hex;
                    }
                }
            }
        });
        return $result;
    }

    public function playPiece(int $handpos, int $row, int $col): Move {
        // also retrieve ziggurat cards held

        $piece = $this->hand()->play($handpos);
        $hex = $this->board()->hexAt($row, $col);
        if ($hex == null) {
            throw new \LogicException("Hex at $row $col was null");
        }
        if (!$this->isPlayAllowed($piece, $hex)) {
            $pv = $piece->value;
            throw new \InvalidArgumentException("Illegal to play $pv to $row, $col by $this->player_id");
        }

        $originalPiece = $piece;
        if ($hex->isWater()) {
            $piece = Piece::HIDDEN;
        }
        $hexPiece = $hex->playPiece($piece, $this->player_id);

        $fs = 0;
        $zs = 0;
        // score field
        switch ($hexPiece) {
        case Piece::FIELD_5:
            $fs = 5; break;
        case Piece::FIELD_6:
            $fs = 6; break;
        case Piece::FIELD_7:
            $fs = 7; break;
        case Piece::FIELD_CITIES:
            // TODO?: use and maintain a global captured city-count?
            $fs = $this->totalCapturedCities();
            break;
        }
        $zigs = $this->board()->neighbors($hex, function (&$h): bool {
            return $h->piece == Piece::ZIGGURAT;
        });
        if (count($zigs) > 0) {
            $zs = $this->board()->adjacentZiggurats($this->player_id);
        }

        $points = $fs + $zs;

        $move = new Move($this->player_id, $piece, $originalPiece, $handpos, $row, $col, $hexPiece, $points);
        $this->turnProgress()->addMove($move);

        // update the database
        $this->ps->insertMove($move);

        return $move;
    }

    private function totalCapturedCities(): int {
        $result = 0;
        foreach ($this->allPlayerInfo() as $pid => $pi) {
            $result += $pi->captured_city_count;
        }
        return $result;
    }

    public function playableHexes(Piece $piece): array {
        $result = [];
        $this->board()->visitAll(function (&$hex) use (&$result, $piece) {
            if ($this->iPlayAllowed($piece, $hex)) {
                $result[] = $hex;
            }
        });
        return result;
    }

    private function refill(Hand $hand, Pool $pool): void {
        while ($hand->size() < $hand->limit() && !$pool->isEmpty()) {
            $hand->replenish($pool->take());
        }
    }

    private function refillHand(): void {
        $this->refill($this->hand(), $this->pool());
    }

    /* return true if game should end */
    public function finishTurn(): TurnResult {
        $hand = $this->hand();
        $this->refillHand();
        $this->ps->upsertHand($this->player_id, $hand);
        $this->ps->upsertPool($this->player_id, $this->pool());

        $result = new TurnResult($hand->size() == 0,
                                 $this->board()->cityCount() <= 1);
        if ($result->gameOver()) {
            $this->resolveAnyTies();
            return $result;
        }

        $this->ps->removeTurnProgress($this->player_id);
        return $result;
    }

    private function resolveAnyTies(): void {
        $infos = array_values($this->allPlayerInfo());
        usort($infos, function ($i1, $i2): int {
            return $i1->score - $i2->score;
        });
        $aux_scores=[];
        for ($i = 1; $i < count($infos); $i++) {
            if ($infos[$i]->score == $infos[$i-1]->score) {
                $aux_scores[$info[$i]->player_id] =
                    $info[$i]->captured_city_count;
                $aux_scores[$info[$i-1]->player_id] =
                    $info[$i-1]->captured_city_count;
            }
        }
        $this->ps->updateAuxScores($aux_scores);
    }

    public function scoreZiggurat(Hex $hexrc): ScoredZiggurat {
        // TODO: really implement this, checking for a winner,
        //  and executing a state change
        $hex = $this->board()->hexAt($hexrc->row, $hexrc->col);
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
        $this->ps->updateHex($hex);

        return new ScoredZiggurat($this->computeHexWinner($hex));
    }

    public function scoreCity(Hex $hex): ScoredCity {
        if (!$hex->piece->isCity()) {
            throw new \InvalidArgumentException("Attempt to score non-city {$hex} as a city");
        }
        if (!$this->hexRequiresScoring($hex)) {
            throw new \InvalidArgumentException("{$hex} is not a city to be scored");
        }
        $scores = $this->computeCityScores($hex);
        $player_infos = &$this->allPlayerInfo();

        // Increase captured_city_count for capturing player, if any
        if ($scores->captured_by > 0) {
            $player_infos[$scores->captured_by]->captured_city_count++;
        }

        // Now each player gets 1 point for city they've captured.
        foreach ($player_infos as $pid => $pi) {
            // TODO: incorporate ziggurat card
            $points = $pi->captured_city_count;
            if ($this->components()->hasUnusedZigguratCard(
                $pid,
                ZigguratCardType::EXTRA_CITY_POINTS)) {
                $points += intval(floor($points / 2));
            }
            $scores->captured_city_points[$pid] = $points;

        }

        // Give players points for connected pieces
        foreach ($player_infos as $pid => $pi) {
            $pi->score += $scores->pointsForPlayer($pid);
        }

        // Mark the hex captured
        // TODO: this is defensive, since we use the incoming hex
        //  only as coordinates.
        $captured_hex = $this->board()->hexAt($hex->row, $hex->col);
        $_unused = $captured_hex->captureCity();

        $this->ps->updateHex($captured_hex);
        $this->ps->updatePlayers($player_infos);

        return $scores;
    }

    private function newEmptyPlayerMap(mixed $value): array {
        $result = [];
        foreach ($this->allPlayerIds() as $pid) {
            $result[$pid] = $value;
        }
        return $result;
    }

    private function computeHexWinner(Hex $hex): int {
        // first compute who will win the city / ziggurat, if anyone.
        $neighbors = $this->board()->neighbors(
            $hex,
            function (&$h): bool { return $h->piece->isPlayerPiece(); }
        );
        $adjacent = $this->newEmptyPlayerMap(0);
        foreach ($neighbors as $h) {
            $adjacent[$h->player_id]++;
        }
        $captured_by = 0;
        $maxc = 0;
        foreach ($adjacent as $p => $c) {
            if ($c > $maxc) {
                $maxc = $c;
                $captured_by = $p;
            } else if ($c > 0 && $c == $maxc) {
                $captured_by = 0;
            }
        }
        return $captured_by;
    }

    private function computeCityScores(Hex $hex): ScoredCity {
        $result = new ScoredCity($hex->piece, $this->allPlayerIds());
        $result->captured_by = $this->computeHexWinner($hex);

        $seen = [];
        $neighbors = $this->board()->neighbors(
            $hex,
            function (&$h): bool { return $h->piece->isPlayerPiece(); }
        );

        foreach ($neighbors as $n) {
            if (in_array($n, $seen)) {
                continue;
            }
            $this->board()->bfs(
                $n->row,
                $n->col,
                function (&$h) use (&$result, &$hex, &$n, &$seen) {
                    if ($this->inNetwork($h, $n->player_id)) {
                        if ($hex->piece->scores($h->piece)) {
                            if (in_array($h, $seen)) {
                                // nothing
                            } else {
                                $result->addScoredHex($h);
                            }
                        }
                        $seen[] = $h;
                        return true;
                    }
                    return false;
                }
            );
        }
        return $result;
    }

    private function inNetwork(Hex $h, int $player_id): bool {
        return
            // Either it's one of the player's pieces
            ($h->piece->isPlayerPiece() && $h->player_id == $player_id)
            // Or it's an empty land hex in the center area and the player has
            //   the appropriate bonus card
            || ($h->landmass == Landmass::CENTER && $h->piece->isEmpty()
                && $this->components()->hasUnusedZigguratCard(
                    $player_id,
                    ZigguratCardType::FREE_CENTER_LAND_CONNECTS))
            // Or it's an empty water hex and the player has the river bonus card
            || ($h->piece->isEmpty() && $h->isWater()
                && $this->components()->hasUnusedZigguratCard(
                    $player_id,
                    ZigguratCardType::FREE_RIVER_CONNECTS));
    }

    public function hexRequiresScoring(Hex $hex): bool {
        if (($hex->piece->isZiggurat() && !$hex->scored)
            || $hex->piece->isCity()) {
            $missing = $this->board()->neighbors(
                $hex,
                function (&$nh): bool {
                    return $nh->piece == Piece::EMPTY
                        && $nh->type == HexType::LAND;
                }
            );
            return (count($missing) == 0);
        }
        return false;
    }

    public function hexesRequiringScoring(): array /* Hex */ {
        $result = [];
        $this->board()->visitAll(
            function (&$hex) use (&$result) {
                if ($this->hexRequiresScoring($hex)) {
                    $result[] = $hex;
                }
            }
        );
        return $result;
    }

    public function canEndTurn(): bool {
        return count($this->turnProgress()->moves) >= 2
            || count($this->getAllowedMoves()) == 0;
    }

    public function selectZigguratCard(ZigguratCardType $card_type): ZigguratCardSelection {
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

    public function useExtraTurnCard(): void {
        $card = $this->components()->getOwnedCard($this->player_id, ZigguratCardType::EXTRA_TURN);
        if ($card == null) {
            throw new \InvalidArgumentException(ZigguratCardType::EXTRA_TURN->value . " is not owned by $player_id");
        }
        if ($card->used) {
            throw new \InvalidArgumentException(ZigguratCardType::EXTRA_TURN->value . " has already been used");
        }
        $card->used = true;
        $this->ps->updateZigguratCard($card);
    }

    public function undo() {
        $tp = $this->turnProgress();
        $move = $tp->undoLastMove();
        if ($move->player_id != $this->player_id) {
            throw new \InvalidArgumentException(
                "Move $move is not for player $this->player_id");
        }
        $this->ps->undoMove($move);
        return $move;
    }
}

?>
