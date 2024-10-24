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

// TODO: consider factoring out a "Hand" class.
class PlayerInfo {
    public $scored_cities = array();
    public $scored_fields = array();
    public $hand = array(); /* PieceType */
    public $pool = array(); /* PieceType */
    public $ziggurats = array(); /* ZigguratCard */
    public $score = 0;
    public $id = 0;

    public static function newPlayerInfo($pid) {
        $p = new PlayerInfo();
        for ($i = 0; $i < 5; $i++) {
            $p->hand[] = Piece::EMPTY;
        }
        $p->hand[] = null;
        $p->hand[] = null;

        $p->id = $pid;
        $pool = &$p->pool;
        for ($i = 0; $i < 6; $i++) {
            $pool[] = Piece::PRIEST;
            $pool[] = Piece::MERCHANT;
            $pool[] = Piece::SERVANT;
            $pool[] = Piece::FARMER;
            $pool[] = Piece::FARMER;
        }
        shuffle($pool);
        $p->refillHand();
        return $p;
    }

    public static function fromDbResults(int $player_id, array $handdata, array $pooldata): PlayerInfo {
        $p = new PlayerInfo();
        for ($i = 0; $i < 7; $i++) {
            $p->hand[] = null;
        }
        foreach ($handdata as $hp) {
            $x = $hp["piece"];
            $p->hand[$hp["pos"]] = ($x == null) ? null : Piece::from($hp["piece"]);
        }
        $p->id = $player_id;
        foreach ($pooldata as $pp) {
            $p->pool[] = Piece::from($pp["piece"]);
        }
        return $p;
    }

    public function handContains(Piece $piece): bool {
        foreach ($this->hand as $p) {
            if ($piece == $p) {
                return true;
            }
        }
        return false;
    }

    /* returns false if pool is empty */
    public function refillHand() : bool {
        $handSize = $this->handSize();
        for ($i = 0; $i < $handSize; $i++) {
            if ($this->hand[$i] == Piece::EMPTY) {
                if (count($this->pool) == 0) {
                    return false;
                }
                $this->hand[$i] = array_pop($this->pool);
            }
        }
        return true;
    }

    public function hasZigguratCard(ZigguratCard $type): bool {
        return in_array($type, $this->ziggurats);
    }

    public function handSize() : int {
        return $this->hasZigguratCard(ZigguratCard::SEVEN_TOKENS) ? 7 : 5;
    }
}

?>
