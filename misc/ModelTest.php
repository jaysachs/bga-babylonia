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
        Stats,
        TurnProgress,
        ZigguratCard,
        ZigguratCardType,
};

class TestStatsImpl /* implements StatsImpl */ {
    private array $stats = [];
    public function incStat(mixed $delta, string $name, ?int $player_id = null) : void {
        $key = $player_id === null ? '@' . $name : $name . $player_id;
        @ $this->stats[$key] += $delta;
    }
    public function setStat(mixed $val, string $name, ?int $player_id = null) : void {
        $key = $player_id === null ? '@' . $name : $name . $player_id;
        $this->stats[$key] = $val;
    }

    // for now, these two are not used in the tests
    public function getStat(string $name, ?int $player_id = null): mixed {
        $key = $player_id === null ? '@' . $name : $name . $player_id;
        return @ $this->stats[$key];
    }
    public function initStat(string $type, string $name, mixed $val, ?int $player_id = null): void {
        $key = $player_id === null ? '@' . $name : $name . $player_id;
        $this->stats[$key] = $val;
    }
}

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
    private Model $model;
    private TestStore $ps;
    private TestStatsImpl $simpl;

    protected function setUp(): void {
        $this->simpl = new TestStatsImpl();
        $this->ps = new TestStore();
        $this->ps->setBoard(Board::forPlayerCount(2));
        $this->model = new Model($this->ps, new Stats($this->simpl), 1);
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

    public function testIsPlayAllowedFirstPieceOfTurn_allowed() {
        $this->setMap(ModelTest::MAP4);

        $this->assertTrue($this->model->isPlayAllowed(Piece::MERCHANT, $this->ps->hex(2,0)));
        $this->assertTrue($this->model->isPlayAllowed(Piece::HIDDEN, $this->ps->hex(4,2)));
        $this->assertTrue($this->model->isPlayAllowed(Piece::FARMER, $this->ps->hex(4,2)));
        $this->assertTrue($this->model->isPlayAllowed(Piece::SERVANT, $this->ps->hex(6,2)));
    }

    public function testIsPlayAllowedFirstPieceOfTurn_forbidden() {
        $this->setMap(ModelTest::MAP4);

        // not on a city
        $this->assertFalse($this->model->isPlayAllowed(Piece::MERCHANT, $this->ps->hex(1,1)));
        // not on a ziggurat
        $this->assertFalse($this->model->isPlayAllowed(Piece::SERVANT, $this->ps->hex(3,1)));
        // not on a friendly piece
        $this->assertFalse($this->model->isPlayAllowed(Piece::SERVANT, $this->ps->hex(4,0)));
        // not on an opponent piece
        $this->assertFalse($this->model->isPlayAllowed(Piece::SERVANT, $this->ps->hex(5,1)));
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
        $this->assertTrue($this->model->isPlayAllowed(Piece::FARMER, $this->ps->hex(2, 4)));
        // but only a farmer
        $this->assertFalse($this->model->isPlayAllowed(Piece::SERVANT, $this->ps->hex(2, 4)));
        // also, can't play an extra farmer into the water
        $this->assertFalse($this->model->isPlayAllowed(Piece::FARMER, $this->ps->hex(4, 2)));
    }


    const MAP6 = <<<'END'
        ---   ---
           F.5   ---
        ---   ===   ---
    END;

    public function testPlayPiecesOnFields_noAdjacentNoble() {
        $this->setMap(ModelTest::MAP6);
        $this->assertFalse($this->model->isPlayAllowed(Piece::FARMER, $this->ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_nobleNoZigguratCard() {
        $this->setMap(ModelTest::MAP6);
        $this->assertFalse($this->model->isPlayAllowed(Piece::SERVANT, $this->ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_onlyAdjacentFarmer() {
        $this->setMap(ModelTest::MAP6);
        $this->ps->setHand([Piece::FARMER]);
        // An adjacent farmer doesn't help
        $m1 = $this->model->playPiece(0, new RowCol(2, 0));
        $this->assertFalse($this->model->isPlayAllowed(Piece::FARMER, $this->ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_adjacentHiddenNobleInWater() {
        $this->setMap(ModelTest::MAP6);
        $this->ps->setHand([Piece::SERVANT]);
        $m2 = $this->model->playPiece(0, new RowCol(2, 2));
        $this->assertFalse($this->model->isPlayAllowed(Piece::FARMER, $this->ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_adjacentNobleOnLand() {
        $this->setMap(ModelTest::MAP6);
        $this->ps->setHand([Piece::SERVANT]);
        $m3 = $this->model->playPiece(0, new RowCol(0, 2));
        $this->assertTrue($this->model->isPlayAllowed(Piece::FARMER, $this->ps->hex(1,1)));
    }

    public function testPlayPiecesOnFields_loneNobleWithZigguratCard() {
        $this->setMap(ModelTest::MAP6);
        $this->model->selectZigguratCard(ZigguratCardType::NOBLES_IN_FIELDS);
        $this->assertTrue($this->model->isPlayAllowed(Piece::SERVANT, $this->ps->hex(1,1)));
    }

    public function testPlayPieces_threeNoblesOnLand() {
        $this->setMap(ModelTest::MAP6);
        $this->model->selectZigguratCard(ZigguratCardType::NOBLES_3_KINDS);
        $this->ps->setHand([Piece::SERVANT, Piece::MERCHANT, Piece::PRIEST, Piece::FARMER, Piece::MERCHANT]);
        $this->model->playPiece(0, new RowCol(0, 0));
        $this->model->playPiece(1, new RowCol(2, 0));
        $this->assertTrue($this->model->isPlayAllowed(Piece::PRIEST, $this->ps->hex(0, 2)));
        $this->assertFalse($this->model->isPlayAllowed(Piece::SERVANT, $this->ps->hex(0, 2)));
        $this->assertFalse($this->model->isPlayAllowed(Piece::FARMER, $this->ps->hex(0, 2)));
        $this->model->playPiece(2, new RowCol(0, 2));
        $this->assertFalse($this->model->isPlayAllowed(PIECE::PRIEST, $this->ps->hex(1,3)));
    }

    public function testPlayPieces_threeNoblesOneInWater() {
        $this->setMap(ModelTest::MAP6);
        $this->model->selectZigguratCard(ZigguratCardType::NOBLES_3_KINDS);
        $this->ps->setHand([Piece::SERVANT, Piece::MERCHANT, Piece::PRIEST, Piece::FARMER, Piece::MERCHANT]);
        $this->model->playPiece(0, new RowCol(0, 0));
        $this->model->playPiece(1, new RowCol(2, 2));
        $this->assertFalse($this->model->isPlayAllowed(Piece::PRIEST, $this->ps->hex(0, 2)));
        $this->assertFalse($this->model->isPlayAllowed(Piece::SERVANT, $this->ps->hex(0, 2)));
        $this->assertFalse($this->model->isPlayAllowed(Piece::FARMER, $this->ps->hex(0, 2)));
    }
}
