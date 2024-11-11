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

declare(strict_types=1);

function statsFor(string $t_or_p, string $type): array {
    static $payload = file_get_contents("stats.json");
    static $all_stats = json_decode($payload, true);

    $x = array_filter($all_stats[$t_or_p],
                      function ($s) use ($type) { return $s["type"] == $type; });
    if ($x == null) {
        return [];
    }
    return $x;
}

echo "<?";
echo "php\n";
?>
declare(strict_types=1);

namespace Bga\Games\babylonia;

class Impl {
    static $impl = null;
};

enum IntPlayerStats: string {
<?php
    foreach (statsFor("player", "int") as $lname => $stat) {
        $name = strtoupper($lname);
?>
    case <?php echo $name ?> = "<?php echo $lname?>";
<?php
    }
?>

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

enum IntTableStats: string {
<?php
    foreach (statsFor("table", "int") as $lname => $stat) {
        $name = strtoupper($lname);
?>
    case <?php echo $name ?> = "<?php echo $lname?>";
<?php
    }
?>

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

enum BoolPlayerStats: string {
<?php
    foreach (statsFor("player", "bool") as $lname => $stat) {
        $name = strtoupper($lname);
?>
    case <?php echo $name ?> = "<?php echo $lname?>";
<?php
    }
?>

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
<?php
    foreach (statsFor("table", "bool") as $lname => $stat) {
        $name = strtoupper($lname);
?>
    case <?php echo $name ?> = "<?php echo $lname?>";
<?php
    }
?>

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

class Stats {
    // Player int stats
<?php
    foreach (statsFor("player", "int") as $lname => $stat) {
        $name = strtoupper($lname);
?>
    const PLAYER_<?php echo $name; ?> = IntPlayerStats::<?php echo $name; ?>;
<?php
    }
?>

    // Player bool stats
<?php
    foreach (statsFor("player", "bool") as $lname => $stat) {
        $name = strtoupper($lname);
?>
    const PLAYER_<?php echo $name; ?> = BoolPlayerStats::<?php echo $name; ?>;
<?php
    }
?>

    // Table int stats
<?php
    foreach (statsFor("table", "int") as $lname => $stat) {
        $name = strtoupper($lname);
?>
    const TABLE_<?php echo $name; ?> = IntTableStats::<?php echo $name; ?>;
<?php
    }
?>

    // Table bool stats
<?php
    foreach (statsFor("table", "bool") as $lname => $stat) {
        $name = strtoupper($lname);
?>
    const TABLE_<?php echo $name; ?> = BoolTableStats::<?php echo $name; ?>;
<?php
    }
?>

    static function init(mixed $the_impl, array $player_ids) {
        Impl::$impl = $the_impl;
<?php
    foreach (statsFor("player", "int") as $lname => $stat) {
        $name = strtoupper($lname);
?>
        self::PLAYER_<?php echo $name; ?>->init($player_ids, 0);
<?php
    }
?>
<?php
    foreach (statsFor("player", "bool") as $lname => $stat) {
        $name = strtoupper($lname);
?>
        self::PLAYER_<?php echo $name; ?>->init($player_ids, false);
<?php
    }
?>
<?php
    foreach (statsFor("table", "int") as $lname => $stat) {
        $name = strtoupper($lname);
?>
        self::TABLE_<?php echo $name; ?>->init(0);
<?php
    }
?>
<?php
    foreach (statsFor("table", "bool") as $lname => $stat) {
        $name = strtoupper($lname);
?>
        self::TABLE_<?php echo $name; ?>->init(false);
<?php
    }
?>
    }
}
