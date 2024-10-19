<?php

namespace Bga\Games\babylonia;

class Location {
    public __construct(public int $x, public int $y) {}

    public function toKey(): string {
        return "_" . $x . "_" . $y;
    }
}

?>
