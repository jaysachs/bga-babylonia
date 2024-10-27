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
    private array $players_data = [
        1 => ["score"=> 0, "captured_city_count"=> 0],
        2 => ["score"=> 0, "captured_city_count"=> 0],
        3 => ["score"=> 0, "captured_city_count"=> 0]
    ];
    public function __construct() {
        Db::__construct(null);
    }
    public function &retrievePlayersData(): array {
        return $this->players_data;
    }
    public function insertBoard(Board $b): void { $this->board = $b; }
    public function insertPlayerInfos(array $pis): void { }
    public function insertZigguratCards(array $zs): void { }
    public function retrieveBoard(): Board { return $this->board; }

    public function updateHex(Hex $hex): void { }
    public function updatePlayers(array $pd): void {
        foreach ($pd as $pid => $d) {
            $this->players_data[$pid] = $d;
        }
    }
}

final class ModelTest extends TestCase
{
    public function testCityScoring(): void
    {
        $board = Board::forPlayerCount(2, false);
        $db = new TestDb();
        $db->insertBoard($board);
        $model = new Model($db, 0);

        $board->hexAt(4, 0)->playPiece(Piece::PRIEST, 1);

        $board->hexAt(7, 1)->playPiece(Piece::MERCHANT, 2);

        $board->hexAt(2, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(5, 1)->playPiece(Piece::PRIEST, 3);
        $board->hexAt(6, 2)->playPiece(Piece::HIDDEN, 3);
        $board->hexAt(5, 3)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(8, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(4, 4)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(2, 4)->playPiece(Piece::PRIEST, 1);

        $sc = $model->scoreCity($board->hexAt(6,0));
        $this->assertEquals(0, $sc->pointsForPlayer(1));
        $this->assertEquals(2, $sc->pointsForPlayer(2));
        // 6 for the hexes, 1 for captured city
        $this->assertEquals(7, $sc->pointsForPlayer(3));
        $this->assertEquals([], $sc->hexesScoringForPlayer(1));
        $this->assertEquals([$board->hexAt(7, 1)],
                            $sc->hexesScoringForPlayer(2));
        $this->assertEquals([$board->hexAt(5, 3), $board->hexAt(4, 4), $board->hexAt(8,0)],
                            $sc->hexesScoringForPlayer(3));
        $this->assertEquals(3, $sc->captured_by);

        $this->assertEquals(
            [
                1 => ["score"=> 0, "captured_city_count"=> 0],
                2 => ["score"=> 2, "captured_city_count"=> 0],
                3 => ["score"=> 7, "captured_city_count"=> 1]
            ],
            $db->retrievePlayersData()
        );

        $sc = $model->scoreCity($board->hexAt(3, 3));
        $this->assertEquals(3, $sc->captured_by);
        $this->assertEquals(2, $sc->pointsForPlayer(1));
        $this->assertEquals(0, $sc->pointsForPlayer(2));
        //        $this->assertEquals(4, $sc->pointsForPlayer(3));
        $this->assertEquals([$board->hexAt(2, 4)],
                            $sc->hexesScoringForPlayer(1));
        $this->assertEquals([],
                            $sc->hexesScoringForPlayer(2));
        $this->assertEquals([$board->hexAt(5, 1)],
                            $sc->hexesScoringForPlayer(3));

        $this->assertEquals(
            [
                1 => ["score"=> 2, "captured_city_count"=> 0],
                2 => ["score"=> 2, "captured_city_count"=> 0],
                3 => ["score"=> 11, "captured_city_count"=> 2]
            ],
            $db->retrievePlayersData()
        );

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

