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
    private ?PlayedTurn $_played_turn = null;
    private ?PlayerInfo $_player_info = null;
    private ?array $_playerData = null;
    
    public function __construct(private Db $db, private int $player_id) { }

    public function createNewGame(array $player_ids, bool $use_advanced_ziggurats): void {
        $this->_board = Board::forPlayerCount(count($player_ids));
        $this->db->insertBoard($this->_board);

        $pis = [];
        foreach ($player_ids as $player_id) {
            $pis[$player_id] = PlayerInfo::newPlayerInfo($player_id);
        }
        $this->db->insertPlayerInfos($pis);

        $ziggurats = [
            ZigguratCard::PLUS_10,
            ZigguratCard::EXTRA_TURN,
            ZigguratCard::SEVEN_TOKENS,
            ZigguratCard::THREE_NOBLES,
            ZigguratCard::NOBLE_WITH_3_FARMERS,
            ZigguratCard::NOBLES_IN_FIELDS,
            ZigguratCard::EXTRA_CITY_POINTS ];
        if ($use_advanced_ziggurats) {
            $ziggurats[] = ZigguratCard::FREE_CENTRAL_LAND_CONNECTS;
            $ziggurats[] = ZigguratCard::FREE_RIVER_CONNECTS;
            shuffle($ziggurats);
            array_pop($ziggurats);
            array_pop($ziggurats);
            // TODO: persist these somewhere :-)
        }
        $this->db->insertZigguratCards($ziggurats);
    }

    public function allPlayersData(): array {
        if ($this->_playerData == null) {
            $this->_playerData = $this->db->retrievePlayersData();
        }
        return $this->_playerData;
    }
    
    private function allPlayerIds(): array {
        return array_keys($this->allPlayersData());
    }
    
    public function board(): Board {
        if ($this->_board == null) {
            $this->_board = $this->db->retrieveBoard();
        }
        return $this->_board;
    }

    public function playedTurn(): PlayedTurn {
        if ($this->_played_turn == null) {
            $this->_played_turn = $this->db->retrievePlayedTurn($this->player_id);
        }
        return $this->_played_turn;
    }

    public function playerInfo(): PlayerInfo {
        if ($this->_player_info == null) {
            $this->_player_info = $this->db->retrievePlayerInfo($this->player_id);
        }
        return $this->_player_info;
    }

    public function isPlayAllowed(Piece $piece, Hex $hex): bool {
        // first check move limits per turn
        if (count($this->playedTurn()->moves) >= 2) {
            if ($hex->isWater()) {
                return false;
            }
            if ($piece->isFarmer()) {
                if (!$this->playedTurn()->allMovesFarmersOnLand($this->board())) {
                    return false;
                }
                // fall through
            } else {
                // Now check if player has zig tiles to permit another move
                return false;
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
                $n = count($this->board()->neighbors($hex, $is_noble)) > 0;
                return $n;
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
        $hand = $this->playerInfo()->hand;
        $this->board()->visitAll(function (&$hex) use (&$result, &$hand) :void {
            foreach (Piece::playerPieces() as $piece) {
                if (in_array($piece, $hand)) {
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
        $played_turn = $this->db->retrievePlayedTurn($this->player_id);
        // also retrieve ziggurat tiles held

        $piece = $this->db->retrieveHandPiece($this->player_id, $handpos);
        if ($piece == null) {
            throw new \InvalidArgumentException("No piece in hand at $handpos");
        }
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
            // TODO: need a global captured city-count
            $fs = 0; // $overall_captured_city_count;
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
        $this->playedTurn()->addMove($move);

        // update the database
        $this->db->insertMove($move);

        return [
            "points" => $points,
            "piece" => $piece
        ];
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

    /* return true if game should end */
    public function finishTurn(): array {
        $info = $this->playerInfo();
        if (!$info->refillHand()) {
            return [
                "gameOver" => true
            ];
        }
        
        $this->db->updatePlayerInfo($this->player_id, $info);

        $hand = [];
        foreach ($info->hand as $piece) {
            $hand[] = ["piece" => ($piece == null) ? null : $piece->value];
        }

        $this->db->removePlayedMoves($this->player_id);
        return [
            "gameOver" => false,
            "hand" => $hand
        ];
    }

    public function scoreCity(Hex $hex): ScoredCity {
        $scores = $this->computeCityScores($hex);
        $pd = $this->allPlayersData();
        foreach ($scores->playerHexes as $pid => $hexes) {
            $pd[$pid]["points"] += count($hexes);
        }
        if ($scores->wonby > 0) {
            $pd[$scores->wonby]["captured"]++;
        }

        $h = $this->board()->hexAt($hex->row, $hex->col);
        $p = $h->captureCity();

        // TODO: all players get points at 1 per every 2 cities captured
        
        // TODO: update board hex in db
        // TODO: update players in db
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
        $wonby = 0;
        $maxc = 0;
        foreach ($adjacent as $p => $c) {
            if ($c > $maxc) {
                $maxc = $c;
                $wonby = $p;
            } else if ($c > 0 && $c == $maxc) {
                $wonby = 0;
            }
        }
        return $wonby;
    }

    // TODO: Also needs to return who won it.
    private function computeCityScores(Hex $hex): ScoredCity {
        if (!$this->cityRequiresScoring($hex)) {
            throw new \InvalidArgumentException("$hex is not a city to be scored");
        }
        $result = ScoredCity::forPlayerIds($this->allPlayerIds());
        $result->wonby = $this->computeTileWinner($hex);
    
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

    private function cityRequiresScoring(Hex $hex): bool {
        if (!$hex->piece->isCity()) {
            return false;
        }
        $missing = $this->board()->neighbors(
            $hex,
            function (&$nh): bool {
                return $nh->piece == Piece::EMPTY
                    && $nh->type = HexType::LAND;
            }
        );
        return (count($missing) == 0);
    }

    public function citiesRequiringScoring(): array /* Hex */ {
        $result = [];
        $this->board()->visitAll(
            function (&$hex) use (&$result) {
                if ($this->cityRequiresScoring($hex)) {
                    $result[] = $hex;
                }
            }
        );
        return $result;
    }

    public function zigguratsRequiringScoring(): array /* Hex */ {
        $result = [];
        $this->board()->visitAll(
            function (&$hex) use (&$result) {
                if (!$hex->piece->isZiggurat() || $hex->scored) {
                    return;
                }
                $missing = $this->board()->neighbors(
                    $hex,
                    function (&$nh): bool {
                        return $nh->piece == Piece::EMPTY
                            && $nh->type == HexType::LAND;
                    }
                );
                if (count($missing) == 0) {
                    $result[] = $hex;
                }
            }
        );
        return $result;
    }
}

?>
