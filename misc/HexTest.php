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
    public function testPlaceFeatureOnEmptyHexSucceeds(): void
    {
        $hex = new Hex(HexType::LAND, 0, 0);
        $hex->placeFeature(Piece::CITY_P);
        $this->assertSame(Piece::CITY_P, $hex->piece);
    }

    public function testPlaceFeatureOnNonEmptyHexFails(): void
    {
        $this->expectException(LogicException::class);

        $hex = new Hex(HexType::LAND, 0, 0);
        $hex->placeFeature(Piece::CITY_P);
        $hex->placeFeature(Piece::CITY_P);
    }

    public function testPlaceFeatureOnWaterFails(): void
    {
        $hex = new Hex(HexType::WATER, 0, 0);
        $this->expectException(LogicException::class);
        $hex->placeFeature(Piece::CITY_P);
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
        $hex->placeFeature(Piece::FIELD_5);
        $hex->playPiece(Piece::FARMER, 1);
        $this->assertSame(Piece::FARMER, $hex->piece);
        $this->assertSame(1, $hex->player_id);
    }

    public function testPlayPieceOnNonFieldFeatureFails(): void
    {
        $hex = new Hex(HexType::LAND, 0, 0);
        $hex->placeFeature(Piece::CITY_S);
        $this->expectException(LogicException::class);
        $hex->playPiece(Piece::FARMER, 1);
    }

    public function testPlayPieceHiddenOnWaterSucceeds(): void
    {
        $hex = new Hex(HexType::WATER, 0, 0);
        $hex->playPiece(Piece::HIDDEN, 1);
        $this->assertSame(1, $hex->player_id);
    }

    public function testPlayPieceUnHiddenOnWaterFails(): void
    {
        $hex = new Hex(HexType::WATER, 0, 0);
        $this->expectException(LogicException::class);
        $hex->playPiece(Piece::PRIEST, 1);
    }

    public function test_fromDbResultSucceeds(): void
    {
        $hex = new Hex(HexType::LAND, 4, 6, Piece::PRIEST, 3);
        $dr = [
            "row" => 4,
            "col" => 6,
            "piece" => "priest",
            "board_player" => 3,
            "hextype" => "LAND",
        ];
        $unmarshalled = Hex::fromDbResult($dr);
        $this->assertEquals($hex, $unmarshalled);
    }
}

