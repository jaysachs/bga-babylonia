<?php

namespace Bga\Games\babylonia;

enum Piece: string {
    case ZIGGURAT = 'ziggurat';
    case PRIEST = 'priest';
    case SERVANT = 'servant';
    case MERCHANT = 'merchant';
    case FARMER = 'farmer';
    case SECRET = 'secret';
    case CITY_P = 'city_p';
    case CITY_S = 'city_s';
    case CITY_M = 'city_m';
    case CITY_SP = 'city_sp';
    case CITY_MP = 'city_mp';
    case CITY_MS = 'city_ms';
    case CITY_MSP = 'city_msp';
    case FARM_5 = 'farm_5';
    case FARM_6 = 'farm_6';
    case FARM_7 = 'farm_7';
    case FARM_CITIES = 'farm_X';
    case PLACEHOLDER = '';

    public function isFarm(): bool {
        return match($this) {
            Piece::FARM_5,
            Piece::FARM_6,
            Piece::FARM_7,
            Piece::FARM_CITIES => true,
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

    public function isPlayerPiece(): bool {
        return $this->isFarmer() || $this->isNoble() || $this->isSecret();
    }
    public function isSecret(): bool { return $this == Piece::SECRET; }
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
