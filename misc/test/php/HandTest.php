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
        $this->assertEquals(5, $hand->limit());
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
        $this->assertEquals(5, $hand->limit());
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
        $this->assertEquals(count($x), $hand->limit());
    }

    public function testHandSizeLimit(): void
    {
        $hand = Hand::new();
        $this->assertEquals(0, $hand->size());
        $this->assertEquals(5, $hand->limit());
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
        $this->expectException(LogicException::class);
        $hand->replenish(Piece::PRIEST);
    }

    public function testHandExtend(): void
    {
        $hand = Hand::new();
        $this->assertEquals(0, $hand->size());
        $this->assertEquals(5, $hand->limit());
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
        $hand->play(1);
        $hand->play(3);
        $hand->extend(7);
        $this->assertEquals(7, $hand->limit());
        $this->assertEquals(3, $hand->size());
        $hand->replenish(Piece::PRIEST);
        $hand->replenish(Piece::FARMER);
        $hand->replenish(Piece::MERCHANT);
        $hand->replenish(Piece::FARMER);
        $this->assertEquals(7, $hand->limit());
        $this->assertEquals(7, $hand->size());
    }
}
