<?php

namespace Bga\Games\babylonia;

spl_autoload_register(function ($class_name) {
    $parts = explode("\\", $class_name);
    $path = dirname(dirname(__FILE__)) . '/modules/php/' . end($parts) . '.php';
    include $path;
});

class Game {
    public Board $board;
    public array $players;
    public array $ziggurats;
    public string $player_on_turn;

    public static function newGame(int $numPlayers, bool $optionalZigguarts = false) : Game {
        $game = new Game();
        $game->board = Board::forPlayerCount($numPlayers);
        $game->ziggurats[] = ZigguratCard::PLUS_10;
        $game->ziggurats[] = ZigguratCard::EXTRA_TURN;
        $game->ziggurats[] = ZigguratCard::SEVEN_TOKENS;
        $game->ziggurats[] = ZigguratCard::THREE_NOBLES;
        $game->ziggurats[] = ZigguratCard::NOBLE_WITH_3_FARMERS;
        $game->ziggurats[] = ZigguratCard::NOBLES_IN_FIELDS;
        $game->ziggurats[] = ZigguratCard::EXTRA_CITY_POINTS;

        $options = ["advanced_ziggurats"];

        if (!(array_search("advanced_ziggurats", $options) === false)) {
            $game->ziggurats[] = ZigguratCard::FREE_CENTRAL_LAND_CONNECTS;
            $game->ziggurats[] = ZigguratCard::FREE_RIVER_CONNECTS;
            shuffle($game->ziggurats);
            array_pop($game->ziggurats);
            array_pop($game->ziggurats);
        }
        for ($i = 0; $i < $numPlayers; $i++) {
            $game->players[] = Player::newPlayer($i);
        }
        return $game;
    }
}

class Player {
    public $scored_cities = array();
    public $scored_farms = array();
    private $hand = array(); /* PieceType */
    private $pool = array(); /* PieceType */
    public $ziggurats = array(); /* ZigguratCard */
    public $score = 0;
    public $id = 0;

    public static function newPlayer($pid) {
        $p = new Player();
        $p->id = $pid;
        $pool = &$p->pool;
        for ($i = 0; $i < 6; $i++) {
            $pool[] = Piece::PRIEST;
            $pool[] = Piece::MERCHANT;
            $pool[] = Piece::SERVANT;
            $pool[] = Piece::FARMER;
            $pool[] = Piece::FARMER;
        }
        shuffle($pool);
        $p->refreshHand();
    }

    /* returns false if pool is empty */
    public function refreshHand() : bool {
        $handSize = $this->handSize();
        while (count($this->hand) < $handSize) {
            if (count($this->pool) == 0) {
                return false;
            }
            $this->hand[] = array_pop($this->pool);
        }
        return true;
    }

    public function hasZigguratCard(ZigguratCard $type): bool {
        return !(array_search($type, $this->ziggurats) === false);
    }

    public function handSize() : int {
        return $this->hasZigguratCard(ZigguratCard::SEVEN_TOKENS) ? 7 : 5;
    }
}

$p = PlayerInfo::newPlayerInfo(0);
// var_dump($p);

$p->hand[1] = null;
$p->hand[3] = null;
$b = $p->refillHand();

// var_dump($p);

$g = Game::newGame($argv[1], $argv[2]);
// var_dump($g);

$hex = $g->board->hexAt(2, 0);
var_dump($hex);
$hex->piece = Piece::PRIEST;
$hex->player_id = 1;
$hex = $g->board->hexAt(2, 0);
var_dump($hex);

$zigs = $g->board->neighbors($hex, function (&$h): bool {
    return $h->piece == Piece::ZIGGURAT;
});

var_dump($zigs);
print "\n";
print $g->board->adjacentZiggurats(1);
print "\n";

?>
