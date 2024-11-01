<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        Hex,
        HexType,
        Piece,
};

final class HexTest extends TestCase
{
    public function testPlaceDevelopmentOnEmptyHexSucceeds(): void
    {
        $hex = new Hex(HexType::LAND, 0, 0);
        $hex->placeDevelopment(Piece::CITY_P);
        $this->assertSame(Piece::CITY_P, $hex->piece);
    }

    public function testPlaceDevelopmentOnNonEmptyHexFails(): void
    {
        $this->expectException(LogicException::class);

        $hex = new Hex(HexType::LAND, 0, 0);
        $hex->placeDevelopment(Piece::CITY_P);
        $hex->placeDevelopment(Piece::CITY_P);
    }

    public function testPlaceDevelopmentOnWaterFails(): void
    {
        $hex = new Hex(HexType::WATER, 0, 0);
        $this->expectException(LogicException::class);
        $hex->placeDevelopment(Piece::CITY_P);
    }

    public function testPlayPieceSucceeds(): void
    {
        $hex = new Hex(HexType::LAND, 0, 0);
        $hex->playPiece(Piece::FARMER, 1);
        $this->assertSame(Piece::FARMER, $hex->piece);
        $this->assertSame(1, $hex->player_id);
    }

    public function testPlayPieceOnFieldSucceeds(): void
    {
        $hex = new Hex(HexType::LAND, 0, 0);
        $hex->placeDevelopment(Piece::FIELD_5);
        $hex->playPiece(Piece::FARMER, 1);
        $this->assertSame(Piece::FARMER, $hex->piece);
        $this->assertSame(1, $hex->player_id);
    }

    public function testPlayPieceOnNonFieldDevelopmentFails(): void
    {
        $hex = new Hex(HexType::LAND, 0, 0);
        $hex->placeDevelopment(Piece::CITY_S);
        $this->expectException(LogicException::class);
        $hex->playPiece(Piece::FARMER, 1);
    }

    public function test_playPiece_HiddenOnWaterSucceeds(): void
    {
        $hex = new Hex(HexType::WATER, 0, 0);
        $hex->playPiece(Piece::HIDDEN, 1);
        $this->assertSame(1, $hex->player_id);
    }

    public function test_playPiece_UnHiddenOnWaterFails(): void
    {
        $hex = new Hex(HexType::WATER, 0, 0);
        $this->expectException(LogicException::class);
        $hex->playPiece(Piece::PRIEST, 1);
    }

    public function test_isLandAndIsWaterSucceed() {
        $hex = Hex::land(4, 5);
        $this->assertTrue($hex->isLand());
        $this->assertFalse($hex->isWater());

        $hex = Hex::water(5, 5);
        $this->assertTrue($hex->isWater());
        $this->assertFalse($hex->isLand());
    }

    public function test_toStringSucceeds() {
        $hex = Hex::land(4, 5);
        $this->assertSame("LAND 4:5 empty(0)", "$hex");
        $hex->placeDevelopment(Piece::FIELD_5);
        $this->assertSame("LAND 4:5 field_5(0)", "$hex");

        $hex = Hex::land(4, 5);
        $hex->playPiece(Piece::PRIEST, 3);
        $this->assertSame("LAND 4:5 priest(3)", "$hex");
    }
}
