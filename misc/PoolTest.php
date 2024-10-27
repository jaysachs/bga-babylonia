<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\{
    Pool,
    Piece,
};

final class PoolTest extends TestCase
{
    public function testTakeAll(): void
    {
        $pool = Pool::new();
        $p = [];
        while ($pool->size() > 0) {
            $p[] = $pool->take(false);
        }
        $this->assertEquals(0, $pool->size());
        $this->assertEquals(range(0, 29), $pool->piecesTaken());
    }

    public function testTakeAllRandom(): void
    {
        $pool = Pool::new();
        $p = [];
        while ($pool->size() > 0) {
            $p[] = $pool->take();
        }
        $this->assertEquals(0, $pool->size());
        $taken = $pool->piecesTaken();
        sort($taken);
        $this->assertEquals(range(0, 29), $taken);
    }

    public function testTake(): void
    {
        $pool = Pool::new();
        $this->assertEquals(30, $pool->size());
        $this->assertEquals([], $pool->piecesTaken());

        $p = $pool->take(false);
        $this->assertEquals(29, $pool->size());
        $this->assertEquals(Piece::PRIEST, $p);

        $p = $pool->take(false);
        $this->assertEquals(28, $pool->size());
        $this->assertEquals(Piece::MERCHANT, $p);

        $this->assertEquals([0, 1], $pool->piecesTaken());
    }
}
