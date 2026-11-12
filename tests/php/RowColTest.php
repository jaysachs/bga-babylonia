<?php

declare(strict_types=1);
use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\Model\ {
    RowCol,
};

final class RowColTest extends TestCase
{

    public function testNeighbors(): void
    {
        $rc = RowCol::fromRowCol(10, 13);
        $this->assertEquals(RowCol::fromRowCol(8,13), RowCol::north($rc));
        $this->assertEquals(RowCol::fromRowCol(12,13), RowCol::south($rc));
        $this->assertEquals(RowCol::fromRowCol(9,12), RowCol::northwest($rc));
        $this->assertEquals(RowCol::fromRowCol(9,14), RowCol::northeast($rc));
        $this->assertEquals(RowCol::fromRowCol(11,12), RowCol::southwest($rc));
        $this->assertEquals(RowCol::fromRowCol(11,14), RowCol::southeast($rc));
    }

    public function testPickle(): void
    {
        for ($row = 0; $row < 20; $row++) {
            for ($col = 0; $col < 20; $col++) {
                $rc = RowCol::fromRowCol($row, $col);
                $this->assertEquals($row, RowCol::row($rc));
                $this->assertEquals($col, RowCol::col($rc));
            }
        }
    }
}
