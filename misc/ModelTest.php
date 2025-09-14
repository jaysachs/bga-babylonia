<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

require_once("modules/php/Stats.php");

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
        Stats,
        TestStatsImpl,
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

    public function setBoardFromMap(string $map) {
        $this->board = Board::fromTestMap($map);
    }

    public function setBoard(Board $board) {
        $this->board = $board;
    }

    public function __construct() {
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
    public function insertMove(Move $move, array $statOps): void {
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
    private Model $model;
    private TestStore $ps;

    protected function setUp(): void {
        $this->ps = new TestStore();
        $this->ps->setBoard(Board::forPlayerCount(2));
        $this->model = new Model($this->ps, Stats::createForTest([1, 2]), 1);
    }

    private function setMap(string $map): void {
        $this->ps->setBoardFromMap($map);
    }

    public function testCitiesRequiringScoringNoPieces(): void
    {
        $this->assertEquals([], $this->model->locationsRequiringScoring());
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
        $this->setMap(ModelTest::MAP1);
        $this->assertEquals([], $this->model->locationsRequiringScoring());
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
        $this->setMap(ModelTest::MAP2);
        $this->assertEquals([new RowCol(6, 0)],
                            $this->model->locationsRequiringScoring());
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
        $this->setMap(ModelTest::MAP3);
        $this->assertEqualsCanonicalizing(
            [new RowCol(6, 0), new RowCol(3,3)],
            $this->model->locationsRequiringScoring());
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
        $this->setMap(ModelTest::MAP7);

        $this->assertEquals([], $this->model->locationsRequiringScoring());

        $this->ps->hex(2, 0)->playPiece(Piece::PRIEST, 1);
        $this->assertEquals([new RowCol(3, 1)],
                            $this->model->locationsRequiringScoring());

        $this->ps->hex(3, 1)->scored = true;
        $this->assertEquals([], $this->model->locationsRequiringScoring());
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

    public function testcheckPlayFirstPieceOfTurn_allowed() {
        $this->setMap(ModelTest::MAP4);

        $this->assertTrue($this->model->checkPlay(Piece::MERCHANT, $this->ps->hex(2,0))->isAllowed());
        $this->assertTrue($this->model->checkPlay(Piece::HIDDEN, $this->ps->hex(4,2))->isAllowed());
        $this->assertTrue($this->model->checkPlay(Piece::FARMER, $this->ps->hex(4,2))->isAllowed());
        $this->assertTrue($this->model->checkPlay(Piece::SERVANT, $this->ps->hex(6,2))->isAllowed());
    }

    public function testcheckPlayFirstPieceOfTurn_forbidden() {
        $this->setMap(ModelTest::MAP4);

        // not on a city
        $this->assertFalse($this->model->checkPlay(Piece::MERCHANT, $this->ps->hex(1,1))->isAllowed());
        // not on a ziggurat
        $this->assertFalse($this->model->checkPlay(Piece::SERVANT, $this->ps->hex(3,1))->isAllowed());
        // not on a friendly piece
        $this->assertFalse($this->model->checkPlay(Piece::SERVANT, $this->ps->hex(4,0))->isAllowed());
        // not on an opponent piece
        $this->assertFalse($this->model->checkPlay(Piece::SERVANT, $this->ps->hex(5,1))->isAllowed());
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
        $this->setMap(ModelTest::MAP5);
        $this->ps->setHand([Piece::FARMER, Piece::SERVANT, Piece::FARMER, Piece::FARMER, Piece::FARMER]);
        $m1 = $this->model->playPiece(0, new RowCol(2, 0));
        $m2 = $this->model->playPiece(3, new RowCol(4, 0));
        $m3 = $this->model->playPiece(2, new RowCol(7, 1));
        $m4 = $this->model->playPiece(4, new RowCol(6, 2));
        // if we had another farmer, it would be allowed
        $this->assertTrue($this->model->checkPlay(Piece::FARMER, $this->ps->hex(2, 4))->isAllowed());
        // but only a farmer
        $this->assertFalse($this->model->checkPlay(Piece::SERVANT, $this->ps->hex(2, 4))->isAllowed());
        // also, can't play an extra farmer into the water
        $this->assertFalse($this->model->checkPlay(Piece::FARMER, $this->ps->hex(4, 2))->isAllowed());
    }


    const MAP6 = <<<'END'
        ---   ---
           F.5   ---
        ---   ===   ---
    END;

    public function testPlayPiecesOnFields_noAdjacentNoble() {
        $this->setMap(ModelTest::MAP6);
        $this->assertFalse($this->model->checkPlay(Piece::FARMER, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_nobleNoZigguratCard() {
        $this->setMap(ModelTest::MAP6);
        $this->assertFalse($this->model->checkPlay(Piece::SERVANT, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_onlyAdjacentFarmer() {
        $this->setMap(ModelTest::MAP6);
        $this->ps->setHand([Piece::FARMER]);
        // An adjacent farmer doesn't help
        $m1 = $this->model->playPiece(0, new RowCol(2, 0));
        $this->assertFalse($this->model->checkPlay(Piece::FARMER, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_adjacentHiddenNobleInWater() {
        $this->setMap(ModelTest::MAP6);
        $this->ps->setHand([Piece::SERVANT]);
        $m2 = $this->model->playPiece(0, new RowCol(2, 2));
        $this->assertFalse($this->model->checkPlay(Piece::FARMER, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_adjacentNobleOnLand() {
        $this->setMap(ModelTest::MAP6);
        $this->ps->setHand([Piece::SERVANT]);
        $m3 = $this->model->playPiece(0, new RowCol(0, 2));
        $this->assertTrue($this->model->checkPlay(Piece::FARMER, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_loneNobleWithZigguratCard() {
        $this->setMap(ModelTest::MAP6);
        $this->model->selectZigguratCard(ZigguratCardType::NOBLES_IN_FIELDS);
        $result = $this->model->checkPlay(Piece::SERVANT, $this->ps->hex(1,1));
        $this->assertEquals([ZigguratCardType::NOBLES_IN_FIELDS], $result->ziggurat_cards_used);
    }

    public function testPlayPieces_threeNoblesOnLand() {
        $this->setMap(ModelTest::MAP6);
        $this->model->selectZigguratCard(ZigguratCardType::NOBLES_3_KINDS);
        $this->ps->setHand([Piece::SERVANT, Piece::MERCHANT, Piece::PRIEST, Piece::FARMER, Piece::MERCHANT]);
        $this->model->playPiece(0, new RowCol(0, 0));
        $this->model->playPiece(1, new RowCol(2, 0));

        $result = $this->model->checkPlay(Piece::PRIEST, $this->ps->hex(0, 2));

        $this->assertTrue($result->isAllowed());
        $this->assertEquals([ZigguratCardType::NOBLES_3_KINDS], $result->ziggurat_cards_used);
        $this->assertFalse($this->model->checkPlay(Piece::SERVANT, $this->ps->hex(0, 2))->isAllowed());
        $this->assertFalse($this->model->checkPlay(Piece::FARMER, $this->ps->hex(0, 2))->isAllowed());
        $this->model->playPiece(2, new RowCol(0, 2));
        $this->assertFalse($this->model->checkPlay(PIECE::PRIEST, $this->ps->hex(1,3))->isAllowed());
    }

    public function testPlayPieces_threeNoblesOneInWater() {
        $this->setMap(ModelTest::MAP6);
        $this->model->selectZigguratCard(ZigguratCardType::NOBLES_3_KINDS);
        $this->ps->setHand([Piece::SERVANT, Piece::MERCHANT, Piece::PRIEST, Piece::FARMER, Piece::MERCHANT]);
        $this->model->playPiece(0, new RowCol(0, 0));
        $this->model->playPiece(1, new RowCol(2, 2));
        $this->assertFalse($this->model->checkPlay(Piece::PRIEST, $this->ps->hex(0, 2))->isAllowed());
        $this->assertFalse($this->model->checkPlay(Piece::SERVANT, $this->ps->hex(0, 2))->isAllowed());
        $this->assertFalse($this->model->checkPlay(Piece::FARMER, $this->ps->hex(0, 2))->isAllowed());
    }

    const MAP8 = <<<'END'
        XXX   XXX  XXX
           C.S   XXX
        p-2   ===   f-2
           ZZZ   C.P
        p-1   ===   s-2
           f-2   m-1
        C.M   ---
           p-3
        s-3
    END;

    public function testRequiresScoring() {
        $this->setMap(ModelTest::MAP8);
        $this->assertTrue($this->model->hexRequiresScoring($this->model->board()->hexAt(new RowCol(3, 1))));
    }
}
