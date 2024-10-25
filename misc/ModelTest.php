<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
    Hex,
    HexType,
      Model,
      Board,
        ScoredCity,
        Piece,
        Db,
};

class TestDb extends Db {
    private ?Board $board = null;
    public function __construct() {
        Db::__construct(null);
    }
    public function retrievePlayersData(): array {
        return [1 => ["score"=> 0, "captured_city_count"=> 0],
                2 => ["score"=> 0, "captured_city_count"=> 0],
                3 => ["score"=> 0, "captured_city_count"=> 0]];
    }
    public function insertBoard(Board $b): void { $this->board = $b; }
    public function insertPlayerInfos(array $pis): void { }
    public function insertZigguratCards(array $zs): void { }
    public function retrieveBoard(): Board { return $this->board; }

    public function updateHex(Hex $hex): void { }
    public function updatePlayers(array $pd): void { }
}

final class ModelTest extends TestCase
{
    public function testCityScoring(): void
    {
        $board = Board::forPlayerCount(2, false);
        $db = new TestDb();
        $db->insertBoard($board);
        $model = new Model($db, 0);
        $city = $board->hexAt(6,0);

        $board->hexAt(4, 0)->playPiece(Piece::PRIEST, 1);

        $board->hexAt(7, 1)->playPiece(Piece::MERCHANT, 2);

        $board->hexAt(2, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(5, 1)->playPiece(Piece::FARMER, 3);
        $board->hexAt(6, 2)->playPiece(Piece::HIDDEN, 3);
        $board->hexAt(5, 3)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(8, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(4, 4)->playPiece(Piece::MERCHANT, 3);
        $this->assertEquals(
            new ScoredCity($city->piece,
                [
                    1 => [],
                    2 => [$board->hexAt(7, 1)],
                    3 => [$board->hexAt(5, 3), $board->hexAt(4, 4), $board->hexAt(8,0)]
                ],
                3,
                [
                    1 => 0,
                    2 => 0,
                    3 => 0,
                ]
            ),
            $model->scoreCity($city));
    }
    
    public function testCitiesRequiringScoring(): void
    {
        $board = Board::forPlayerCount(2, false);
        $db = new TestDb();
        $db->insertBoard($board);
        $model = new Model($db, 0);
        
        $this->assertEquals([], $model->citiesRequiringScoring());

        $board->hexAt(4, 0)->playPiece(Piece::PRIEST, 1);
        $board->hexAt(5, 1)->playPiece(Piece::FARMER, 2);
        $board->hexAt(7, 1)->playPiece(Piece::PRIEST, 3);
        $this->assertEquals([], $model->citiesRequiringScoring());

        $board->hexAt(8, 0)->playPiece(Piece::PRIEST, 3);
        $this->assertEquals([$board->hexAt(6, 0)], $model->citiesRequiringScoring());
    }
    
    public function testZigguratsRequiringScoring(): void
    {
        $board = Board::forPlayerCount(2);
        $db = new TestDb();
        $db->insertBoard($board);
        $model = new Model($db, 0);
        
        $this->assertEquals([], $model->zigguratsRequiringScoring());

        $board->hexAt(2, 0)->playPiece(Piece::PRIEST, 1);
        $board->hexAt(4, 0)->playPiece(Piece::FARMER, 2);
        $board->hexAt(1, 1)->playPiece(Piece::PRIEST, 3);
        $this->assertEquals([], $model->zigguratsRequiringScoring());

        $board->hexAt(5, 1)->playPiece(Piece::PRIEST, 3);
        $this->assertEquals([$board->hexAt(3, 1)],
                            $model->zigguratsRequiringScoring());

        $board->hexAt(3, 1)->scored = true;
        $this->assertEquals([], $model->zigguratsRequiringScoring());
    }
}

