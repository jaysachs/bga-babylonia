<?php

enum CityOrFarm: string {
    case Priest = 'P';
    case Noble ='N';
    case Merchant = 'M';
    case PriestNoble = 'PN';
    case NobleMerchant = 'NM';
    case MerchantPriest = 'MP';
    case PriestNobleMerchant = 'PNM';
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
    // has it scored
}

enum PieceType: string {
    case Priest = 'Priest';
    case Noble = 'Noble';
    case Merchant = 'Merchant';
    case Farmer = 'Farmer';
}

class PlayedPiece {
    // use color or some other identifer for player?
    function __construct(public PieceType $type, public string $player_id) {}
}

enum HexType: string {
    case Plain = 'Plain';
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
        return new Hex(HexType::Plain, $row, $col, null);
    }

    public static function city(int $row, int $col): Hex {
        return new Hex(HexType::Plain, $row, $col, self::$city_marker);
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

    private static function addHex(array &$hexes, Hex $hex) {
        @ $hexrow = &$hexes[$hex->row];
        if ($hexrow == null) {
            $hexes[$hex->row] = [];
        }
        $hexrow[$hex->col] = $hex;
    }

    private static function getHex(array &$hexes, int $row, int $col) : ?Hex {
        if (key_exists($row, $hexes)) {
            return @ $hexes[$row][$col];
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
        <  C   _   _   _   _   _   _   _
        .   _   C   _   C   =   C   C   .
END;
    
    public static function fromMap(int $numPlayers): Board {
        $hexes = [];
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
                    self::addHex($hexes, Hex::plain($row, $col));
                    break;
                case 'C':
                    self::addHex($hexes, Hex::city($row, $col));
                    break;
                case '!':
                    self::addHex($hexes, Hex::ziggurat($row, $col));
                    break;
                case '=':
                    self::addHex($hexes, Hex::water($row, $col));
                    break;
                }
                $col+=2;
            }
            $row++;
        }

        switch ($numPlayers) {
        case 2:
            self::pruneFrom($hexes, 18, 16);
            break;
        case 3:
            self::pruneFrom($hexes, 2, 0);
        }

        // Place cities and farms.
        $pool = Board::initializePool($numPlayers);
        foreach ($hexes as &$hexrow) {
            foreach ($hexrow as &$hex) {
                if ($hex->needsCityOrFarm()) {
                    $x = array_pop($pool);
                    printf("%d:%d %s\n", $hex->row, $hex->col, $x->value);
                    $hex->placeCityOrFarm($x);
                }
            }
        }

        return new Board($hexes);
    }

    public function __construct(private array &$hexes) {}

    private static function pruneFrom(array &$hexes, int $row, int $col) {
        $queue = [ self::getHex($hexes, $row, $col) ];
        while ($queue) {
            $next = array();
            foreach ($queue as $h) {
                // printf("pruning $h\n");
                $hexrow = &$hexes[$h->row];
                unset($hexrow[$h->col]);
            }
            foreach ($queue as $h) {
                $n = self::neighbors($hexes, $h);
                // printf("neighbors are %s\n", implode(',', $n));
                $next = array_merge($next, $n);
            }
            $queue = array_unique($next);
        }
    }

    private static function neighbors(array &$hexes, Hex &$h): array {
        $r = $h->row;
        $c = $h->col;

        return array_filter(
                [
                    self::getHex($hexes, $r-2, $c),
                    self::getHex($hexes, $r-1, $c+1),
                    self::getHex($hexes, $r+1, $c+1),
                    self::getHex($hexes, $r+2, $c),
                    self::getHex($hexes, $r+1, $c-1),
                    self::getHex($hexes, $r-1, $c-1)
                ], function ($h) {
                    return $h != null && $h->type == HexType::Plain;
                }
            );
    }

    private static function initializePool(int $numPlayers) {
        // set up city pool
        $pool = array();
        for ($i = 0; $i < 2; ++$i) {
            $pool[] = CityOrFarm::Priest;
            $pool[] = CityOrFarm::Noble;
            $pool[] = CityOrFarm::Merchant;
            $pool[] = CityOrFarm::PriestNoble;
            $pool[] = CityOrFarm::NobleMerchant;
            $pool[] = CityOrFarm::MerchantPriest;
        }
        for ($i = 0; $i < 3; $i++) {
            $pool[] = CityOrFarm::FarmX;
        }
        $pool[] = CityOrFarm::Farm5;
        $pool[] = CityOrFarm::Farm6;
        $pool[] = CityOrFarm::Farm7;
        if ($numPlayers > 2) {
            $pool[] = CityOrFarm::PriestNoble;
            $pool[] = CityOrFarm::NobleMerchant;
            $pool[] = CityOrFarm::MerchantPriest;
            $pool[] = CityOrFarm::PriestNobleMerchant;
            $pool[] = CityOrFarm::Farm5;
            $pool[] = CityOrFarm::Farm6;
            $pool[] = CityOrFarm::Farm7;
            $pool[] = CityOrFarm::FarmX;
        }
        if ($numPlayers > 3) {
            $pool[] = CityOrFarm::Priest;
            $pool[] = CityOrFarm::Noble;
            $pool[] = CityOrFarm::Merchant;
            for ($i = 0; $i < 3; $i++) {
                $pool[] = CityOrFarm::FarmX;
            }
        }
        shuffle($pool);
        return $pool;
    }


    public function hexAt(int $row, int $col): ?Hex {
        return self::getHex($this->hexes, $row, $col);
    }
}

enum BonusType {
/* ... */
};

class PlayerStuff {
    public $scored_cities = array();
    public $scored_farms = array();
    public $hand = array(); /* PieceType */
    public $pool = array(); /* PieceType */
    public $bonuses = array(); /* BonusType */
    public $score = 0;
}


$b = Board::fromMap(2);
var_dump($b);

$b = Board::fromMap(3);
var_dump($b);

$b = Board::fromMap(4);
var_dump($b);


?>
