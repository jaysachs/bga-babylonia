<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        Board,
        Components,
        Db,
        Hand,
        Hex,
        HexType,
        Model,
        Move,
        PersistentStore,
        Piece,
        PlayerInfo,
        RowCol,
        ScoredCity,
        TurnProgress,
        ZigguratCard,
        ZigguratCardType,
};

class TestDb implements Db {
    /** @return string[][] */
    public function getObjectList(string $sql): array {
        return [];
    }

    /** @return string[] */
    public function getSingleFieldList(string $sql): array {
        return [];
    }

    /** @return array<int,string[]> $data */
    public function getCollection($sql): array {
        return [];
    }

    public function execute(string $sql): void { }
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
        PersistentStore::__construct(new TestDb());
        for ($i = 1; $i <= 3; $i++) {
            $this->player_infos[$i] = new PlayerInfo($i, 0, 0, 0, 5, 25);
        }
        $this->components = Components::forNewGame(false);
        $this->turnProgress = new TurnProgress();
    }

    /* overrides of PersistentStore */
    public function insertBoard(Board $b): void { $this->board = $b; }
    public function insertPlayerInfos(array $pis): void { }
    public function insertZigguratCards(array $zs): void { }
    public function retrieveBoard(): Board { return $this->board; }
    public function &retrieveAllPlayerInfo(): array {
        return $this->player_infos;
    }
    public function updateHand(int $player_id, int $handpos, Piece $piece): void { }
    public function incPlayerScore(int $player_id, int $points): void { }

    public function updateHex(RowCol $rc, ?Piece $piece = null, ?int $player_id = null, ?bool $scored = null): void { }
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
    public function insertMove(Move $move): void {
        // $this->turnProgress->addMove($move);
    }
    public function updateZigguratCard(ZigguratCard $card): void {
    }

    /* test utility methods */
    public function hex(int $r, int $c) {
        return $this->board->hexAt(new RowCol($r, $c));
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

        $this->assertEquals([], $model->locationsRequiringScoring());
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
        $this->assertEquals([], $model->locationsRequiringScoring());
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
        $this->assertEquals([new RowCol(6, 0)],
                            $model->locationsRequiringScoring());
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
            [new RowCol(6, 0), new RowCol(3,3)],
            $model->locationsRequiringScoring());
    }


    const MAP7 = <<<'END'
        XXX   XXX  XXX
           p-2   XXX
        ---   h-1   f-2
           ZZZ   C.P
        p-1   ===   ---
           m-2   m-1
        C.M   ---
           ---
        s-3
    END;

    public function testZigguratsRequiringScoring(): void
    {
        $ps = TestStore::fromMap(ModelTest::MAP7);
        $model = new Model($ps, 0);

        $this->assertEquals([], $model->locationsRequiringScoring());

        $ps->hex(2, 0)->playPiece(Piece::PRIEST, 1);
        $this->assertEquals([new RowCol(3, 1)],
                            $model->locationsRequiringScoring());

        $ps->hex(3, 1)->scored = true;
        $this->assertEquals([], $model->locationsRequiringScoring());
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
        $m1 = $model->playPiece(0, new RowCol(2, 0));
        $m2 = $model->playPiece(3, new RowCol(4, 0));
        $m3 = $model->playPiece(2, new RowCol(7, 1));
        $m4 = $model->playPiece(4, new RowCol(6, 2));
        // if we had another farmer, it would be allowed
        $this->assertTrue($model->isPlayAllowed(Piece::FARMER, $ps->hex(2, 4)));
        // but only a farmer
        $this->assertFalse($model->isPlayAllowed(Piece::SERVANT, $ps->hex(2, 4)));
        // also, can't play an extra farmer into the water
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(4, 2)));
    }


    const MAP6 = <<<'END'
        ---   ---
           F.5   ---
        ---   ===   ---
    END;

    public function testPlayPiecesOnFields_noAdjacentNoble() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_nobleNoZigguratCard() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $this->assertFalse($model->isPlayAllowed(Piece::SERVANT, $ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_onlyAdjacentFarmer() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $ps->setHand([Piece::FARMER]);
        // An adjacent farmer doesn't help
        $m1 = $model->playPiece(0, new RowCol(2, 0));
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_adjacentHiddenNobleInWater() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $ps->setHand([Piece::SERVANT]);
        $m2 = $model->playPiece(0, new RowCol(2, 2));
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_adjacentNobleOnLand() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $ps->setHand([Piece::SERVANT]);
        $m3 = $model->playPiece(0, new RowCol(0, 2));
        $this->assertTrue($model->isPlayAllowed(Piece::FARMER, $ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_loneNobleWithZigguratCard() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $model->selectZigguratCard(ZigguratCardType::NOBLES_IN_FIELDS);
        $this->assertTrue($model->isPlayAllowed(Piece::SERVANT, $ps->hex(1,1)));
    }

    public function testPlayPieces_threeNoblesOnLand() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $model->selectZigguratCard(ZigguratCardType::NOBLES_3_KINDS);
        $ps->setHand([Piece::SERVANT, Piece::MERCHANT, Piece::PRIEST, Piece::FARMER, Piece::MERCHANT]);
        $model->playPiece(0, new RowCol(0, 0));
        $model->playPiece(1, new RowCol(2, 0));
        $this->assertTrue($model->isPlayAllowed(Piece::PRIEST, $ps->hex(0, 2)));
        $this->assertFalse($model->isPlayAllowed(Piece::SERVANT, $ps->hex(0, 2)));
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(0, 2)));
        $model->playPiece(2, new RowCol(0, 2));
        $this->assertFalse($model->isPlayAllowed(PIECE::PRIEST, $ps->hex(1,3)));
    }

    public function testPlayPieces_threeNoblesOneInWater() {
        $ps = new TestStore($board = Board::fromTestMap(ModelTest::MAP6));
        $model = new Model($ps, 1);
        $model->selectZigguratCard(ZigguratCardType::NOBLES_3_KINDS);
        $ps->setHand([Piece::SERVANT, Piece::MERCHANT, Piece::PRIEST, Piece::FARMER, Piece::MERCHANT]);
        $model->playPiece(0, new RowCol(0, 0));
        $model->playPiece(1, new RowCol(2, 2));
        $this->assertFalse($model->isPlayAllowed(Piece::PRIEST, $ps->hex(0, 2)));
        $this->assertFalse($model->isPlayAllowed(Piece::SERVANT, $ps->hex(0, 2)));
        $this->assertFalse($model->isPlayAllowed(Piece::FARMER, $ps->hex(0, 2)));
    }
}
