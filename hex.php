<?php

enum CityOrFarm: string {
    case Priest = 'P';
    case Civil ='N';
    case Merchant = 'M';
    case PriestCivil = 'PN';
    case CivilMerchant = 'NM';
    case MerchantPriest = 'MP';
    case PriestCivilMerchant = 'PNM';
    case Farm5 = 'F5';
    case Farm6 = 'F6';
    case Farm7 = 'F7';
    case FarmX = 'FX';

    public function isFarm(): bool {
        return match($this) {
            CityOrFarm::Farm5,
            CityOrFarm::Farm6,
            CityOrFarm::Farm7,
            CityOrFarm::FarmX => true,
            default => false,
        };
    }

    public function isCity(): bool {
        return !$this->isFarm();
    }
}

class Ziggurat {
    public $scored = false;
}

enum PieceType: string {
    case Priest = 'Priest';
    case Civil = 'Civil';
    case Merchant = 'Merchant';
    case Farmer = 'Farmer';

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
                                public PlayedPiece|CityOrFarm|Ziggurat|string|null $piece) {
    }

    public function isPlayable(): bool {
        return $this->piece == null || is_a($this->piece, CityOrFarm);
    }
    
    public function placeCityOrFarm(CityOrFarm $city_or_farm) {
        if ($this->piece != self::$city_marker) {
            throw new LogicException("attempt to place city or farm where it is not expected");
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
        return $this->piece == self::$city_marker;
    }

    public static function plain(int $row, int $col):Hex {
        return new Hex(HexType::Land, $row, $col, null);
    }

    public static function city(int $row, int $col): Hex {
        return new Hex(HexType::Land, $row, $col, self::$city_marker);
    }

    public static function water(int $row, int $col): Hex {
        return new Hex(HexType::Water, $row, $col, null);
    }

    public static function ziggurat(int $row, int $col): Hex {
        return new Hex(HexType::Water, $row, $col, new Ziggurat());
    }

    private static $city_marker = "__citymarker__";
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
            $pool[] = CityOrFarm::Priest;
            $pool[] = CityOrFarm::Civil;
            $pool[] = CityOrFarm::Merchant;
            $pool[] = CityOrFarm::PriestCivil;
            $pool[] = CityOrFarm::CivilMerchant;
            $pool[] = CityOrFarm::MerchantPriest;
        }
        for ($i = 0; $i < 3; $i++) {
            $pool[] = CityOrFarm::FarmX;
        }
        $pool[] = CityOrFarm::Farm5;
        $pool[] = CityOrFarm::Farm6;
        $pool[] = CityOrFarm::Farm7;
        if ($numPlayers > 2) {
            $pool[] = CityOrFarm::PriestCivil;
            $pool[] = CityOrFarm::CivilMerchant;
            $pool[] = CityOrFarm::MerchantPriest;
            $pool[] = CityOrFarm::PriestCivilMerchant;
            $pool[] = CityOrFarm::Farm5;
            $pool[] = CityOrFarm::Farm6;
            $pool[] = CityOrFarm::Farm7;
            $pool[] = CityOrFarm::FarmX;
        }
        if ($numPlayers > 3) {
            $pool[] = CityOrFarm::Priest;
            $pool[] = CityOrFarm::Civil;
            $pool[] = CityOrFarm::Merchant;
            for ($i = 0; $i < 3; $i++) {
                $pool[] = CityOrFarm::FarmX;
            }
        }
        shuffle($pool);
        return $pool;
    }
}

enum ZigguratType : string {
    case Plus10 = 'Plus10';
    case ExtraTurn = 'ExtraTurn';
    case SevenTokens = 'SevenTokens';
    case ThreeNobles = 'ThreeNobles';
    case NobleWith3Farmers = 'NobleWith3Farmers';
    case NoblesInFields = 'NoblesInFields';
    case ExtraCityPoints = 'ExtraCityPoints';
    case FreeCentralLandConnects = 'FreeCentralLandConnects';
    case FreeRiverConnects = 'FreeRiverConnects';
};

class Game {
    public Board $board;
    public array $players;
    public array $ziggurats;

    public static function newGame(int $numPlayers, bool $optionalZigguarts = false) : Game {
        $game = new Game();
        $game->board = Board::forPlayerCount($numPlayers);
        $game->ziggurats[] = ZigguratType::Plus10;
        $game->ziggurats[] = ZigguratType::ExtraTurn;
        $game->ziggurats[] = ZigguratType::SevenTokens;
        $game->ziggurats[] = ZigguratType::ThreeNobles;
        $game->ziggurats[] = ZigguratType::NobleWith3Farmers;
        $game->ziggurats[] = ZigguratType::NoblesInFields;
        $game->ziggurats[] = ZigguratType::ExtraCityPoints;
        if ($optionalZigguarts) {
            $game->ziggurats[] = ZigguratType::FreeCentralLandConnects;
            $game->ziggurats[] = ZigguratType::FreeRiverConnects;
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
        } else if (is_a($hex->piece, CityOrFarm) && $hex->piece->isFarm()) {
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
                if ($player->hasZiggurat(ZigguratType::NoblesInFields)) {
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
    public $ziggurats = array(); /* ZigguratType */
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

    public function hasZiggurat(ZigguratType $type): bool {
        return array_search($type, $this->ziggurats) === false;
    }

    public function handSize() : int {
        return $this->hasZiggurat(ZigguratType::SevenTokens) ? 7 : 5;
    }
}

$g = Game::newGame($argv[1], $argv[2]);
var_dump($g);

?>
