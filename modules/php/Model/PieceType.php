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

namespace Bga\Games\babylonia\Model;

enum PieceType: string
{

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
    case FIELD_CITIES = 'field_x';
    case EMPTY = 'empty';

    public function translated(): string {
        return match ($this) {
            self::FARMER => clienttranslate('farmer'),
            self::PRIEST => clienttranslate('priest'),
            self::MERCHANT => clienttranslate('merchant'),
            self::SERVANT => clienttranslate('civil servant'),
            self::ZIGGURAT => clienttranslate('ziggurat'),
            self::FIELD_5 => clienttranslate('field 5'),
            self::FIELD_6 => clienttranslate('field 6'),
            self::FIELD_7 => clienttranslate('field 7'),
            self::FIELD_CITIES => clienttranslate('field city count'),
            self::CITY_M => clienttranslate('merchant city'),
            self::CITY_P => clienttranslate('priest city'),
            self::CITY_S => clienttranslate('civil servant city'),
            self::CITY_MP => clienttranslate('merchant and priest city'),
            self::CITY_MS => clienttranslate('merchant and civil servant city'),
            self::CITY_SP => clienttranslate('civil servant and priest city'),
            self::CITY_MSP => clienttranslate('merchant, civil servant and priest city'),
            self::EMPTY => clienttranslate('empty'),
            self::HIDDEN => clienttranslate('hidden'),
        };
    }

    public function isField(): bool
    {
        return match ($this) {
            PieceType::FIELD_5,
            PieceType::FIELD_6,
            PieceType::FIELD_7,
            PieceType::FIELD_CITIES => true,
            default => false,
        };
    }

    public function isCity(): bool
    {
        return match ($this) {
            PieceType::CITY_P,
            PieceType::CITY_S,
            PieceType::CITY_M,
            PieceType::CITY_SP,
            PieceType::CITY_MP,
            PieceType::CITY_MS,
            PieceType::CITY_MSP => true,
            default => false,
        };
    }

    /** @return PieceType[] */
    public static function playerPieceTypes(): array
    {
        return [PieceType::FARMER, PieceType::MERCHANT, PieceType::SERVANT, PieceType::PRIEST];
    }

    public function isEmpty(): bool
    {
        return $this == PieceType::EMPTY;
    }
    public function isZiggurat(): bool
    {
        return $this == PieceType::ZIGGURAT;
    }
    public function isPlayerPieceType(): bool
    {
        return $this->isFarmer() || $this->isNoble() || $this->isHidden();
    }
    public function isHidden(): bool
    {
        return $this == PieceType::HIDDEN;
    }
    public function isFarmer(): bool
    {
        return $this == PieceType::FARMER;
    }
    public function isNoble(): bool
    {
        return match ($this) {
            PieceType::MERCHANT,
            PieceType::SERVANT,
            PieceType::PRIEST => true,
            default => false,
        };
    }

    public function scores(PieceType $p): bool
    {
        return match ($p) {
            PieceType::PRIEST => match ($this) {
                PieceType::CITY_P,
                PieceType::CITY_SP,
                PieceType::CITY_MP,
                PieceType::CITY_MSP => true,
                default => false,
            },
            PieceType::SERVANT => match ($this) {
                PieceType::CITY_S,
                PieceType::CITY_MS,
                PieceType::CITY_SP,
                PieceType::CITY_MSP => true,
                default => false,
            },
            PieceType::MERCHANT => match ($this) {
                PieceType::CITY_M,
                PieceType::CITY_MS,
                PieceType::CITY_MP,
                PieceType::CITY_MSP => true,
                default => false,
            },
            default => false,
        };
    }
}
