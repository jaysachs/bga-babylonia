<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\{
    Stats,
    // StatsImpl
};

class SImpl /* implements StatsImpl */ {
    public $vals = [];
    public function initStat(string $cat, string $name, mixed $value, int $player_id = 0): void {
        if ($player_id === null) {
            $this->vals[$name] = $value;
        } else {
            if (! isset($this->vals[$name])) {
                $this->vals[$name] = [];
            }
            $this->vals[$name][$player_id] = $value;
        }
    }

    public function incStat(mixed $delta, string $name, int $player_id = 0): void {
        if ($player_id === null) {
            $this->vals[$name] += $delta;
        } else {
            $this->vals[$name][$player_id] += $delta;
        }
    }

    public function setStat($value, $name, $player_id = 0): void {
        if ($player_id === null) {
            $this->vals[$name] = $value;
        } else {
            $this->vals[$name][$player_id] = $value;
        }
    }

    public function getStat($name, $player_id = 0): mixed {
        if ($player_id === null) {
            return $vals[$name];
        }
        return $this->vals[$name][$player_id];
    }
}

final class StatsTest extends TestCase
{
    public function testInit(): void
    {
        $stats = new Stats(new SImpl());
        $stats->initAll([1,2,3]);
        $this->assertTrue(true);
    }

    public function testSetGet(): void
    {
        $stats = new Stats(new SImpl());
        $stats->initAll([0, 2]);
        $stats->PLAYER_NUMBER_TURNS->set(2, 4);

        $this->assertEquals(4, $stats->PLAYER_NUMBER_TURNS->get(2));
    }
}
