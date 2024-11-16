<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        Board,
        Components,
        Hex,
        HexType,
        Model,
        PersistentStore,
        Piece,
        PlayerInfo,
        ScoredCity,
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
