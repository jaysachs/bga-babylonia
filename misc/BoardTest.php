<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        Board,
        Hex,
        HexType,
        Piece
};


final class BoardTest extends TestCase
{
    public function testNeighbors(): void
    {
        $board = Board::forPlayerCount(2, false);
        $this->assertEqualsCanonicalizing(
            $board->neighbors($board->hexAt(4,2)),
            [ $board->hexAt(2,2),
              $board->hexAt(6,2),
              $board->hexAt(3,1),
              $board->hexAt(5,1),
              $board->hexAt(3,3),
              $board->hexAt(5,3) ]
        );

        $this->assertEqualsCanonicalizing(
            $board->neighbors($board->hexAt(4,2),
                              function ($h) { return $h->row % 2 == 1; }),
            [ $board->hexAt(3,1),
              $board->hexAt(5,1),
              $board->hexAt(3,3),
              $board->hexAt(5,3) ]
        );
    }

    public function testBfsClump(): void {
        $board = Board::forPlayerCount(2, false);

        // western landmass less cities/ziggurat
        $result = [];
        $board->bfs(5, 1, function($h) use (&$result) {
            if ($h->isLand() && $h->piece->isEmpty()) {
                $result[] = $h;
                return true;
            }
            return false;
        });
        $this->assertEquals(19, count($result));
        foreach ($result as $h) {
            $this->assertEquals(true, $h->isLand());
        }
    }

    public function testBfsLinear(): void {
        $board = Board::forPlayerCount(2, false);
        // river
        $result = [];
        $board->bfs(0, 8, function($h) use (&$result) {
            if ($h->isWater()) {
                $result[] = $h;
                return true;
            }
            return false;
        });
        $this->assertEquals(14, count($result));
        foreach ($result as $h) {
            $this->assertEquals(true, $h->isWater());
        }
    }

    public function testBfsEmpty(): void {
        $board = Board::forPlayerCount(2, false);

        $result = [];
        $board->bfs(0, 8, function($h) use (&$result) {
            $result[] = $h;
            return false;
        });
        $this->assertEquals([$board->hexAt(0, 8)], $result);
    }
}
