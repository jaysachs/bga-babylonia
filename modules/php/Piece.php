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

enum Piece: string {

    case ZIGGURAT = 'ziggurat';
    case PRIEST = 'priest';
    case SERVANT = 'servant';
    case MERCHANT = 'merchant';
    case FARMER = 'farmer';
    case HIDDEN = 'hidden';
    case CITY_P = 'city_p';
    case CITY_S = 'city_s';
    case CITY_M = 'city_m';
    case CITY_SP = 'city_sp';
    case CITY_MP = 'city_mp';
    case CITY_MS = 'city_ms';
    case CITY_MSP = 'city_msp';
    case FIELD_5 = 'field_5';
    case FIELD_6 = 'field_6';
    case FIELD_7 = 'field_7';
    case FIELD_CITIES = 'field_X';
    case EMPTY = 'empty';

    public function isField(): bool {
        return match($this) {
            Piece::FIELD_5,
            Piece::FIELD_6,
            Piece::FIELD_7,
            Piece::FIELD_CITIES => true,
            default => false,
        };
    }

    public function isCity(): bool {
        return match($this) {
            Piece::CITY_P,
            Piece::CITY_S,
            Piece::CITY_M,
            Piece::CITY_SP,
            Piece::CITY_MP,
            Piece::CITY_MS,
            Piece::CITY_MSP => true,
            default => false,
        };
    }

    public static function playerPieces(): array {
        return [Piece::FARMER, Piece::MERCHANT, Piece::SERVANT, Piece::PRIEST];
    }

    public function isEmpty(): bool {
        return $this == Piece::EMPTY;
    }
    public function isPlayerPiece(): bool {
        return $this->isFarmer() || $this->isNoble() || $this->isHidden();
    }
    public function isHidden(): bool { return $this == Piece::HIDDEN; }
    public function isFarmer(): bool { return $this == Piece::FARMER; }
    public function isNoble(): bool {
        return match ($this) {
            Piece::MERCHANT,
            Piece::SERVANT,
            Piece::PRIEST => true,
            default => false,
        };
    }
}

?>
