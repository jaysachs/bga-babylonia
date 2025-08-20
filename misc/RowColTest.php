<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\ {
        RowCol,
};

final class RowColTest extends TestCase
{
    public function testAsKey_0_0(): void
    {
        $rc = new RowCol(0, 0);
        $k = $rc->asKey();
        $this->assertSame(0, $k);
        $rc2 = RowCol::fromKey($k);
        $this->assertEquals($rc, $rc2);
    }

    public function testAsKey_7_8(): void
    {
        $rc = new RowCol(7, 8);
        $k = $rc->asKey();
        $rc2 = RowCol::fromKey($k);
        $this->assertEquals($rc, $rc2);
    }

    public function testAsKey_negatives(): void
    {
        $rc = new RowCol(-53, -7);
        $k = $rc->asKey();
        $rc2 = RowCol::fromKey($k);
        $this->assertEquals($rc, $rc2);
    }
}
