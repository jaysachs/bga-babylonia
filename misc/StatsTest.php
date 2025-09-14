<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once('modules/php/Stats.php');

use Bga\Games\babylonia\{
    Stats,
    StatsImpl
};


final class StatsTest extends TestCase
{
    public function testInit(): void
    {
        $stats = new Stats(new TestStatsImpl());
        $stats->initAll([1,2,3]);
        $this->assertTrue(true);
    }

    public function testSetGet(): void
    {
        $stats = new Stats(new TestStatsImpl());
        $stats->initAll([0, 2]);
        $stats->PLAYER_NUMBER_TURNS->set(2, 4);

        $this->assertEquals(4, $stats->PLAYER_NUMBER_TURNS->get(2));
    }
}
