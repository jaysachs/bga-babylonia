<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        Board,
        Components,
        PlayerInfo,
        Scorer,
        ScoredCity,
};

final class ScorerTest extends TestCase
{
    private function playerInfos(): array {
        return [
            1 => new PlayerInfo(1, "", 1, 0, 0, 0, 0),
            2 => new PlayerInfo(2, "", 2, 0, 0, 0, 0),
            3 => new PlayerInfo(3, "", 3, 0, 0, 0, 0)
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

    private function assertEq(ScoredCity $expected, ScoredCity $actual):void {
        $this->assertEqualsCanonicalizing($expected, $actual);
    }

    public function testCityScoring(): void
    {
        $board = Board::fromTestMap(ScorerTest::MAP1);
        $scorer = new Scorer($board, $this->playerInfos(), new Components([]));

        $hex = function(int $r, int $c) use(&$board) { return $board->hexAt($r, $c); };
        $expected = new ScoredCity(
            3,
            [1 => 0, 2 => 0, 3 => 1],
            [
                1 => [],
                2 => [$hex(7, 1)],
                3 => [$hex(5, 3), $hex(4, 4), $hex(8,0)]
            ],
            [
                1 => [$hex(4,0)],
                2 => [$hex(7,1)],
                3 => [$hex(8,0), $hex(6,2), $hex(5,1), $hex(5,3), $hex(4, 4)],
            ]
        );
        $this->assertEq($expected, $scorer->computeCityScores($hex(6,0)));

        $expected = new ScoredCity(
            3,
            [1 => 0, 2 => 0, 3 => 1],
            [
                1 => [$hex(2, 4)],
                2 => [],
                3 => [$hex(5, 1)]
            ],
            [
                1 => [$hex(2, 4)],
                2 => [],
                3 => [$hex(4, 4), $hex(5, 3), $hex(5,1), $hex(6,2)],
            ]
        );
        $this->assertEq($expected, $scorer->computeCityScores($hex(3, 3)));
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
        $board = Board::fromTestMap(ScorerTest::MAP2);
        $scorer = new Scorer($board, $this->playerInfos(), new Components([]));

        $this->assertEquals(3, $scorer->computeHexWinner($board->hexAt(6, 0)));
        $this->assertEquals(3, $scorer->computeHexWinner($board->hexAt(3, 3)));
        // 3 has 2, 1 and 2 each have 1, so 3 wins
        $this->assertEquals(3, $scorer->computeHexWinner($board->hexAt(3, 1)));
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

        $this->assertEquals(0, $scorer->computeHexWinner($board->hexAt(3, 1)));
    }
}
