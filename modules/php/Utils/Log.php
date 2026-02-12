<?php

/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <vagabond@covariant.org>
 *
 * Copyright 2024 Jay Sachs <vagabond@covariant.org>
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

namespace Bga\Games\babylonia\Utils;

class DefaultLogger implements Logger {

    public function dump(string $prefix, mixed $obj):void {
        var_dump($obj);
    }

    public function trace(string $msg): void {
        error_log($msg);
    }

    public function warn(string $msg): void {
        error_log($msg);
    }

    public function debug(string $msg): void {
        error_log($msg);
    }

    public function error(string $msg): void {
        error_log($msg);
    }
}

class Log
{
    private static ?Logger $logger = null;

    private static function getLogger(): Logger {
        if (!self::$logger) {
            self::$logger = new DefaultLogger();
        }
        return self::$logger;
    }

    public static function setImpl(Logger $logger): void {
        self::$logger = $logger;
    }

    static function trace(string $msg): void {
        self::getLogger()->trace($msg);
    }

    static function debug(string $msg): void {
        self::getLogger()->debug($msg);
    }

    static function error(string $msg): void {
        self::getLogger()->error($msg);

    }

    static function warn(string $msg): void {
        self::getLogger()->warn($msg);
    }

    static function dump(string $prefix, mixed $obj): void {
        self::getLogger()->dump($prefix, $obj);
    }

}
