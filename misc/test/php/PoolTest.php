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
        $all = $pool->pieces();
        $p = [];
        while ($pool->size() > 0) {
            $p[] = $pool->take();
        }
        $this->assertEquals(0, $pool->size());
        $this->assertEqualsCanonicalizing($all, Pool::new()->pieces());
        $this->assertEqualsCanonicalizing($all, $p);
    }
}
