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

class PlayerInfo {
    public $scored_cities = array();
    public $scored_farms = array();
    public $hand = array(); /* PieceType */
    public $pool = array(); /* PieceType */
    public $ziggurats = array(); /* ZigguratCard */
    public $score = 0;
    public $id = 0;

    public static function newPlayerInfo($pid) {
        $p = new PlayerInfo();
        for ($i = 0; $i < 7; $i++) {
            $p->hand[] = null;
        }
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
        $p->refreshHand();
        return $p;
    }

    public function dbSave($db): void {
    }

    public static function dbInsertAll(array $player_infos, $db): void {
        // first the pools
        $sql = "INSERT INTO handpools (player_id, seq_id, piece) VALUES ";
        $sql_values = [];
        foreach ($player_infos as $player_id => $pi) {
            foreach ($pi->pool as $piece) {
                $sql_values[] = "($player_id, NULL, '$piece->value')";
            }
        }
        $sql .= implode(',', $sql_values);
        $db->DbQuery( $sql );

        // then the hands
        $sql = "INSERT INTO hands (player_id, pos, piece) VALUES ";
        $sql_values = [];
        foreach ($player_infos as $player_id => $pi) {
            for ($i = 0; $i < count($pi->hand); ++$i) {
                $p = $pi->hand[$i];
                $piece = ($p == null) ? "NULL" : "'$p->value'";
                $sql_values[] = "($player_id, $i, $piece)";
            }
        }
        $sql .= implode(',', $sql_values);
        $db->DbQuery( $sql );
    }
    
    public static function fromDbResults(array $dbresults): PlayerInfo {
    }

    /* returns false if pool is empty */
    public function refreshHand() : bool {
        $handSize = $this->handSize();
        for ($i = 0; $i < $handSize; $i++) {
            if ($this->hand[$i] == null) {
                if (count($this->pool) == 0) {
                    return false;
                }
                $this->hand[$i] = array_pop($this->pool);
            }
        }
        return true;
    }

    public function hasZigguratCard(ZigguratCard $type): bool {
        return !(array_search($type, $this->ziggurats) === false);
    }

    public function handSize() : int {
        return $this->hasZigguratCard(ZigguratCard::SEVEN_TOKENS) ? 7 : 5;
    }
}

?>
