<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <jay@covariant.org>
 *
 * Copyright 2024 Jay Sachs <jay@covariant.org>
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

    public function __construct(private Db $db, private int $player_id) { }

    public function createNewGame(array $player_ids, bool $use_advanced_ziggurats): void {
        $this->_board = Board::forPlayerCount(count($player_ids));
        $this->db->insertBoard($this->_board);

        foreach ($player_ids as $player_id) {
            $hand = Hand::new();
            $pool = Pool::new();
            $this->refill($hand, $pool);
            $this->db->upsertHand($player_id, $hand);
            $this->db->upsertPool($player_id, $pool);
        }
        $this->_components = Components::forNewGame($use_advanced_ziggurats);
        $this->db->insertComponents($this->_components);
    }

    public function components(): Components {
        if ($this->_components == null) {
            $this->_components = $this->db->retrieveComponents();
        }
        return $this->_components;
    }

    public function &allPlayerInfo(): array /* PlayerInfo */ {
        if ($this->_allPlayerInfo == null) {
            $this->_allPlayerInfo = $this->db->retrieveAllPlayerInfo();
        }
        return $this->_allPlayerInfo;
    }

    private function allPlayerIds(): array {
        return array_keys($this->allPlayerInfo());
    }

    public function hand(): Hand {
        if ($this->_hand == null) {
            $this->_hand = $this->db->retrieveHand($this->player_id);
        }
        return $this->_hand;
    }

    public function pool(): Pool {
        if ($this->_pool == null) {
            $this->_pool = $this->db->retrievePool($this->player_id);
        }
        return $this->_pool;
    }

    public function board(): Board {
        if ($this->_board == null) {
            $this->_board = $this->db->retrieveBoard();
        }
        return $this->_board;
    }

    public function turnProgress(): TurnProgress {
        if ($this->_turn_progress == null) {
            $this->_turn_progress = $this->db->retrieveTurnProgress($this->player_id);
        }
        return $this->_turn_progress;
    }

    public function isPlayAllowed(Piece $piece, Hex $hex): bool {
        // first check move limits per turn
        if (count($this->turnProgress()->moves) >= 2) {
            // extra moves can not go in water
            if ($hex->isWater()) {
                return false;
            }
            $non_land_farmer_played =
                !$this->turnProgress()->allMovesFarmersOnLand($this->board());
            if ($piece->isFarmer()) {
                if ($non_land_farmer_played) {
                    return false;
                }
                // fall through
            } else {
                if ($non_land_farmer_played
                    || count($this->turnProgress()->moves) < 3
                    || !$this->components()->hasUnusedZigguratCard($this->player_id,
                                                             ZigguratCardType::NOBLE_WITH_3_FARMERS)) {
                    return false;
                }
                $played = $this->turnProgress()->uniquePiecesPlayed();
                if (count($played) != 2
                    || in_array($piece, $played)
                    || !$this->components()->hasUnusedZigguratCard($this->player_id,
                                                             ZigguratCardType::NOBES_3_KINDS)) {
                    return false;
                }
            }
        }
        // now check if piece is allowed
        if ($hex->piece == Piece::EMPTY) {
            return true;
        }
        if ($hex->piece->isField()) {
            if ($piece->isFarmer()) {
                // ensure player has at least one noble adjacent.
                $is_noble = function ($h): bool {
                    return $h->player_id == $this->player_id
                        && $h->piece->isNoble();
                };
                return count($this->board()->neighbors($hex, $is_noble)) > 0;
            } else if ($this->components()->hasUnusedZigguratCard(
                $this->player_id, ZigguratCardType::NOBLES_IN_FIELDS)) {
                return true;
            }
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

    public function playPiece(int $handpos, int $row, int $col): array {
        // also retrieve ziggurat tiles held

        $piece = $this->hand()->play($handpos);
        $hex = $this->board()->hexAt($row, $col);
        if ($hex == null) {
            throw new \LogicException("Hex at $row $col was null");
        }
        if (!$this->isPlayAllowed($piece, $hex)) {
            $pv = $piece->value;
            throw new \InvalidArgumentException("Illegal to play $pv to $row, $col by $this->player_id");
        }

        if ($hex->isWater()) {
            $piece = Piece::HIDDEN;
        }
        $original = $hex->playPiece($piece, $this->player_id);

        $fs = 0;
        $zs = 0;
        // score field
        switch ($original) {
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

        $move = new Move($this->player_id, $piece, $handpos, $row, $col, false, $points);
        $this->turnProgress()->addMove($move);

        // update the database
        $this->db->insertMove($move);

        return [
            "points" => $points,
            "piece" => $piece
        ];
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
    public function finishTurn(): bool {
        $hand = $this->hand();
        $this->refillHand();
        $this->db->upsertHand($this->player_id, $hand);
        $this->db->upsertPool($this->player_id, $this->pool());

        // set sizes on info, persist it?

        if ($hand->size() == 0 || $this->board()->cityCount() <= 1) {
            return true;
        }

        $this->db->removeTurnProgress($this->player_id);
        return false;
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
        $this->db->updateHex($hex);

        return new ScoredZiggurat($this->computeTileWinner($hex));
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
            if ($this->components()->hasUnusedZigguratCard($pid, ZigguratCardType::EXTRA_CITY_POINTS)) {
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

        $this->db->updateHex($captured_hex);
        $this->db->updatePlayers($player_infos);

        // TODO: update global captured city count in db globals
        return $scores;
    }

    private function newEmptyPlayerMap(mixed $value): array {
        $result = [];
        foreach ($this->allPlayerIds() as $pid) {
            $result[$pid] = $value;
        }
        return $result;
    }

    private function computeTileWinner(Hex $hex): int {
        // first compute who will win the city tile, if anyone.
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
        $result->captured_by = $this->computeTileWinner($hex);

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
                    if ($h->piece->isPlayerPiece()) {
                        if ($h->player_id == $n->player_id) {
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
                    }
                    return false;
                }
            );
        }
        return $result;
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
            $this->db->updatePlayer($pi);
        } else if ($card_type == ZigguratCardType::HAND_SIZE_7) {
            $this->hand()->extend(7);
            $this->db->upsertHand($this->player_id, $this->hand());
        }
        $this->db->updateZigguratCard($card);
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
        $this->db->updateZigguratCard($card);
    }
}

?>
