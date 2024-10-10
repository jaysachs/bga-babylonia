<?php

enum Piece: string {
    case ZIGGURAT = 'ziggurat';
    case PRIEST = 'priest';
    case CIVIL = 'civil';
    case MERCHANT = 'merchant';
    case CITY_P = 'city_p';
    case CITY_C = 'city_c';
    case CITY_M = 'city_m';
    case CITY_PC = 'city_pc';
    case CITY_PM = 'city_pm';
    case CITY_MC = 'city_mc';
    case CITY_PCM = 'city_pcm';
    case FARM_5 = 'farm_5';
    case FARM_6 = 'farm_6';
    case FARM_7 = 'farm_7';
    case FARM_CITIES = 'farm_c';
    case PLACEHOLDER = '';

    public function isFarm(): bool {
        return match($this) {
            Piece::FARM_5,
            Piece::FARM_6,
            Piece::FARM_7,
            Piece::FARM_CITIES => true,
            default => false,
        };
    }

    public function isCity(): bool {
        return match($this) {
            Piece::CITY_P,
            Piece::CITY_C,
            Piece::CITY_M,
            Piece::CITY_PC,
            Piece::CITY_PM,
            Piece::CITY_MC,
            Piece::CITY_PCM => true,
            default => false,
        };
    }
}

class Ziggurat {
    public $scored = false;
}

enum PieceType: string {
    case Priest = 'priest';
    case Civil = 'civil';
    case Merchant = 'merchant';
    case Farmer = 'farmer';

    public function isFarmer(): bool { return $this == PieceType::Farmer; }
    public function isNoble(): bool { return $this != PieceType::Farmer; }
}

class PlayedPiece {
    // use color or some other identifer for player?
    function __construct(public PieceType $type, public string $player_id) {}
}

enum HexType: string {
    case Land = 'Land';
    case Water = 'Water';
}

/*
 * We use doubled coordinate representation.
 * (see https://www.redblobgames.com/grids/hexagons/#neighbors)
 */
class Hex {

    public function __toString(): string {
        return sprintf("%s %d:%d %s", $this->type->value, $this->row, $this->col, $this->piece);
    }
    
    public function __construct(public HexType $type,
                                public int $row,
                                public int $col,
                                public ?Piece $piece) {
    }

    public function isPlayable(): bool {
        return $this->piece == null || $this->piece->isCity() || $this->piece->isFarm();
    }
    
    public function placeCityOrFarm(Piece $city_or_farm) {
        if ($this->piece != Piece::PLACEHOLDER) {
            throw new LogicException("attempt to place city or farm where it is not expected");
        }
        if (!$city_or_farm->isCity() && !$city_or_farm->isFarm()) {
            throw new LogicException("attempt to place a non-city or farm");
        }
        $this->piece = $city_or_farm;
    }
    
    public function play(PlayedPiece $p) {
        if ($this->piece != null) {
            // throw exception
        }
        $this->piece = $p;
    }

    public function needsCityOrFarm(): bool {
        return $this->piece == Piece::PLACEHOLDER;
    }

    public static function plain(int $row, int $col):Hex {
        return new Hex(HexType::Land, $row, $col, null);
    }

    public static function city(int $row, int $col): Hex {
        return new Hex(HexType::Land, $row, $col, Piece::PLACEHOLDER);
    }

    public static function water(int $row, int $col): Hex {
        return new Hex(HexType::Water, $row, $col, null);
    }

    public static function ziggurat(int $row, int $col): Hex {
        return new Hex(HexType::Water, $row, $col, Piece::ZIGGURAT);
    }

}

class Board {

    private function addHex(Hex $hex) {
        @ $hexrow = &$this->hexes[$hex->row];
        if ($hexrow == null) {
            $this->hexes[$hex->row] = [];
        }
        $hexrow[$hex->col] = $hex;
    }

    private function hexAt(int $row, int $col) : ?Hex {
        if (key_exists($row, $this->hexes)) {
            return @ $this->hexes[$row][$col];
        }
        return null;
    }

    const MAP = <<<'END'
        .   .   .   .   =   _   .   .   .
          _   .   .   _   C   _   .   .
        _   =   _   _   =   _   C   .   .
          !   C   _   _   _   _   _   .
        _   =   _   C   =   _   _   C   .
          _   _   _   _   =   !   _   .
        C   =   _   _   C   =   _   _   .
          _   =   C   _   _   _   _   C
        _   _   =   _   _   =   C   _   .
          C   _   =   _   C   _   _   _
        _   _   C   _   _   =   _   _   .
          _   _   =   _   _   _   C   _
        C   _   _   C   !   =   _   _   C
          _   _   =   _   _   C   _   _
        _   C   C   _   _   =   _   C   _
          =   _   =   _   =   _   _   _
        =   =   _   _   C   _   C   _   _
          _   =   =   _   =   _   _   _
        =   !   =   _   _   C   _   !   C
          _   _   C   C   =   _   _   _
        =   _   _   _   _   =   _   _   _
          C   _   _   _   _   _   _   _
        .   _   C   _   C   =   C   C   .
END;

    public static function forPlayerCount(int $numPlayers): Board {
        if ($numPlayers < 2 || $numPlayers > 4) {
            throw new InvalidArgumentException(sprintf("invalid number of players: %s", $numPlayers));
        }
        $empty = [];
        $board = new Board($empty);
        $lines = explode("\n", Board::MAP);
        $row = 0;
        foreach ($lines as &$s) {
            $col = ($row & 1) ? 1 : 0;
            foreach (str_split($s) as $ch) {
                switch ($ch) {
                case ' ':
                    $col -= 2;
                    break;
                case '.':
                    break;
                case '_':
                    $board->addHex(Hex::plain($row, $col));
                    break;
                case 'C':
                    $board->addHex(Hex::city($row, $col));
                    break;
                case '!':
                    $board->addHex(Hex::ziggurat($row, $col));
                    break;
                case '=':
                    $board->addHex(Hex::water($row, $col));
                    break;
                }
                $col += 2;
            }
            $row++;
        }

        switch ($numPlayers) {
        case 2:
            $board->removeLandmassAt(18, 16);
            break;
        case 3:
            $board->removeLandmassAt(2, 0);
        }

        $pool = self::initializePool($numPlayers);
        $board->placeCitiesAndFarms($pool);
        if (count($pool) != 0) {
            throw new LogicException("placed all cities and farms but tiles leftover");
        }
        return $board;
    }

    private function placeCitiesAndFarms(array &$pool) {
        $this->visitAll(
            function (&$hex) use (&$pool) {
                if ($hex->needsCityOrFarm()) {
                    $x = array_pop($pool);
                    printf("%d:%d %s\n", $hex->row, $hex->col, $x->value);
                    $hex->placeCityOrFarm($x);
                }
            }
        );
    }

    private function visitAll(Closure $visit) {
        foreach ($this->hexes as &$hexrow) {
            foreach ($hexrow as &$hex) {
                $visit($hex);
            }
        }
    }

    public function __construct(private array &$hexes) {}

    /* visit should return true if continue exploring */
    private function bfs(int $start_row, int $start_col, Closure $visit) {
        $seen = [];
        $queue = [ $this->hexAt($start_row, $start_col) ];
        while ($queue) {
            $hex = array_pop($queue);
            $seen[] = $hex;
            if ($visit($hex)) {
                $nb = $this->neighbors($hex, $visit);
                foreach ($nb as $n) {
                    if (!array_search($n, $seen)) {
                        $queue[] = $n;
                    }
                }
            }
        }
    }

    private function removeLandmassAt(int $start_row, int $start_col) {
        $this->bfs(
            $start_row,
            $start_col,
            function($hex) {
                if ($hex->type == HexType::Land) {
                  $hexrow = &$this->hexes[$hex->row];
                  unset($hexrow[$hex->col]);
                  return true;
                }
                return false;
            }
        );
    }

    private function neighbors(Hex &$hex, Closure $matching): array {
        $r = $hex->row;
        $c = $hex->col;

        return array_filter(
                [
                    $this->hexAt($r-2, $c),
                    $this->hexAt($r-1, $c+1),
                    $this->hexAt($r+1, $c+1),
                    $this->hexAt($r+2, $c),
                    $this->hexAt($r+1, $c-1),
                    $this->hexAt($r-1, $c-1)
                ], function ($nh) use ($matching) {
                    return $nh != null && $matching($nh);
                }
            );
    }

    private static function initializePool(int $numPlayers) {
        // set up city pool
        $pool = array();
        for ($i = 0; $i < 2; $i++) {
            $pool[] = Piece::CITY_P;
            $pool[] = Piece::CITY_C;
            $pool[] = Piece::CITY_M;
            $pool[] = Piece::CITY_PC;
            $pool[] = Piece::CITY_MC;
            $pool[] = Piece::CITY_PM;
        }
        for ($i = 0; $i < 3; $i++) {
            $pool[] = Piece::FARM_CITIES;
        }
        $pool[] = Piece::FARM_5;
        $pool[] = Piece::FARM_6;
        $pool[] = Piece::FARM_7;
        if ($numPlayers > 2) {
            $pool[] = Piece::CITY_PC;
            $pool[] = Piece::CITY_MC;
            $pool[] = Piece::CITY_PM;
            $pool[] = Piece::CITY_PCM;
            $pool[] = Piece::FARM_5;
            $pool[] = Piece::FARM_6;
            $pool[] = Piece::FARM_7;
            $pool[] = Piece::FARM_CITIES;
        }
        if ($numPlayers > 3) {
            $pool[] = Piece::CITY_P;
            $pool[] = Piece::CITY_C;
            $pool[] = Piece::CITY_M;
            for ($i = 0; $i < 3; $i++) {
                $pool[] = Piece::FARM_CITIES;
            }
        }
        shuffle($pool);
        return $pool;
    }
}

enum ZigguratCard : string {
    case PLUS_10 = 'zcard1';
    case EXTRA_TURN = 'zcard2';
    case SEVEN_TOKENS = 'zcard3';
    case THREE_NOBLES = 'zcard4';
    case NOBLE_WITH_3_FARMERS = 'zcard5';
    case NOBLES_IN_FIELDS = 'zcard6';
    case EXTRA_CITY_POINTS = 'zcard7';
    case FREE_CENTRAL_LAND_CONNECTS = 'zcard8';
    case FREE_RIVER_CONNECTS = 'zcard9';
};

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
        if ($optionalZigguarts) {
            $game->ziggurats[] = ZigguratCard::FREE_CENTRAL_LAND_CONNECTS;
            $game->ziggurats[] = ZigguratCard::FREE_RIVER_CONNECTS;
            shuffle($game->ziggurats);
            array_pop($game->ziggurats);
            array_pop($game->ziggurats);
        }
        for ($i = 0; $i < $numPlayers; $i++) {
            $game->players[] = new Player();
        }
        return $game;
    }

    public function playPiece(Player &$player, PieceType $piece, int $row, int $col) {
        if (!array_search($this->players, $player)) {
            throw new InvalidArgumentException("");
        }
        $hex = $this->board->hexAt($row, $col);
        if ($hex == null) {
            // TODO: illegal
        }
        if (!$hex->canBePlayed()) {
            // TODO: illegal
        }
        if (!$player->pickUp($piece)) {
            // TODO: illegal
        }
        if ($hex->piece == null) {
            $hex->play($piece);
        } else if ($hex->piece->isFarm()) {
            if ($piece->isFarmer()) {
                if ($this->board->anyNeighborMatches($hex, function ($h) {
                    return is_a($h->piece, PlayedPiece)
                        && $h->piece->player == $player
                        && $h->piece->type->isNoble();
                })) {
                    $hex->play($piece);
                    // TODO: score farm
                } else {
                    // TODO: illegal
                }
            } else {
                if ($player->hasZigguratCard(ZigguratCard::NoblesInFields)) {
                    $hex->play($piece);
                    // TODO: score farm
                } else {
                    // TODO: illegal
                }
            }
        }
        
    }
}

class Player {
    public $scored_cities = array();
    public $scored_farms = array();
    private $hand = array(); /* PieceType */
    private $pool = array(); /* PieceType */
    public $ziggurats = array(); /* ZigguratCard */
    public $score = 0;

    public function __construct() {
        $pool = &$this->pool;
        for ($i = 0; $i < 6; $i++) {
            $pool[] = PieceType::Priest;
            $pool[] = PieceType::Merchant;
            $pool[] = PieceType::Civil;
            $pool[] = PieceType::Farmer;
            $pool[] = PieceType::Farmer;
        }
        shuffle($pool);
        $this->refreshHand();
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
        return array_search($type, $this->ziggurats) === false;
    }

    public function handSize() : int {
        return $this->hasZigguratCard(ZigguratCard::SEVEN_TOKENS) ? 7 : 5;
    }
}

$g = Game::newGame($argv[1], $argv[2]);
var_dump($g);

?>
