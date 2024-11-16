<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        Board,
        Hex,
        HexType,
        Piece,
};

final class BoardTest extends TestCase
{
    public function testBfsRiver(): void {
        $board = Board::forPlayerCount(2, false);
        $visited = [];
        $board->bfs(7, 3, function ($h) use (&$visited) {
            if ($h->isWater()) {
                $visited[] = $h;
                return true;
            }
            return false;
        });
        $this->assertEquals(17, count($visited));
        foreach ($visited as $h) {
            $this->assertTrue($h->isWater());
        }
    }

    public function testBfsClump(): void {
        $board = Board::forPlayerCount(2, false);
        $visited = [];
        $board->bfs(8, 0, function ($h) use (&$visited) {
            if ($h->isLand() && $h->piece->isEmpty()) {
                $visited[] = $h;
                return true;
            }
            return false;
        });
        $this->assertEquals(19, count($visited));
        foreach ($visited as $h) {
            $this->assertTrue($h->isLand());
            $this->assertTrue($h->piece->isEmpty());
        }
    }
}
