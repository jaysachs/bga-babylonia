<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        Board,
        Components,
        Hex,
        HexType,
        Piece,
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
    public function testCityScoring(): void
    {
        $board = Board::fromTestMap(ScorerTest::MAP1);
        $scorer = new Scorer($board, $this->playerInfos(), new Components([]));

        $sc = $scorer->computeCityScores($board->hexAt(6,0));

        $this->assertEquals(0, $sc->pointsForPlayer(1));
        $this->assertEquals(2, $sc->pointsForPlayer(2));

        $this->assertEquals(7, $sc->pointsForPlayer(3));
        $this->assertEquals([], $sc->scoringHexesForPlayer(1));
        $this->assertEquals([$board->hexAt(7, 1)],
                            $sc->scoringHexesForPlayer(2));
        $this->assertEqualsCanonicalizing(
            [$board->hexAt(5, 3), $board->hexAt(4, 4), $board->hexAt(8,0)],
            $sc->scoringHexesForPlayer(3));
        $this->assertEquals(3, $sc->captured_by);


        $sc = $scorer->computeCityScores($board->hexAt(3, 3));
        $this->assertEquals(3, $sc->captured_by);
        $this->assertEquals(2, $sc->pointsForPlayer(1));
        $this->assertEquals(0, $sc->pointsForPlayer(2));
        //        $this->assertEquals(4, $sc->pointsForPlayer(3));
        $this->assertEquals([$board->hexAt(2, 4)],
                            $sc->scoringHexesForPlayer(1));
        $this->assertEquals([],
                            $sc->scoringHexesForPlayer(2));
        $this->assertEquals([$board->hexAt(5, 1)],
                            $sc->scoringHexesForPlayer(3));
    }

const MAP2 = <<<'END'
XXX   XXX  XXX
   f-2   XXX
m-3   ===   p-1
   ZZZ   C.P
p-1   ===   m-3
   p-3   m-3
C.M   h-3
   m-2
m-3
END;
    public function testComputeHexWinner(): void {
        $board = Board::fromTestMap(ScorerTest::MAP2);
        $scorer = new Scorer($board, $this->playerInfos(), new Components([]));

        $this->assertEquals(3, $scorer->computeHexWinner($board->hexAt(6, 0)));
        $this->assertEquals(3, $scorer->computeHexWinner($board->hexAt(3, 3)));

        // 3 has 2, 1 and 2 each have 1, so 3 wins
        $this->assertEquals(3, $scorer->computeHexWinner($board->hexAt(3, 1)));
        $board->hexAt(2, 2)->playPiece(Piece::HIDDEN, 2);
        $this->assertEquals(0, $scorer->computeHexWinner($board->hexAt(3, 1)));
    }
}
