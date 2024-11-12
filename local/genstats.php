<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <jay@covariant.org>
 *
 * Copyright 2024 Jay Sachs <jay@covariant.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 */

/*
 * Usage: php genstats.php gamename > modules/php/Stats.php
 *
 * Then, in Game.php construtor:
 *
 * public function __construct() {
 *   ...
 *   Stats::init($this);
 *   ...
 * }
 *
 * Then, anywhere you want to access/increment a stat, simply e.g.
 *
 *    Stats::PLAYER_NUMBER_TURNS->inc($player_id);
 *
 *    Stats::TABLE_GAME_ENDED_DUE_TO_PIECE_EXHAUSTION->set(true);
 */
declare(strict_types=1);

if (count($argv) != 2) {
    error_log("Usage: php gentstats.php gamename");
    exit(1);
}
$gamename = $argv[1];

function statsFor(string $t_or_p, string $type): array {
    static $payload = file_get_contents("stats.json");
    static $all_stats = json_decode($payload, true);

    $s = $all_stats[$t_or_p];
    if ($s === null) {
        return [];
    }

    $toIdentifier = function(string $name): string {
        return strtoupper($name);
    };

    return array_map(
        $toIdentifier,
        array_keys(
            array_filter(
                $s,
                function ($s) use ($type) { return $s["type"] == $type; }
            )
        )
    );
}

echo "<?";
echo "php\n";
?>
declare(strict_types=1);

namespace Bga\Games\<?php echo $gamename ?>\StatsGen;

class Impl {
    static $impl = null;
};

enum IntPlayerStats: string {
<?php foreach (statsFor("player", "int") as $name => $id) { ?>
    case <?php echo $id ?> = "<?php echo $name ?>";
<?php } ?>

    public function inc(int $player_id, int $delta = 1): void {
        Impl::$impl->incStat($delta, $this->value, $player_id);
    }

    public function set(int $player_id, int $val): void {
        Impl::$impl->setStat($val, $this->value, $player_id);
    }

    public function get(int $player_id): int {
        return Impl::$impl->getStat($this->value, $player_id);
    }

    public function init(array /*int*/ $player_ids, int $val = 0): void {
        foreach ($player_ids as $pid) {
            Impl::$impl->initStat("player", $this->value, $val, $pid);
        }
    }

    public function initf(array /* int */ $player_ids, Closure &$val): void {
        foreach ($player_ids as $pid) {
            Impl::$impl->initStat("player", $this->value, $val($pid), $pid);
        }
    }
}

enum FloatPlayerStats: string {
<?php foreach (statsFor("player", "float") as $name => $id) { ?>
    case <?php echo $id ?> = "<?php echo $name ?>";
<?php } ?>

    public function add(int $player_id, float $delta): void {
        Impl::$impl->incStat($delta, $this->value, $player_id);
    }

    public function set(int $player_id, float $val): void {
        Impl::$impl->setStat($val, $this->value, $player_id);
    }

    public function get(int $player_id): float {
        return Impl::$impl->getStat($this->value, $player_id);
    }

    public function init(array /*int*/ $player_ids, float $val = 0.0): void {
        foreach ($player_ids as $pid) {
            Impl::$impl->initStat("player", $this->value, $val, $pid);
        }
    }

    public function initf(array /* int */ $player_ids, Closure &$val): void {
        foreach ($player_ids as $pid) {
            Impl::$impl->initStat("player", $this->value, $val($pid), $pid);
        }
    }
}

enum IntTableStats: string {
<?php foreach (statsFor("table", "int") as $name => $id) { ?>
    case <?php echo $id ?> = "<?php echo $name ?>";
<?php } ?>

    public function inc(int $delta = 1): void {
        Impl::$impl->incStat($delta, $this->value);
    }

    public function set(int $val): void {
        Impl::$impl->setStat($val, $this->value);
    }

    public function get(): int {
        return Impl::$impl->getStat($this->value);
    }

    public function init(int $val): void {
        Impl::$impl->initStat("table", $this->value, $val);
    }
}

enum FloatTableStats: string {
<?php foreach (statsFor("table", "float") as $name => $id) { ?>
    case <?php echo $id ?> = "<?php echo $name ?>";
<?php } ?>

    public function add(float $delta): void {
        Impl::$impl->incStat($delta, $this->value);
    }

    public function set(float $val): void {
        Impl::$impl->setStat($val, $this->value);
    }

    public function get(): float {
        return Impl::$impl->getStat($this->value);
    }

    public function init(float $val): void {
        Impl::$impl->initStat("table", $this->value, $val);
    }
}

enum BoolPlayerStats: string {
<?php foreach (statsFor("player", "bool") as $name => $id) { ?>
    case <?php echo $id ?> = "<?php echo $name ?>";
<?php } ?>

    public function set(bool $player_id, bool $val): void {
        Impl::$impl->setStat($val, $this->value, $player_id);
    }

    public function get(bool $player_id): bool {
        return Impl::$impl->getStat($this->value, $player_id);
    }

    public function init(array /*bool*/ $player_ids, bool $val = false): void {
        foreach ($player_ids as $pid) {
            Impl::$impl->initStat("player", $this->value, $val, $pid);
        }
    }

    public function initf(array /* bool */ $player_ids, Closure &$val): void {
        foreach ($player_ids as $pid) {
            Impl::$impl->initStat("player", $this->value, $val($pid), $pid);
        }
    }
}

enum BoolTableStats: string {
<?php foreach (statsFor("table", "bool") as $name => $id) { ?>
    case <?php echo $id ?> = "<?php echo $name ?>";
<?php } ?>

    public function set(bool $val): void {
        Impl::$impl->setStat($val, $this->value);
    }

    public function get(): bool {
        return Impl::$impl->getStat($this->value);
    }

    public function init(bool $val): void {
        Impl::$impl->initStat("table", $this->value, $val);
    }
}

namespace Bga\Games\<?php echo $gamename ?>;
use Bga\Games\<?php echo $gamename ?>\StatsGen\ {
    IntPlayerStats,
    BoolPlayerStats,
    FloatPlayerStats,
    IntTableStats,
    BoolTableStats,
    FloatTableStats,
    Impl,
};

class Stats {
    // Player int stats
<?php foreach (statsFor("player", "int") as $n => $id) { ?>
    const PLAYER_<?php echo $id ?> = IntPlayerStats::<?php echo $id ?>;
<?php } ?>

    // Player float stats
<?php foreach (statsFor("player", "float") as $n => $id) { ?>
    const PLAYER_<?php echo $id ?> = FloatPlayerStats::<?php echo $id ?>;
<?php } ?>

    // Player bool stats
<?php foreach (statsFor("player", "bool") as $n => $id) { ?>
    const PLAYER_<?php echo $id ?> = BoolPlayerStats::<?php echo $id ?>;
<?php } ?>

    // Table int stats
<?php foreach (statsFor("table", "int") as $n => $id) { ?>
    const TABLE_<?php echo $id ?> = IntTableStats::<?php echo $id ?>;
<?php } ?>

    // Table float stats
<?php foreach (statsFor("table", "float") as $n => $id) { ?>
    const TABLE_<?php echo $id ?> = FloatTableStats::<?php echo $id ?>;
<?php } ?>

    // Table bool stats
<?php foreach (statsFor("table", "bool") as $n => $id) { ?>
    const TABLE_<?php echo $id ?> = BoolTableStats::<?php echo $id ?>;
<?php } ?>

    public static function init(mixed $the_impl): void {
        Impl::$impl = $the_impl;
    }

    /*
     * Convenience method to initialize all stats to "zero".
     */
    public static function initAll(array /* int */ $player_ids): void {
<?php foreach (statsFor("player", "int") as $n => $id) { ?>
        self::PLAYER_<?php echo $id ?>->init($player_ids, 0);
<?php } ?>
<?php foreach (statsFor("player", "float") as $n => $id) { ?>
        self::PLAYER_<?php echo $id ?>->init($player_ids, 0.0);
<?php } ?>
<?php foreach (statsFor("player", "bool") as $n => $id) { ?>
        self::PLAYER_<?php echo $id ?>->init($player_ids, false);
<?php } ?>
<?php foreach (statsFor("table", "int") as $n => $id) { ?>
        self::TABLE_<?php echo $id ?>->init(0);
<?php } ?>
<?php foreach (statsFor("table", "float") as $n => $id) { ?>
        self::TABLE_<?php echo $id ?>->init(0.0);
<?php } ?>
<?php foreach (statsFor("table", "bool") as $n => $id) { ?>
        self::TABLE_<?php echo $id ?>->init(false);
<?php } ?>
    }
}
