<?php

declare(strict_types=1);

use Bga\GameFramework\Components\Counters\PlayerCounter;
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\Model\ {
        Board,
        Components,
        Hand,
        Hex,
        Model,
        Move,
        PersistentStore,
        PieceType,
        PlayerInfo,
    Pool,
    RowCol,
        TurnProgress,
        ZigguratCard,
        ZigguratCardType,
};

use Bga\GameFramework\Db\Globals;
use Bga\Games\babylonia\Stats;
use Bga\Games\babylonia\Utils\TestDb;

class TestGlobals extends Globals {}

class TestCounter extends PlayerCounter {}

class TestStore extends PersistentStore {
    private Board $board;
    /** @var array<int,PlayerInfo> */
    private array $player_infos = [];
    private Components $components;
    private TurnProgress $turnProgress;
    private Hand $hand;

    public function setBoardFromMap(string $map): void {
        $this->board = Board::fromTestMap($map);
    }

    public function setBoard(Board $board): void {
        $this->board = $board;
    }

    public function __construct() {
        PersistentStore::__construct(new TestDb(), new TestGlobals(), new TestCounter(), new TestCounter());
        $this->hand = Hand::new();
        for ($i = 1; $i <= 3; $i++) {
            $pool = Pool::new();
            $hand = Hand::new(5);
            $this->player_infos[$i] = new PlayerInfo($i, 0, 0, $hand, $pool);
        }
        $this->components = Components::forNewGame(false);
        $this->turnProgress = new TurnProgress();
    }

    /* overrides of PersistentStore */

    #[Override]
    public function retrieveAllData(int $player_id): array
    {
        return [
            'hand' => $this->hand,
            'board' => $this->board,
            'components' => $this->components,
            'player_infos' => $this->player_infos,
            'turnProgress' => $this->turnProgress,
            'pool' => new Pool([]),
        ];
    }

    public function insertBoard(Board $b): void { $this->board = $b; }
    /** @param array<int,PlayerInfo> $pis */
    public function insertPlayerInfos(array $pis): void { }
    /** @param list<ZigguratCard> $zs */
    public function insertZigguratCards(array $zs): void { }

    public function updateHand(int $player_id, int $handpos, PieceType $piece): void { }
    public function incPlayerScore(int $player_id, int $points): void { }

    public function updateHex(int $rc, ?PieceType $piece = null, ?int $player_id = null, ?bool $scored = null): void { }
    public function updatePlayers(array /* PlayerInfo */ $pis): void {}
    public function insertMove(Move $move, array $statOps): void {
        // $this->turnProgress->addMove($move);
    }
    public function updateZigguratCard(ZigguratCard $card): void {
    }

    /* test utility methods */
    public function hex(int $r, int $c): Hex {
        return $this->board->hexAt(RowCol::fromRowCol($r, $c));
    }
    /** @param list<PieceType> $pieces */
    public function setHand(array $pieces): void {
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
        $this->model = new Model($this->ps, Stats::createForTest(), 1);
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
        $this->assertEquals([RowCol::fromRowCol(6, 0)],
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
            [RowCol::fromRowCol(6, 0), RowCol::fromRowCol(3,3)],
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

        $this->ps->hex(2, 0)->playPiece(PieceType::PRIEST, 1);
        $this->assertEquals([RowCol::fromRowCol(3, 1)],
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

    public function testcheckPlayFirstPieceOfTurn_allowed(): void {
        $this->setMap(ModelTest::MAP4);

        $this->assertTrue($this->model->checkPlay(PieceType::MERCHANT, $this->ps->hex(2,0))->isAllowed());
        $this->assertTrue($this->model->checkPlay(PieceType::HIDDEN, $this->ps->hex(4,2))->isAllowed());
        $this->assertTrue($this->model->checkPlay(PieceType::FARMER, $this->ps->hex(4,2))->isAllowed());
        $this->assertTrue($this->model->checkPlay(PieceType::SERVANT, $this->ps->hex(6,2))->isAllowed());
    }

    public function testcheckPlayFirstPieceOfTurn_forbidden(): void {
        $this->setMap(ModelTest::MAP4);

        // not on a city
        $this->assertFalse($this->model->checkPlay(PieceType::MERCHANT, $this->ps->hex(1,1))->isAllowed());
        // not on a ziggurat
        $this->assertFalse($this->model->checkPlay(PieceType::SERVANT, $this->ps->hex(3,1))->isAllowed());
        // not on a friendly piece
        $this->assertFalse($this->model->checkPlay(PieceType::SERVANT, $this->ps->hex(4,0))->isAllowed());
        // not on an opponent piece
        $this->assertFalse($this->model->checkPlay(PieceType::SERVANT, $this->ps->hex(5,1))->isAllowed());
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

    public function testPlayPiecesMoreThanTwoFarmers(): void {
        $this->setMap(ModelTest::MAP5);
        $this->ps->setHand([PieceType::FARMER, PieceType::SERVANT, PieceType::FARMER, PieceType::FARMER, PieceType::FARMER]);
        $m1 = $this->model->playPiece(0, RowCol::fromRowCol(2, 0));
        $m2 = $this->model->playPiece(3, RowCol::fromRowCol(4, 0));
        $m3 = $this->model->playPiece(2, RowCol::fromRowCol(7, 1));
        $m4 = $this->model->playPiece(4, RowCol::fromRowCol(6, 2));
        // if we had another farmer, it would be allowed
        $this->assertTrue($this->model->checkPlay(PieceType::FARMER, $this->ps->hex(2, 4))->isAllowed());
        // but only a farmer
        $this->assertFalse($this->model->checkPlay(PieceType::SERVANT, $this->ps->hex(2, 4))->isAllowed());
        // also, can't play an extra farmer into the water
        $this->assertFalse($this->model->checkPlay(PieceType::FARMER, $this->ps->hex(4, 2))->isAllowed());
    }


    const MAP6 = <<<'END'
        ---   ---
           F.5   ---
        ---   ===   ---
    END;

    public function testPlayPiecesOnFields_noAdjacentPiece(): void {
        $this->setMap(ModelTest::MAP6);
        $this->assertFalse($this->model->checkPlay(PieceType::FARMER, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_nobleNoZigguratCard(): void {
        $this->setMap(ModelTest::MAP6);
        $this->assertFalse($this->model->checkPlay(PieceType::SERVANT, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_onlyAdjacentFarmer(): void {
        $this->setMap(ModelTest::MAP6);
        $this->ps->setHand([PieceType::FARMER]);
        $m1 = $this->model->playPiece(0, RowCol::fromRowCol(2, 0));
        $this->assertTrue($this->model->checkPlay(PieceType::FARMER, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_adjacentHiddenNobleInWater(): void {
        $this->setMap(ModelTest::MAP6);
        $this->ps->setHand([PieceType::SERVANT]);
        $m2 = $this->model->playPiece(0, RowCol::fromRowCol(2, 2));
        $this->assertFalse($this->model->checkPlay(PieceType::FARMER, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_adjacentNobleOnLand(): void {
        $this->setMap(ModelTest::MAP6);
        $this->ps->setHand([PieceType::SERVANT]);
        $m3 = $this->model->playPiece(0, RowCol::fromRowCol(0, 2));
        $this->assertTrue($this->model->checkPlay(PieceType::FARMER, $this->ps->hex(1,1))->isAllowed());
    }

    public function testPlayPiecesOnFields_loneNobleWithZigguratCard(): void {
        $this->setMap(ModelTest::MAP6);
        $this->model->selectZigguratCard(ZigguratCardType::NOBLES_IN_FIELDS);
        $result = $this->model->checkPlay(PieceType::SERVANT, $this->ps->hex(1,1));
        $this->assertEquals([ZigguratCardType::NOBLES_IN_FIELDS], $result->activatedCards());
    }

    public function testPlayPieces_threeNoblesOnLand(): void {
        $this->setMap(ModelTest::MAP6);
        $this->model->selectZigguratCard(ZigguratCardType::NOBLES_3_KINDS);
        $this->ps->setHand([PieceType::SERVANT, PieceType::MERCHANT, PieceType::PRIEST, PieceType::FARMER, PieceType::MERCHANT]);
        $this->model->playPiece(0, RowCol::fromRowCol(0, 0));
        $this->model->playPiece(1, RowCol::fromRowCol(2, 0));

        $result = $this->model->checkPlay(PieceType::PRIEST, $this->ps->hex(0, 2));

        $this->assertTrue($result->isAllowed());
        $this->assertEquals([ZigguratCardType::NOBLES_3_KINDS], $result->activatedCards());
        $this->assertFalse($this->model->checkPlay(PieceType::SERVANT, $this->ps->hex(0, 2))->isAllowed());
        $this->assertFalse($this->model->checkPlay(PieceType::FARMER, $this->ps->hex(0, 2))->isAllowed());
        $this->model->playPiece(2, RowCol::fromRowCol(0, 2));
        $this->assertFalse($this->model->checkPlay(PieceType::PRIEST, $this->ps->hex(1,3))->isAllowed());
    }

    public function testPlayPieces_threeNoblesOneInWater(): void {
        $this->setMap(ModelTest::MAP6);
        $this->model->selectZigguratCard(ZigguratCardType::NOBLES_3_KINDS);
        $this->ps->setHand([PieceType::SERVANT, PieceType::MERCHANT, PieceType::PRIEST, PieceType::FARMER, PieceType::MERCHANT]);
        $this->model->playPiece(0, RowCol::fromRowCol(0, 0));
        $this->model->playPiece(1, RowCol::fromRowCol(2, 2));
        $this->assertFalse($this->model->checkPlay(PieceType::PRIEST, $this->ps->hex(0, 2))->isAllowed());
        $this->assertFalse($this->model->checkPlay(PieceType::SERVANT, $this->ps->hex(0, 2))->isAllowed());
        $this->assertFalse($this->model->checkPlay(PieceType::FARMER, $this->ps->hex(0, 2))->isAllowed());
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

    public function testRequiresScoring(): void {
        $this->setMap(ModelTest::MAP8);
        $this->assertTrue($this->model->hexRequiresScoring($this->model->board()->hexAt(RowCol::fromRowCol(3, 1))));
    }
}
