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

    public function testCityScoring(): void
    {
        $board = Board::forPlayerCount(2, false);

        $board->hexAt(4, 0)->playPiece(Piece::PRIEST, 1);

        $board->hexAt(7, 1)->playPiece(Piece::MERCHANT, 2);

        $board->hexAt(2, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(5, 1)->playPiece(Piece::PRIEST, 3);
        $board->hexAt(6, 2)->playPiece(Piece::HIDDEN, 3);
        $board->hexAt(5, 3)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(8, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(4, 4)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(2, 4)->playPiece(Piece::PRIEST, 1);

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

    public function testComputeHexWinner(): void {
        $board = Board::forPlayerCount(2, false);

        $board->hexAt(4, 0)->playPiece(Piece::PRIEST, 1);
        $board->hexAt(7, 1)->playPiece(Piece::MERCHANT, 2);
        $board->hexAt(2, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(5, 1)->playPiece(Piece::PRIEST, 3);
        $board->hexAt(6, 2)->playPiece(Piece::HIDDEN, 3);
        $board->hexAt(5, 3)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(8, 0)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(4, 4)->playPiece(Piece::MERCHANT, 3);
        $board->hexAt(2, 4)->playPiece(Piece::PRIEST, 1);
        $board->hexAt(1, 1)->playPiece(Piece::FARMER, 2);
        $scorer = new Scorer($board, $this->playerInfos(), new Components([]));
        $this->assertEquals(3, $scorer->computeHexWinner($board->hexAt(6, 0)));
        $this->assertEquals(3, $scorer->computeHexWinner($board->hexAt(3, 3)));

        // 3 has 2, 1 and 2 each have 1, so 3 wins
        $this->assertEquals(3, $scorer->computeHexWinner($board->hexAt(3, 1)));
        $board->hexAt(2, 2)->playPiece(Piece::HIDDEN, 2);
        $this->assertEquals(0, $scorer->computeHexWinner($board->hexAt(3, 1)));
    }
}
