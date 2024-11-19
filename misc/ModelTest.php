<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        Board,
        Components,
        Hand,
        Hex,
        HexType,
        Model,
        Move,
        PersistentStore,
        Piece,
        PlayerInfo,
        ScoredCity,
        TurnProgress,
        ZigguratCard,
        ZigguratCardType,
};

class TestStore extends PersistentStore {
    private Board $board;
    private array $player_infos = [];
    private Components $components;
    private TurnProgress $turnProgress;
    private Hand $hand;

    public static function fromMap(string $map): TestStore {
        return new TestStore(Board::fromTestMap($map));
    }

    public function __construct(Board $board) {
        $this->board = $board;
        $this->hand = Hand::new();
        PersistentStore::__construct(null);
        for ($i = 1; $i <= 3; $i++) {
            $this->player_infos[$i] = new PlayerInfo($i, "", 0, 0, 0, 5, 25);
        }
        $this->components = Components::forNewGame(false);
        $this->turnProgress = new TurnProgress();
    }

    /* overrides of PersistentStore */
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
    public function retrieveTurnProgress(int $player_id): TurnProgress {
        return $this->turnProgress;
    }
    public function retrieveHand(int $player_id): Hand {
        return $this->hand;
    }
    public function insertMove(Move $move) {
        // $this->turnProgress->addMove($move);
    }
    public function updateZigguratCard(ZigguratCard $card) {
    }

    /* test utility methods */
    public function hex(int $r, int $c) {
        return $this->board->hexAt($r, $c);
    }
    public function setHand(array /* Piece */ $pieces) {
        foreach ($pieces as $piece) {
            $this->hand->replenish($piece);
        }
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

    const MAP4 = <<<'END'
XXX   XXX  XXX
   C.S   XXX
---   h-1   f-2
   ZZZ   C.P
p-1   ===   s-2
   f-2   m-1
C.M   ---
   p-3
s-3
END;

    public function testIsPlayAllowedFirstPieceOfTurn_allowed() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP4));
        $model = new Model($ps, 1);

        $this->assertTrue($model->isPlayAllowed(Piece::MERCHANT, $ps->hex(2,0)));
        $this->assertTrue($model->isPlayAllowed(Piece::HIDDEN, $ps->hex(4,2)));
        $this->assertTrue($model->isPlayAllowed(Piece::FARMER, $ps->hex(4,2)));
        $this->assertTrue($model->isPlayAllowed(Piece::SERVANT, $ps->hex(6,2)));
    }

    public function testIsPlayAllowedFirstPieceOfTurn_forbidden() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP4));
        $model = new Model($ps, 1);

        // not on a city
        $this->assertFalse($model->isPlayAllowed(Piece::MERCHANT, $ps->hex(1,1)));
        // not on a ziggurat
        $this->assertFalse($model->isPlayAllowed(Piece::SERVANT, $ps->hex(3,1)));
        // not on a friendly piece
        $this->assertFalse($model->isPlayAllowed(Piece::SERVANT, $ps->hex(4,0)));
        // not on an opponent piece
        $this->assertFalse($model->isPlayAllowed(Piece::SERVANT, $ps->hex(5,1)));
    }

    const MAP5 = <<<'END'
XXX   XXX   XXX
   C.S   XXX
---   h-1   ---
   ZZZ   C.P
---   ===   s-2
   f-2   m-1
C.M   ---
   ---
s-3
END;

    public function testPlayPiecesMoreThanTwoFarmers() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP5));
        $model = new Model($ps, 1);
        $ps->setHand([Piece::FARMER, Piece::SERVANT, Piece::FARMER, Piece::FARMER, Piece::FARMER]);
        $m1 = $model->playPiece(0, 2, 0);
        $m2 = $model->playPiece(3, 4, 0);
        $m3 = $model->playPiece(2, 7, 1);
        $m4 = $model->playPiece(4, 6, 2);
        // if we had another farmer, it would be allowed
        $this->assertTrue($model->isPlayAllowed(Piece::FARMER, $ps->hex(2, 4)));
        // but only a farmer
        $this->assertFalse($model->isPlayAllowed(Piece::SERVANT, $ps->hex(2, 4)));
        // also, can't play an extra farmer into the water
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(4, 2)));
    }


    const MAP6 = <<<'END'
---   ---   XXX
   F.5   ---
---   ===   ---
END;

    public function testPlayPiecesOnFields() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        // No adjacent noble
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(1,1)));

        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        // Not a noble without zig card
        $this->assertFalse($model->isPlayAllowed(Piece::SERVANT, $ps->hex(1,1)));

        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $ps->setHand([Piece::FARMER]);
        // An adjacent farmer doesn't help
        $m1 = $model->playPiece(0, 2, 0);
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(1,1)));

        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $ps->setHand([Piece::SERVANT]);
        // Nor does a noble in water
        $m2 = $model->playPiece(0, 2, 2);
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(1,1)));

        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $ps->setHand([Piece::SERVANT]);
        // But an adjacent noble on land helps
        $m3 = $model->playPiece(0, 0, 2);
        $this->assertTrue($model->isPlayAllowed(Piece::FARMER, $ps->hex(1,1)));

        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $model->selectZigguratCard(ZigguratCardType::NOBLES_IN_FIELDS);
        // Or we can have the appropriate zig card and play a noble
        $this->assertTrue($model->isPlayAllowed(Piece::SERVANT, $ps->hex(1,1)));
    }
}
