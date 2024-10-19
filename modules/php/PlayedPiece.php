<?php

namespace Bga\Games\babylonia;

class PlayedPiece {
    // use color or some other identifer for player?
    function __construct(public $type, public string $player_id) {}
}

?>
