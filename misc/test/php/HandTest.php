<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\Model\{
    Hand,
    PieceType,
};

final class HandTest extends TestCase
{
    public function testHand(): void
    {
        $hand = Hand::new();
        $this->assertEquals(0, $hand->size());
        $this->assertEquals(5, $hand->limit());
        $x = [
            PieceType::PRIEST,
            PieceType::SERVANT,
            PieceType::PRIEST,
            PieceType::MERCHANT,
            PieceType::FARMER
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
            PieceType::PRIEST,
            PieceType::SERVANT,
            PieceType::PRIEST,
            PieceType::MERCHANT,
            PieceType::FARMER
        ];
        foreach ($x as $p) {
            $hand->replenish($p);
        }
        $this->expectException(LogicException::class);
        $hand->replenish(PieceType::PRIEST);
    }

    public function testHandExtend(): void
    {
        $hand = Hand::new();
        $this->assertEquals(0, $hand->size());
        $this->assertEquals(5, $hand->limit());
        $x = [
            PieceType::PRIEST,
            PieceType::SERVANT,
            PieceType::PRIEST,
            PieceType::MERCHANT,
            PieceType::FARMER
        ];
        foreach ($x as $p) {
            $hand->replenish($p);
        }
        $hand->play(1);
        $hand->play(3);
        $hand->extend(7);
        $this->assertEquals(7, $hand->limit());
        $this->assertEquals(3, $hand->size());
        $hand->replenish(PieceType::PRIEST);
        $hand->replenish(PieceType::FARMER);
        $hand->replenish(PieceType::MERCHANT);
        $hand->replenish(PieceType::FARMER);
        $this->assertEquals(7, $hand->limit());
        $this->assertEquals(7, $hand->size());
    }
}
