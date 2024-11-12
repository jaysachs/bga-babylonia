<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\{
    Stats,
};

class SImpl {
    public $vals = [];
    public function initStat($cat, $name, $value, $player_id = null) {
        if ($player_id === null) {
            $this->vals[$name] = $value;
        } else {
            if (! isset($this->vals[$name])) {
                $this->vals[$name] = [];
            }
            $this->vals[$name][$player_id] = $value;
        }
    }

    public function incStat($delta, $name, $player_id = null) {
        if ($player_id === null) {
            $this->vals[$name] += $delta;
        } else {
            $this->vals[$name][$player_id] += $delta;
        }
    }

    public function setStat($value, $name, $player_id = null) {
        if ($player_id === null) {
            $this->vals[$name] = $value;
        } else {
            $this->vals[$name][$player_id] = $value;
        }
    }

    public function getStat($name, $player_id = null) {
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
        Stats::init(new SImpl());
        Stats::initAll([1,2,3]);
        $this->assertTrue(true);
    }

    public function testSetGet(): void
    {
        Stats::init(new SImpl(), [0, 2]);
        Stats::PLAYER_NUMBER_TURNS->set(2, 4);

        $this->assertEquals(4, Stats::PLAYER_NUMBER_TURNS->get(2));
    }
}
