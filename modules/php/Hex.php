<?php

namespace Bga\Games\babylonia;

/*
 * We use doubled coordinate representation.
 * (see https://www.redblobgames.com/grids/hexagons/#neighbors)
 */
class Hex {

    public function __toString(): string {
        return sprintf("%s %d:%d %s", $this->type->value, $this->row, $this->col, $this->piece);
    }

    public function __construct(public HexType $type,
                                public int $row,
                                public int $col,
                                public Piece|PlayedPiece|null $piece,
                                public bool $scored = false) {
    }

    public function isPlayable(): bool {
        return $this->piece == null || $this->piece->isCity() || $this->piece->isFarm();
    }

    public function placeFeature(Piece $feature) {
        if ($this->piece != Piece::PLACEHOLDER) {
            throw new LogicException("attempt to place city or farm where it is not expected");
        }
        if (!$feature->isCity() && !$feature->isFarm() && $feature != Piece::ZIGGURAT) {
            throw new LogicException("attempt to place a non-city or farm");
        }
        $this->piece = $feature;
    }

    public function playPiece(PlayedPiece $p) {
        if ($this->piece != Piece::PLACEHOLDER && $this->piece != null) {
            throw new LogicException("attempt to play a piece $p in occupied hex $this");
        }
        if ($this->type == Hextype::WATER) {
            $this->piece = new PlayedPiece(Piece::SECRET, $p->player_id);
        } else {
            $this->piece = $p;
        }
    }

    public function needsCityOrFarm(): bool {
        return $this->piece == Piece::PLACEHOLDER;
    }

    public static function land(int $row, int $col):Hex {
        return new Hex(HexType::LAND, $row, $col, null);
    }

    public static function city(int $row, int $col): Hex {
        return new Hex(HexType::LAND, $row, $col, Piece::PLACEHOLDER);
    }

    public static function water(int $row, int $col): Hex {
        return new Hex(HexType::WATER, $row, $col, null);
    }

    public static function ziggurat(int $row, int $col): Hex {
        return new Hex(HexType::LAND, $row, $col, Piece::ZIGGURAT);
    }

}

?>
