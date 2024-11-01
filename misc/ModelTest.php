<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
    Hex,
    HexType,
      Model,
      Board,
        Components,
        ScoredCity,
        Piece,
        PlayerInfo,
        PersistentStore,
};

class TestStore extends PersistentStore {
    private ?Board $board = null;
    private array $player_infos = [];
    private Components $components;

    public function __construct() {
        PersistentStore::__construct(null);
        for ($i = 1; $i <= 3; $i++) {
            $this->player_infos[$i] = new PlayerInfo($i, "", 0, 0, 0, 5, 25);
        }
        $this->components = Components::forNewGame(false);
    }

    public function insertBoard(Board $b): void { $this->board = $b; }
    public function insertPlayerInfos(array $pis): void { }
    public function insertZigguratCards(array $zs): void { }
    public function retrieveBoard(): Board { return $this->board; }
    public function retrieveAllPlayerInfo(): array {
        return $this->player_infos;
    }
    public function updateHex(Hex $hex): void { }
    public function updatePlayers(array /* PlayerInfo */ $pis): void {
    }
    public function retrieveComponents(): Components {
        return $this->components;
    }
}

final class ModelTest extends TestCase
{
    public function testCityScoring(): void
    {
        $board = Board::forPlayerCount(2, false);
        $ps = new TestStore();
        $ps->insertBoard($board);
        $model = new Model($ps, 0);

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
                1 => new PlayerInfo(1, "", 0, 0, 0, 5, 25),
                2 => new PlayerInfo(2, "", 0, 2, 0, 5, 25),
                3 => new PlayerInfo(3, "", 0, 7, 1, 5, 25),
            ],
            $ps->retrieveAllPlayerInfo()
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
                1 => new PlayerInfo(1, "", 0, 2, 0, 5, 25),
                2 => new PlayerInfo(2, "", 0, 2, 0, 5, 25),
                3 => new PlayerInfo(3, "", 0, 11, 2, 5, 25),
            ],
            $ps->retrieveAllPlayerInfo()
        );

    }

    public function testCitiesRequiringScoring(): void
    {
        $board = Board::forPlayerCount(2, false);
        $ps = new TestStore();
        $ps->insertBoard($board);
        $model = new Model($ps, 0);

        $this->assertEquals([], $model->hexesRequiringScoring());

        $board->hexAt(4, 0)->playPiece(Piece::PRIEST, 1);
        $board->hexAt(5, 1)->playPiece(Piece::FARMER, 2);
        $board->hexAt(7, 1)->playPiece(Piece::PRIEST, 3);
        $this->assertEquals([], $model->hexesRequiringScoring());

        $board->hexAt(8, 0)->playPiece(Piece::PRIEST, 3);
        $this->assertEquals([$board->hexAt(6, 0)], $model->hexesRequiringScoring());
    }

    public function testZigguratsRequiringScoring(): void
    {
        $board = Board::forPlayerCount(2);
        $ps = new TestStore();
        $ps->insertBoard($board);
        $model = new Model($ps, 0);

        $this->assertEquals([], $model->hexesRequiringScoring());

        $board->hexAt(2, 0)->playPiece(Piece::PRIEST, 1);
        $board->hexAt(4, 0)->playPiece(Piece::FARMER, 2);
        $board->hexAt(1, 1)->playPiece(Piece::PRIEST, 3);
        $this->assertEquals([], $model->hexesRequiringScoring());

        $board->hexAt(5, 1)->playPiece(Piece::PRIEST, 3);
        $this->assertEquals([$board->hexAt(3, 1)],
                            $model->hexesRequiringScoring());

        $board->hexAt(3, 1)->scored = true;
        $this->assertEquals([], $model->hexesRequiringScoring());
    }
}
