<?php

/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * zooloretto implementation : © Jay Sachs <vagabond@covariant.org>
 *
 * Copyright 2025 Jay Sachs <vagabond@covariant.org>
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

use mysqli;

class MySQLDb implements Db
{
    public function __construct(private mysqli $mysql, private string $dbprefix_sub) {
        mysqli_report(MYSQLI_REPORT_STRICT);
    }

    /** @return list<array<string,string>> */
    #[\Override]
    public function getObjectList(string $sql): array
    {
        $result = $this->mysql->query(str_replace("DBPREFIX_", $this->dbprefix_sub . ".", $sql));
        if (is_bool($result)) {
            return [];
        }
        /** @var list<array<string,string>> */
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    /** @return list<string> */
    #[\Override]
    public function getSingleFieldList(string $sql): array
    {
        $result = $this->mysql->query(str_replace("DBPREFIX_", $this->dbprefix_sub . ".", $sql));
        if (is_bool($result)) {
            return [];
        }
        /** @var list<array<int,string>> */
        $res = $result->fetch_all(MYSQLI_NUM);
        return array_map(fn ($a) => strval($a[0]), $res);
    }

    #[\Override]
    public function execute(string $sql): void
    {
        $this->mysql->query($sql);
    }
}
