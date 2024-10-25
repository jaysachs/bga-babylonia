<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
    Hex,
    HexType,
      Model,
      Board,
        Piece,
        Db,
};

class TestDb extends Db {
    private ?Board $board = null;
    public function __construct() {
        Db::__construct(null);
    }
    public function insertBoard(Board $b): void { $this->board = $b; }
    public function insertPlayerInfos(array $pis): void { }
    public function insertZigguratCards(array $zs): void { }
    public function retrieveBoard(): Board { return $this->board; }
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
        error_log("$city");
        $board->hexAt(4, 0)->playPiece(Piece::PRIEST, 1);

        $board->hexAt(7, 1)->playPiece(Piece::MERCHANT, 2);

        $board->hexAt(2, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(5, 1)->playPiece(Piece::FARMER, 3);
        $board->hexAt(6, 2)->playPiece(Piece::HIDDEN, 3);
        $board->hexAt(5, 3)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(8, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(4, 4)->playPiece(Piece::MERCHANT, 3);
        $this->assertEquals([2 => 1, 3 => 3, "wonby" => 3],
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

