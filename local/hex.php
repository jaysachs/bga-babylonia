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

$p = PlayerInfo::newPlayerInfo(0);
var_dump($p);

$p->hand[1] = null;
$p->hand[3] = null;
$b = $p->refillHand();

var_dump($p);

// $g = Game::newGame($argv[1], $argv[2]);
// var_dump($g);
// $g->saveBoardToDb();
?>
