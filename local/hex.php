<?php

enum Piece: string {
    case ZIGGURAT = 'ziggurat';
    case PRIEST = 'priest';
    case SERVANT = 'servant';
    case MERCHANT = 'merchant';
    case FARMER = 'farmer';
    case SECRET = 'secret';
    case CITY_P = 'city_p';
    case CITY_S = 'city_s';
    case CITY_M = 'city_m';
    case CITY_SP = 'city_sp';
    case CITY_MP = 'city_mp';
    case CITY_MS = 'city_ms';
    case CITY_MSP = 'city_msp';
    case FARM_5 = 'farm_5';
    case FARM_6 = 'farm_6';
    case FARM_7 = 'farm_7';
    case FARM_CITIES = 'farm_X';
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
            Piece::CITY_S,
            Piece::CITY_M,
            Piece::CITY_SP,
            Piece::CITY_MP,
            Piece::CITY_MS,
            Piece::CITY_MSP => true,
            default => false,
        };
    }

    public function isPlayerPiece(): bool {
        return $this->isFarmer() || $this->isNoble() || $this->isSecret();
    }
    public function isSecret(): bool { return $this == Piece::SECRET; }
    public function isFarmer(): bool { return $this == Piece::FARMER; }
    public function isNoble(): bool {
        return match ($this) {
            Piece::MERCHANT,
            Piece::SERVANT,
            Piece::PRIEST => true,
            default => false,
        };
    }
}

class Ziggurat {
    public $scored = false;
}

class PlayedPiece {
    // use color or some other identifer for player?
    function __construct(public PieceType $type, public string $player_id) {}
}

enum HexType: string {
    case LAND = 'LAND';
    case WATER = 'WATER';
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
                                public Piece|PlayedPiece|null $piece,
                                public bool $scored = false) {
    }

    public function isPlayable(): bool {
        return $this->piece == null || $this->piece->isCity() || $this->piece->isFarm();
    }

    public function placeFeature(Piece $feature) {
        if ($this->piece != Piece::PLACEHOLDER) {
            throw new LogicException("attempt to place city or farm where it is not expected");
        }
        if (!$feature->isCity() && !$feature->isFarm() && $feature != Piece::ZIGGURAT) {
            throw new LogicException("attempt to place a non-city or farm");
        }
        $this->piece = $feature;
    }

    public function playPiece(PlayedPiece $p) {
        if ($this->piece != Piece::PLACEHOLDER && $this->piece != null) {
            throw new LogicException("attempt to play a piece $p in occupied hex $this");
        }
        if ($this->type == Hextype::WATER) {
            $this->piece = new PlayedPiece(Piece::SECRET, $p->player_id);
        } else {
            $this->piece = $p;
        }
    }

    public function needsCityOrFarm(): bool {
        return $this->piece == Piece::PLACEHOLDER;
    }

    public static function land(int $row, int $col):Hex {
        return new Hex(HexType::LAND, $row, $col, null);
    }

    public static function city(int $row, int $col): Hex {
        return new Hex(HexType::LAND, $row, $col, Piece::PLACEHOLDER);
    }

    public static function water(int $row, int $col): Hex {
        return new Hex(HexType::WATER, $row, $col, null);
    }

    public static function ziggurat(int $row, int $col): Hex {
        return new Hex(HexType::LAND, $row, $col, Piece::ZIGGURAT);
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
                    $board->addHex(Hex::land($row, $col));
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
                    $hex->placeFeature($x);
                }
            }
        );
    }

    public function visitAll(Closure $visit) {
        foreach ($this->hexes as &$hexrow) {
            foreach ($hexrow as &$hex) {
                $visit($hex);
            }
        }
    }

    /* "SELECT board_x x, board_y y, hextype, piece, scored, board_player FROM board" ); */
    public static function fromDbResult($dbresults): Board {
        $hexes = [];
        $board = new Board($hexes);
        foreach ($dbresults as &$result) {
            $row = $result['board_y'];
            $col = $result['board_x'];

            $hex = null;
            $type = $result['hextype'];
            switch ($type) {
            case HexType::LAND :
                $hex = Hex::land($row, $col);
                break;
            case HexType::WATER :
                $hex = Hex::water($row, $col);
                break;
            }
            $board->addHex($hex);
            $p = Piece::from($result['piece']);
            if ($p->isPlayerPiece()) {
                $hex->playPiece(new PlayedPiece($p, $result['board_player']));
            } else {
                $hex->placeFeature($p);
            }
        }
        return $board;
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
                    if (array_search($n, $seen) === false) {
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
            function(&$hex) {
                if ($hex->type == HexType::LAND) {
                  $hexrow = &$this->hexes[$hex->row];
                  unset($hexrow[$hex->col]);
                  return true;
                }
                return false;
            }
        );
    }

    public function adjacentZiggurats(string $player_id): int {
        $adjacent = 0;
        foreach ($this->hexes as &$hex) {
            if ($hex->piece == Piece::ZIGGURAT) {
                $nb = $this->neighbors($hex, function(&$nh) use ($player_id) {
                    return $nh->piece->isPlayerPiece() && $nh->piece->player_id == $player_id;
                });
                if (count($nb) > 0) {
                    $adjacent++;
                }
            }
        }
        return $adjacent;
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
            $pool[] = Piece::CITY_S;
            $pool[] = Piece::CITY_M;
            $pool[] = Piece::CITY_SP;
            $pool[] = Piece::CITY_MS;
            $pool[] = Piece::CITY_MP;
        }
        for ($i = 0; $i < 3; $i++) {
            $pool[] = Piece::FARM_CITIES;
        }
        $pool[] = Piece::FARM_5;
        $pool[] = Piece::FARM_6;
        $pool[] = Piece::FARM_7;
        if ($numPlayers > 2) {
            $pool[] = Piece::CITY_SP;
            $pool[] = Piece::CITY_MS;
            $pool[] = Piece::CITY_MP;
            $pool[] = Piece::CITY_MSP;
            $pool[] = Piece::FARM_5;
            $pool[] = Piece::FARM_6;
            $pool[] = Piece::FARM_7;
            $pool[] = Piece::FARM_CITIES;
        }
        if ($numPlayers > 3) {
            $pool[] = Piece::CITY_P;
            $pool[] = Piece::CITY_S;
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

    public function saveBoardToDb(): void {
        $sql = "INSERT INTO board (board_x, board_y, hextype, piece, scored, player_id) VALUES ";
        $sql_values = [];
        $this->board->visitAll(function ($hex) use (&$sql_values) {
            $player_id = 'NULL';
            $piece = 'NULL';
            if (is_a($hex->piece, 'PlayedPiece')) {
                $piece = "'" . $hex->piece->type->value . "'";
                $player_id = $hex->piece->player_id;
            } else if ($hex->piece != null) {
                $piece = "'" . $hex->piece->value . "'";
            }
            $t = $hex->type->value;
            $scored = $hex->scored ? 'TRUE' : 'FALSE';
            $sql_values[] = "($hex->col, $hex->row, '$t', $piece, $scored, $player_id)";
        });
        $sql .= implode(',', $sql_values);
        // $this->DbQuery( $sql );
    }

    public function getDatas(): array {
        $result = [];

        // WARNING: We must only return information visible by the current player.
        $current_player_id = (int) $this->getCurrentPlayerId();

        // Get information about players.

        $result["players"] = $this->getCollectionFromDb(
            "SELECT P.player_id player_id,
                    P.player_score score,
                    P.player_color color,
                    COUNT(H.piece) hand_size,
                    GROUP_CONCAT(z.ziggurat_card SEPARATOR ',') cards
             FROM player P
             INNER JOIN hands H ON P.player_id = H.player_id
             INNER JOIN ziggurat_cards Z ON P.player_id = Z.player_id"
        );

        $result['board'] = self::getObjectListFromDB(
            "SELECT board_x x, board_y y, hextype, piece, scored, board_player FROM board" );

        // Gather all information about current game situation (visible by player $current_player_id).
        $result['current_player_hand'] = self::getCollectionFromDb(
            "SELECT pos, piece FROM hands WHERE player_id=" . $current_player_id);

        return $result;
    }

    public function isPlayPermitted(Player &$player, Piece $piece, int $row, int $col): bool {
        if (!$piece->isPlayerPiece()) {
            throw new InvalidArgumentException("attempt to place a non-player piece: $piece at $row $col");
        }
        if (array_search($this->players, $player) === false) {
            throw new InvalidArgumentException("unknown player: $player");
        }

        // TODO: check that player has this piece

        // TODO: pass in current moves this turn and verify playing is allowed

        $hex = $this->board->hexAt($row, $col);
        if ($hex == null) {
            throw new InvalidArgumentException("Unknown row,col: $row, $col");
        }

        if ($hex->piece == null || $hex->piece == Piece::PLACEHOLDER) {
            return true;
        }

        if ($hex->piece->isFarm()) {
            if ($piece->isFarmer()) {
                 // requires scoring
                return ($this->board->anyNeighborMatches($hex, function ($h) {
                    return is_a($h->piece, PlayedPiece)
                        && $h->piece->player_id == $player->player_id
                        && $h->piece->type->isNoble();
                }));
            }
            if ($player->hasZigguratCard(ZigguratCard::NoblesInFields)) {
                return true;
            }
        }

        return false;
    }

    public function playPiece(PlayedPiece $piece, int $row, int $col) {
        // TODO:  pass in moves this turn and update/return it

        if (!isPlayPermitted($player, $piece, $row, $col)) {
            throw new InvalidArgumentException("not permitted to play $piece at $row $col");
        }
        $hex = $this->board->hexAt($row, $col);
        if ($hex->piece == null || $hex->piece == Piece::PLACEHOLDER) {
            $hex->playPiece($piece);
        } else if ($hex->piece->isFarm()) {
            $hex->playPiece($piece);
            // TODO: score farm
        } else {
            throw new InvalidArgumentException("Attempt to place $piece on hex $hex not permitted");
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

$g = Game::newGame($argv[1], $argv[2]);
var_dump($g);
$g->saveBoardToDb();
?>
