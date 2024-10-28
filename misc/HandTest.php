<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\{
    Hand,
    Piece,
};

final class HandTest extends TestCase
{
    public function testHand(): void
    {
        $hand = Hand::new();
        $this->assertEquals(0, $hand->size());
        $this->assertEquals(5, $hand->maxSize());
        $x = [
            Piece::PRIEST,
            Piece::SERVANT,
            Piece::PRIEST,
            Piece::MERCHANT,
            Piece::FARMER
        ];
        foreach ($x as $p) {
            $hand->replenish($p);
        }
        $this->assertEquals(5, $hand->size());
        $this->assertEquals(5, $hand->maxSize());
        foreach ($x as $p) {
            $this->assertTrue($hand->contains($p));
        }
        $xk = array_keys($x);
        shuffle($xk);
        for ($i = 0; $i < count($x); $i++) {
            $k = $xk[$i];
            $this->assertEquals($x[$k], $hand->play($k));
            $this->assertEquals(count($x) - $i - 1, $hand->size());
        }
        $this->assertEquals(true, $hand->isEmpty());
        $this->assertEquals(count($x), $hand->maxSize());
    }
}
