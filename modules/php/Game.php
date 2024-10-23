<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <jay@covariant.org>
 *
 * Copyright 2024 Jay Sachs <jay@covariant.org>
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

namespace Bga\Games\babylonia;

require_once(APP_GAMEMODULE_PATH . "module/table/table.game.php");

class Game extends \Table
{
    private Db $db;
    /**
     * Your global variables labels:
     *
     * Here, you can assign labels to global variables you are using for this game. You can use any number of global
     * variables with IDs between 10 and 99. If your game has options (variants), you also have to associate here a
     * label to the corresponding ID in `gameoptions.inc.php`.
     *
     * NOTE: afterward, you can get/set the global variables with `getGameStateValue`, `setGameStateInitialValue` or
     * `setGameStateValue` functions.
     */
    public function __construct()
    {
        parent::__construct();

        $this->initGameStateLabels([
            "my_first_global_variable" => 10,
            "my_second_global_variable" => 11,
            "my_first_game_variant" => 100,
            "my_second_game_variant" => 101,
        ]);

        Logging::init($this);
        $this->db = new Db($this);
    }

    private function playableHexes(Board $board, Piece $piece, PlayedTurn $played_turn): array {
        $result = [];
        $board->visitAll(function (&$hex) use (&$result, &$board, $piece, &$played_turn) {
            if ($this->iPlayAllowed($board, $piece, $hex, $played_turn)) {
                $result[] = $hex;
            }
        });
        return result;
    }

    private function isPlayAllowed(int $player_id, Board $board, Piece $piece, Hex $hex, PlayedTurn $played_turn) {
        $this->debug("isPlayAllowed: " . $piece->value . " " . $hex . " " . var_export($played_turn, true));
        // first check move limits per turn
        if (count($played_turn->moves) >= 2) {
            $this->debug("isPlayAllowed: played turn moves count " . count($played_turn->moves));
            if ($hex->isWater()) {
                $this->debug("isPlayAllowed: hex is water " . $hex->isWater());
                return false;
            }
            if ($piece->isFarmer()) {
                $this->debug("isPlayAllowed: piece is farmer");
                if (!$played_turn->allMovesFarmersOnLand($board)) {
                    $this->debug("isPlayAllowed: NOT all moves farmers on land");
                    return false;
                }
                $this->debug("isPlayAllowed: all moves farmers on land");
                // fall through
            } else {
                $this->debug("isPlayAllowed: checking for 3+ move non-farmer");
                // Now check if player has zig tiles to permit another move
                return false;
            }
        }
        // now check if piece is allowed
        if ($hex->piece == Piece::EMPTY) {
            $this->debug("isPlayAllowed: hex piece is empty");
            return true;
        }
        if ($hex->piece->isField()) {
            $this->debug("isPlayAllowed: hex piece is field");
            if ($piece->isFarmer()) {
                $this->debug("isPlayAllowed: piece is farmer");
                // ensure player has at least one noble adjacent.
                $is_noble = function ($h) use ($player_id): bool {
                    return $h->player_id == $player_id
                        && $h->piece->isNoble();
                };
                $n = count($board->neighbors($hex, $is_noble)) > 0;
                $this->debug("isPlayAllowed: count of neighboring nobles is $n");
                return $n;
            }
        }
        $this->debug("isPlayAllowed: final false");
        return false;
    }

    public function actPlayPiece(int $handpos, int $row, int $col): void
    {
        $player_id = intval($this->getActivePlayerId());

        $played_turn = $this->db->retrievePlayedTurn($player_id);
        // also retrieve ziggurat tiles held

        $board = $this->db->retrieveBoard();
        $piece = $this->db->retrieveHandPiece($player_id, $handpos);
        $hex = $board->hexAt($row, $col);
        if ($hex == null) {
            throw new \LogicException("Hex at $row $col was null");
        }
        if (!$this->isPlayAllowed($player_id, $board, $piece, $hex, $played_turn)) {
            $pv = $piece->value;
            throw new \InvalidArgumentException("Illegal to play $pv to $row, $col by $player_id");
        }

        // verify the player has remaining moves by checking `moves_this_turn` table
        // either less than 2, or all farmers and new piece is a farmer
        // or matches one of the special ziggurat tiles effects

        // verify $handpos is not empty already

        // verify the piece at $handpos is legal to play at $row, $col
        //    if existing is field:
        //      the piece must be a farmer with adjacent noble
        //      or else have zig card
        //    else it needs to be empty
        // "invert" it if it's in water.

        // score field and/or ziggurat
        //   will need to load board
        //     either to compute adjacent ziggurats, or count remaining cities
        //     (hmm, current model doesn't permit that from board, we lose track)
        //     will need a global city-count
        $fs = 0;
        $zs = 0;
        $points = $fs + $zs;

        if ($hex->isWater()) {
            $piece = Piece::HIDDEN;
        }
        $move = new Move($player_id, $piece, $handpos, $row, $col, false, $points);
        $played_turn->addMove($move);

        // update the database
        $this->db->insertMove($move);
        // TODO: need an updated hand

        // notify players of the move and scoring changes

        // Notify all players about the piece played.
        $this->notifyAllPlayers("piecePlayed", clienttranslate('${player_name} plays ${piece} to ${row} ${col}'), [
            "player_id" => $player_id,
            "player_number" => $this->getPlayerNoById($player_id),
            "player_name" => $this->getActivePlayerName(),
            "piece" => $piece,
            "handpos" => $handpos,
            "row" => $row,
            "col" => $col,
            "ziggurat_points" => $zs,
            "field_points" => $fs,
            "i18n" => ['piece'],
        ]);

        // at the end of the action, move to the next state
        // use a previously-retrieved PlayerInfo (including hand)
        // and if any pieces have legal plays, player can continue.
        // Also need to offer "pass" if have played at least 2 pieces.

        $player_info = $this->db->retrievePlayerInfo($player_id);

        // [ [FARMER => [hex1, hex2, ...] ];
        $allowed_moves = $this->getAllowedMovesByPiece($player_id, $board, $player_info, $played_turn);

        if (count($played_turn->moves) < 2) {
            $this->gamestate->nextState("mustPlayPiece");
        }
        else if ($this->getNumberAllowedMoves($player_info, $allowed_moves) == 0) {
            $this->gamestate->nextState("noMorePlayable");
        } else {
            $this->gamestate->nextState("mayPlayPiece");
        }
    }

    public function actDonePlayPieces(): void
    {
        // Retrieve the active player ID.
        $player_id = intval($this->getActivePlayerId());

        // Notify all players about the choice to pass.
        $this->notifyAllPlayers("donePlayed", clienttranslate('${player_name} finishes playing pieces'), [
            "player_id" => $player_id,
            "player_name" => $this->getActivePlayerName(),
        ]);

        // TODO: if scoring needed, go to scoring
        $this->gamestate->nextState("done");
    }

    private function getNumberAllowedMoves(PlayerInfo $player_info, array $allowed_moves) {
        $num_allowed_moves = 0;
        $seen = [];
        foreach ($allowed_moves as $piece => $moves) {
            if ($player_info->handContains(Piece::from($piece)) && !array_search($piece, $seen)) {
                $num_allowed_moves += count($moves);
                $seen[] = $piece;
            }
        }
        return $num_allowed_moves;
    }

    private function getAllowedMovesByPiece(int $player_id, Board $board, PlayerInfo $player_info, PlayedTurn $played_turn) {
        $result = [];
        $board->visitAll(function (&$hex) use (&$result, $player_id, $board, $played_turn) :void {
            foreach (Piece::playerPieces() as $piece) {
                if ($this->isPlayAllowed($player_id, $board, $piece, $hex, $played_turn)) {
                    if (!isset($result[$piece->value])) {
                        $result[$piece->value] = [];
                    }
                    $result[$piece->value][] = $hex;
                }
            }
        });
        return $result;
    }

    /**
     * Game state arguments, example content.
     *
     * This method returns some additional information that is very specific to the `playerTurn` game state.
     *
     * @return array
     * @see ./states.inc.php
     */
    public function argPlayerTurn(): array
    {
        $player_id = intval($this->getActivePlayerId());
        $played_turn = $this->db->retrievePlayedTurn($player_id);
        $player_info = $this->db->retrievePlayerInfo($player_id);
        $board = $this->db->retrieveBoard();
        // [ ["farmer" => [hex1, hex2, ...] ];
        $allowed_moves = $this->getAllowedMovesByPiece(
            $player_id,
            $board,
            $player_info,
            $played_turn
        );
        $am = [];
        foreach ($allowed_moves as $piece => &$hexlist) {
            $m = [];
            foreach ($hexlist as &$hex) {
                $m[] = [ 'row'=> $hex->row, 'col' => $hex->col ];
            }
            $am[$piece] = $m;
        }
        return [
            "allowedMoves" => $am,
        ];
    }

    /**
     * Compute and return the current game progression.
     *
     * The number returned must be an integer between 0 and 100.
     *
     * This method is called each time we are in a game state with the "updateGameProgression" property set to true.
     *
     * @return int
     * @see ./states.inc.php
     */
    public function getGameProgression()
    {
        // TODO: compute and return the game progression

        return 0;
    }

    /**
     * Game state action, example content.
     *
     * The action method of state `nextPlayer` is called everytime the current game state is set to `nextPlayer`.
     */
    public function stFinishTurn(): void {
        // Retrieve the active player ID.
        $player_id = intval($this->getActivePlayerId());

        $info = $this->db->retrievePlayerInfo($player_id);
        if (!$info->refillHand()) {
            $this->notifyAllPlayers("gameEnded", clienttranslate('${player_name} unable to refill their hand'), [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
            ]);
            $this->gamestate->nextState("endGame");
            return;
        }

        $this->db->updatePlayerInfo($player_id, $info);

        $hand = [];
        foreach ($info->hand as $piece) {
            $hand[] = ["piece" => ($piece == null) ? null : $piece->value];
        }

        $this->db->removePlayedMoves($player_id);

        // TODO: this shouldn't return the whole hand, just the refilled parts
        // Capture the delta and return *that*. Then it can be animated on
        // the client.
        $this->notifyPlayer($player_id, "handRefilled", "You refilled your hand", [
            "player_id" => $player_id,
            "player_number" => $this->getPlayerNoById($player_id),
            "hand" => $hand,
        ]);

        // Give some extra time to the active player when he completed an action
        $this->giveExtraTime($player_id);

        $this->activeNextPlayer();

        // Go to another gamestate
        // Here, we would detect if the game is over, and in this case use "endGame" transition instead
        $this->gamestate->nextState("nextPlayer");
    }

    /**
     * Migrate database.
     *
     * You don't have to care about this until your game has been published on BGA. Once your game is on BGA, this
     * method is called everytime the system detects a game running with your old database scheme. In this case, if you
     * change your database scheme, you just have to apply the needed changes in order to update the game database and
     * allow the game to continue to run with your new version.
     *
     * @param int $from_version
     * @return void
     */
    public function upgradeTableDb($from_version)
    {
//       if ($from_version <= 1404301345)
//       {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "ALTER TABLE DBPREFIX_xxxxxxx ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//       }
//
//       if ($from_version <= 1405061421)
//       {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "CREATE TABLE DBPREFIX_xxxxxxx ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//       }
    }

    /*
     * Gather all information about current game situation (visible by the current player).
     *
     * The method is called each time the game interface is displayed to a player, i.e.:
     *
     * - when the game starts
     * - when a player refreshes the game page (F5)
     */
    protected function getAllDatas()
    {
        $result = [];

        // WARNING: We must only return information visible by the current player.
        $current_player_id = intval($this->getCurrentPlayerId());

        // TODO: include zig cards info as well.
        return [
            'players' => $this->db->retrievePlayersData(),
            'hand' => $this->db->retrieveHandData($current_player_id),
            'board' => $this->db->retrieveBoardData()
        ];
    }

    /**
     * Returns the game name.
     *
     * IMPORTANT: Please do not modify.
     */
    protected function getGameName()
    {
        return "babylonia";
    }

    /**
     * This method is called only once, when a new game is launched. In this method, you must setup the game
     *  according to the game rules, so that the game is ready to be played.
     */
    protected function setupNewGame($players, $options = [])
    {
        // Set the colors of the players with HTML color code. The default below is red/green/blue/orange/brown. The
        // number of colors defined here must correspond to the maximum number of players allowed for the gams.
        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];

        foreach ($players as $player_id => $player) {
            // Now you can access both $player_id and $player array
            $query_values[] = vsprintf("('%s', '%s', '%s', '%s', '%s')", [
                $player_id,
                array_shift($default_colors),
                $player["player_canal"],
                addslashes($player["player_name"]),
                addslashes($player["player_avatar"]),
            ]);
        }

        // Create players based on generic information.
        //
        // NOTE: You can add extra field on player table in the database (see dbmodel.sql) and initialize
        // additional fields directly here.
        static::DbQuery(
            sprintf(
                "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES %s",
                implode(",", $query_values)
            )
        );

        // $this->reattributeColorsBasedOnPreferences($players, $gameinfos["player_colors"]);
        // $this->reloadPlayersBasicInfos();

        // Init global values with their initial values.

        // Dummy content.
        $this->setGameStateInitialValue("my_first_global_variable", 0);

        // Init game statistics.
        //
        // NOTE: statistics used in this file must be defined in your `stats.inc.php` file.

        // Dummy content.
        // $this->initStat("table", "table_teststat1", 0);
        // $this->initStat("player", "player_teststat1", 0);

        // TODO: Setup the initial game situation here.

        $board = Board::forPlayerCount(count($players));
        $this->db->insertBoard($board);

        $pis = [];
        foreach ($players as $player_id => $player) {
            $pis[$player_id] = PlayerInfo::newPlayerInfo($player_id);
        }
        $this->db->insertPlayerInfos($pis);

        $ziggurats = [
            ZigguratCard::PLUS_10,
            ZigguratCard::EXTRA_TURN,
            ZigguratCard::SEVEN_TOKENS,
            ZigguratCard::THREE_NOBLES,
            ZigguratCard::NOBLE_WITH_3_FARMERS,
            ZigguratCard::NOBLES_IN_FIELDS,
            ZigguratCard::EXTRA_CITY_POINTS ];
        if (!(array_search('advanced_ziggurats', $options) === false)) {
            $ziggurats[] = ZigguratCard::FREE_CENTRAL_LAND_CONNECTS;
            $ziggurats[] = ZigguratCard::FREE_RIVER_CONNECTS;
            shuffle($game->ziggurats);
            array_pop($game->ziggurats);
            array_pop($game->ziggurats);
        }

        // Activate first player once everything has been initialized and ready.
        $this->activeNextPlayer();
    }

    /**
     * This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
     * You can do whatever you want in order to make sure the turn of this player ends appropriately
     * (ex: pass).
     *
     * Important: your zombie code will be called when the player leaves the game. This action is triggered
     * from the main site and propagated to the gameserver from a server, not from a browser.
     * As a consequence, there is no current player associated to this action. In your zombieTurn function,
     * you must _never_ use `getCurrentPlayerId()` or `getCurrentPlayerName()`, otherwise it will fail with a
     * "Not logged" error message.
     *
     * @param array{ type: string, name: string } $state
     * @param int $active_player
     * @return void
     * @throws feException if the zombie mode is not supported at this game state.
     */
    protected function zombieTurn(array $state, int $active_player): void
    {
        $state_name = $state["name"];

        if ($state["type"] === "activeplayer") {
            switch ($state_name) {
                default:
                {
                    $this->gamestate->nextState("zombiePass");
                    break;
                }
            }

            return;
        }

        // Make sure player is in a non-blocking status for role turn.
        if ($state["type"] === "multipleactiveplayer") {
            $this->gamestate->setPlayerNonMultiactive($active_player, '');
            return;
        }

        throw new \feException("Zombie mode not supported at this game state: \"{$state_name}\".");
    }


    /*
     * forwarder method
     */
    final static public function getObjectListFromDB2(string $sql, bool $bUniqueValue = false): array
    {
        return self::getObjectListFromDB($sql, $bUniqueValue);
    }
}
