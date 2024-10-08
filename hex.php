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
        <  C   _   _   _   _   _   _   _
        .   _   C   _   C   =   C   C   .
END;
    
    public static function fromMap(int $numPlayers): Board {
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
                $col+=2;
            }
            $row++;
        }

        switch ($numPlayers) {
        case 2:
            $board->pruneFrom(18, 16);
            break;
        case 3:
            $board->pruneFrom(2, 0);
        }

        $pool = self::initializePool($numPlayers);
        $board->placeCitiesAndFarms($pool);

        return $board;
    }

    private function placeCitiesAndFarms(array &$pool) {
        foreach ($this->hexes as &$hexrow) {
            foreach ($hexrow as &$hex) {
                if ($hex->needsCityOrFarm()) {
                    $x = array_pop($pool);
                    printf("%d:%d %s\n", $hex->row, $hex->col, $x->value);
                    $hex->placeCityOrFarm($x);
                }
            }
        }
    }

    public function __construct(private array &$hexes) {}

    private function pruneFrom(int $row, int $col) {
        $queue = [ $this->hexAt($row, $col) ];
        while ($queue) {
            $next = array();
            foreach ($queue as $h) {
                // printf("pruning $h\n");
                $hexrow = &$this->hexes[$h->row];
                unset($hexrow[$h->col]);
            }
            foreach ($queue as $h) {
                $n = $this->neighbors($h);
                // printf("neighbors are %s\n", implode(',', $n));
                $next = array_merge($next, $n);
            }
            $queue = array_unique($next);
        }
    }

    private function neighbors(Hex &$h): array {
        $r = $h->row;
        $c = $h->col;

        return array_filter(
                [
                    $this->hexAt($r-2, $c),
                    $this->hexAt($r-1, $c+1),
                    $this->hexAt($r+1, $c+1),
                    $this->hexAt($r+2, $c),
                    $this->hexAt($r+1, $c-1),
                    $this->hexAt($r-1, $c-1)
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
