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

    public static function fromMap(string $map): TestStore {
        return new TestStore(Board::fromTestMap($map));
    }

    public function __construct(Board $board) {
        $this->board = $board;
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

    public function hex(int $r, int $c) {
        return $this->board->hexAt($r, $c);
    }
}

final class ModelTest extends TestCase
{
    public function testCitiesRequiringScoringNoPieces(): void
    {
        $ps = new TestStore(Board::forPlayerCount(2));
        $model = new Model($ps, 0);

        $this->assertEquals([], $model->hexesRequiringScoring());
    }
    const MAP1 = <<<'END'
XXX   XXX  XXX
   ---   XXX
---   ===   ---
   ZZZ   C.P
p-1   ===   ---
   f-2   ---
C.M   ---
   p-3
---
END;

    public function testCitiesRequiringScoringNotSurrounded(): void {
        $ps = TestStore::fromMap(ModelTest::MAP1);
        $model = new Model($ps, 0);
        $this->assertEquals([], $model->hexesRequiringScoring());
    }

    const MAP2 = <<<'END'
XXX   XXX  XXX
   ---   XXX
---   ===   ---
   ZZZ   C.P
p-1   ===   ---
   f-2   ---
C.M   ---
   p-3
s-3
END;

    public function testCitiesRequiringScoringOneSurrounded(): void {
        $ps = TestStore::fromMap(ModelTest::MAP2);
        $model = new Model($ps, 0);
        $this->assertEquals([$ps->hex(6, 0)],
                            $model->hexesRequiringScoring());
    }

    const MAP3 = <<<'END'
XXX   XXX  XXX
   C.S   XXX
---   h-1   f-2
   ZZZ   C.P
p-1   h-3   s-2
   f-2   m-1
C.M   ---
   p-3
s-3
END;

    public function testCitiesRequiringScoringMultipleSurrounded(): void {
        $ps = TestStore::fromMap(ModelTest::MAP3);
        $model = new Model($ps, 0);
        $this->assertEqualsCanonicalizing(
            [$ps->hex(6, 0), $ps->hex(3,3)],
            $model->hexesRequiringScoring());
    }


    public function testZigguratsRequiringScoring(): void
    {
        $board = Board::forPlayerCount(2);
        $ps = new TestStore($board);
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
