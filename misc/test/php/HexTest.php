<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\Model\ {
        Hex,
        HexType,
        PieceType,
        RowCol,
};

final class HexTest extends TestCase
{
    public function testPlaceDevelopmentOnEmptyHexSucceeds(): void
    {
        $hex = new Hex(HexType::LAND, RowCol::fromRowCol(0, 0));
        $hex->placeDevelopment(PieceType::CITY_P);
        $this->assertSame(PieceType::CITY_P, $hex->piece);
    }

    public function testPlaceDevelopmentOnNonEmptyHexFails(): void
    {
        $this->expectException(LogicException::class);

        $hex = new Hex(HexType::LAND, RowCol::fromRowCol(0, 0));
        $hex->placeDevelopment(PieceType::CITY_P);
        $hex->placeDevelopment(PieceType::CITY_P);
    }

    public function testPlaceDevelopmentOnWaterFails(): void
    {
        $hex = new Hex(HexType::WATER, RowCol::fromRowCol(0, 0));
        $this->expectException(LogicException::class);
        $hex->placeDevelopment(PieceType::CITY_P);
    }

    public function testPlayPieceSucceeds(): void
    {
        $hex = new Hex(HexType::LAND, RowCol::fromRowCol(0, 0));
        $hex->playPiece(PieceType::FARMER, 1);
        $this->assertSame(PieceType::FARMER, $hex->piece);
        $this->assertSame(1, $hex->player_id);
    }

    public function testPlayPieceOnFieldSucceeds(): void
    {
        $hex = new Hex(HexType::LAND, RowCol::fromRowCol(0, 0));
        $hex->placeDevelopment(PieceType::FIELD_5);
        $hex->playPiece(PieceType::FARMER, 1);
        $this->assertSame(PieceType::FARMER, $hex->piece);
        $this->assertSame(1, $hex->player_id);
    }

    public function testPlayPieceOnNonFieldDevelopmentFails(): void
    {
        $hex = new Hex(HexType::LAND, RowCol::fromRowCol(0, 0));
        $hex->placeDevelopment(PieceType::CITY_S);
        $this->expectException(LogicException::class);
        $hex->playPiece(PieceType::FARMER, 1);
    }

    public function test_playPiece_HiddenOnWaterSucceeds(): void
    {
        $hex = new Hex(HexType::WATER, RowCol::fromRowCol(0, 0));
        $hex->playPiece(PieceType::HIDDEN, 1);
        $this->assertSame(1, $hex->player_id);
    }

    public function test_playPiece_UnHiddenOnWaterFails(): void
    {
        $hex = new Hex(HexType::WATER, RowCol::fromRowCol(0, 0));
        $this->expectException(LogicException::class);
        $hex->playPiece(PieceType::PRIEST, 1);
    }

    public function test_isLandAndIsWaterSucceed(): void {
        $hex = Hex::land(RowCol::fromRowCol(4, 5));
        $this->assertTrue($hex->isLand());
        $this->assertFalse($hex->isWater());

        $hex = Hex::water(RowCol::fromRowCol(5, 5));
        $this->assertTrue($hex->isWater());
        $this->assertFalse($hex->isLand());
    }

    public function test_toStringSucceeds(): void {
        $hex = Hex::land(RowCol::fromRowCol(4, 5));
        $this->assertSame("LAND 405 empty(0) false UNKNOWN", "$hex");
        $hex->placeDevelopment(PieceType::FIELD_5);
        $this->assertSame("LAND 405 field_5(0) false UNKNOWN", "$hex");

        $hex = Hex::land(RowCol::fromRowCol(4, 5));
        $hex->playPiece(PieceType::PRIEST, 3);
        $this->assertSame("LAND 405 priest(3) false UNKNOWN", "$hex");
    }
}
