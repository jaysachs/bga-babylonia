<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        Board,
        Components,
        Hex,
        HexWinner,
        PlayerInfo,
        RowCol,
        Scorer,
        ScoredCity,
};

final class ScorerTest extends TestCase
{
    private function playerInfos(): array {
        return [
            1 => new PlayerInfo(1, 0, 3, 0, 0),
            2 => new PlayerInfo(2, 0, 0, 0, 0),
            3 => new PlayerInfo(3, 0, 2, 0, 0)
        ];
    }

    const MAP1 = <<<'END'
XXX   XXX  XXX
   ---   XXX
m-3   ===   p-1
   ZZZ   C.P
p-1   ===   m-3
   p-3   m-3
C.M   h-3
   m-2
m-3
END;

    private Board $board;
    private Scorer $scorer;

    private function assertEq(ScoredCity $expected, ScoredCity $actual):void {
        $this->assertEquals($expected, $actual);
    }

    protected function doSetup(string $map) {
        $this->board = Board::fromTestMap($map);
        $this->scorer = new Scorer($this->board,
                                   $this->playerInfos(),
                                   new Components([]));
    }

    private function hexWinner(int $r, int $c, int $captured_by): HexWinner {
        $hex = $this->hex($r, $c);
        $neighbors = $this->board->neighbors($hex, function (&$hex): bool {
            return $hex->piece->isPlayerPiece();
        });

        return new HexWinner($hex, $captured_by, $neighbors);
    }

    private function hex(int $r, int $c): Hex {
        return $this->board->hexAt(new RowCol($r, $c));
    }

    private function runTest(ScoredCity $expected) {
        $got = $this->scorer->computeCityScores($expected->hex_winner->hex);
        $this->assertEq($expected, $got);
    }

    public function testCityScoring(): void
    {
        $this->doSetup(ScorerTest::MAP1);
        $expected = new ScoredCity(
            $this->hexWinner(6, 0, 3),
            [1 => 3, 2 => 0, 3 => 3],
            [
                1 => [],
                2 => [$this->hex(7, 1)],
                3 => [$this->hex(4, 4), $this->hex(5, 3), $this->hex(8,0)]
            ],
            [
                1 => [$this->hex(4,0)],
                2 => [$this->hex(7,1)],
                3 => [$this->hex(4, 4), $this->hex(5,1), $this->hex(5,3), $this->hex(6,2), $this->hex(8,0)],
            ]
        );
        $this->runTest($expected);

        $expected = new ScoredCity(
            $this->hexWinner(3, 3, 3),
            [1 => 3, 2 => 0, 3 => 3],
            [
                1 => [$this->hex(2, 4)],
                2 => [],
                3 => [$this->hex(5, 1)]
            ],
            [
                1 => [$this->hex(2, 4)],
                2 => [],
                3 => [$this->hex(4, 4), $this->hex(5, 1), $this->hex(5,3), $this->hex(6,2)],
            ]
        );
        $this->runTest($expected);
    }

    const MAP4 = <<<'END'
XXX   ===  XXX
   ===   m-3
m-3   h-3   p-1
   s-3   h-1
p-1   h-3   ---
   p-3   h-1
C.M   h-2
   m-2
m-3
END;
   public function testCityScoring_overRivers(): void {
        $this->doSetup(ScorerTest::MAP4);
        $expected = new ScoredCity(
            $this->hexWinner(6, 0, 3),
            [1 => 3, 2 => 0, 3 => 3],
            [
                1 => [],
                2 => [$this->hex(7, 1)],
                3 => [$this->hex(1, 3), $this->hex(2, 0), $this->hex(8, 0)]
            ],
            [
                1 => [$this->hex(4, 0)],
                2 => [$this->hex(6, 2), $this->hex(7, 1)],
                3 => [$this->hex(1, 3), $this->hex(2, 0), $this->hex(2, 2), $this->hex(3, 1), $this->hex(4, 2), $this->hex(5, 1), $this->hex(8,0)]
            ]
        );
        $this->runTest($expected);
    }


const MAP2 = <<<'END'
XXX   XXX   XXX   XXX
   f-2   XXX   XXX
m-3   ===   p-1   ---
   ZZZ   C.P   ---
p-1   ===   m-3   ---
   p-3   m-3   ---
C.M   h-3   ---   ---
   m-2   ===   C**
m-3   ---   ===   ---
END;
    public function testComputeHexWinner(): void {
        $this->doSetup(ScorerTest::MAP2);

        $this->assertEquals(3, $this->scorer->computeHexWinner(
            $this->board->hexAt(new RowCol(6, 0)))->captured_by);
        $this->assertEquals(3, $this->scorer->computeHexWinner(
            $this->board->hexAt(new RowCol(3, 3)))->captured_by);
        // 3 has 2, 1 and 2 each have 1, so 3 wins
        $this->assertEquals(3, $this->scorer->computeHexWinner(
            $this->board->hexAt(new RowCol(3, 1)))->captured_by);
    }

const MAP3 = <<<'END'
XXX   XXX   XXX   XXX
   f-2   XXX   XXX
m-3   h-2   p-1   ---
   ZZZ   C.P   ---
p-1   ===   m-3   ---
   p-3   m-3   ---
C.M   h-3   ---   ---
   m-2   ===   C**
m-3   ---   ===   ---
END;
    public function testComputeHexWinnerNoWinner(): void {
        $board = Board::fromTestMap(ScorerTest::MAP3);
        $scorer = new Scorer($board, $this->playerInfos(), new Components([]));

        $this->assertEquals(0, $scorer->computeHexWinner(
            $board->hexAt(new RowCol(3, 1)))->captured_by);
    }




    const MAP8 = <<<'END'
===   C.M   ===
   m-2   m-1
---   m-1   ---
   p-2   m-1
---   m-2   ---
END;
   public function testCityScoring_naiveBfsApproachFails(): void {
        $this->doSetup(ScorerTest::MAP8);
        $expected = new ScoredCity(
            $this->hexWinner(0, 2, 1),
            [1 => 4, 2 => 0, 3 => 2],
            [
                1 => [$this->hex(1,3), $this->hex(2, 2), $this->hex(3, 3)],
                2 => [$this->hex(1, 1), $this->hex(4, 2)],
                3 => []
            ],
            [
                1 => [$this->hex(1,3), $this->hex(2, 2), $this->hex(3, 3)],
                2 => [$this->hex(1, 1), $this->hex(3, 1), $this->hex(4, 2)],
                3 => []
            ]
        );
        $this->runTest($expected);
    }

    const MAP9 = <<<'END'
---   p-1   p-2
   s-1   C.M   s-2
---   m-2   m-1
   p-1   m-1   ---
---   p-1   ---
END;
   public function testCityScoring_multipleNonAdjacentStarts(): void {
        $this->doSetup(ScorerTest::MAP9);
        $expected = new ScoredCity(
            $this->hexWinner(1, 3, 1),
            [1 => 4, 2 => 0, 3 => 2],
            [
                1 => [$this->hex(2, 4), $this->hex(3, 3)],
                2 => [$this->hex(2, 2)],
                3 => []
            ],
            [
                1 => [$this->hex(0, 2), $this->hex(1, 1), $this->hex(2, 4), $this->hex(3,1), $this->hex(3, 3), $this->hex(4, 2)],
                2 => [$this->hex(0, 4), $this->hex(1, 5), $this->hex(2, 2)],
                3 => []
            ]
        );
        $this->runTest($expected);
    }


    const MAP7 = <<<'END'
---   s-3   ---
   p-1   p-2
---   C.M   ---
   m-3   m-1
---   s-2
END;
   public function testCityScoring_noCapturer(): void {
        $this->doSetup(ScorerTest::MAP7);
        $expected = new ScoredCity(
            $this->hexWinner(2, 2, 0),
            [1 => 0, 2 => 0, 3 => 0],
            [
                1 => [$this->hex(3, 3)],
                2 => [],
                3 => [$this->hex(3, 1)]
            ],
            [
                1 => [$this->hex(1, 1), $this->hex(3, 3)],
                2 => [$this->hex(1, 3), $this->hex(4, 2)],
                3 => [$this->hex(0, 2), $this->hex(3, 1)]
            ]
        );
        $this->runTest($expected);
    }
}
