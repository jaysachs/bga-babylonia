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
    }

    /**
     * Player action, example content.
     *
     * In this scenario, each time a player plays a card, this method will be called. This method is called directly
     * by the action trigger on the front side with `bgaPerformAction`.
     *
     * @throws BgaUserException
     */
    public function actPlayPiece(int $handpos, int $x, int $y): void
    {
        // Retrieve the active player ID.
        $player_id = (int)$this->getActivePlayerId();

        // retrieve moves already made this turn
        // retrieve ziggurat tiles held
        // retrieve the hex from the DB
        // retrieve the player's current hand

        // verify the player has remaining moves by checking `moves_this_turn` table
        // either less than 2, or all farmers and new piece is a farmer
        // or matches one of the special ziggurat tiles effects

        // verify $handpos is not empty already

        // verify the piece at $handpos is legal to play at $x, $y
        //    if existing is farm:
        //      the piece must be a farmer with adjacent noble
        //      or else have zig card
        //      the farm check requires 'the whole board'
        //    else it needs to be empty
        // "invert" it if it's in water.
        $piece_type = "priest"; // Piece::PRIEST.value;

        // score farm and/or ziggurat
        //   will need to load board
        //     either to compute adjacent ziggurats, or count remaining cities
        //     (hmm, current model doesn't permit that from board, we lose track)
        //     will need a global city-count
        $fs = 0;
        $zs = 0;
        $score_change = $fs + $zs;
        // update the database
        // update board state
        $sql = "UPDATE board
                SET piece='$piece_type', player_id='$player_id'
                WHERE board_x=$x AND board_y=$y";
        $this->DbQuery( $sql );
        if ($score_change > 0) {
            // update score
            $sql = "UPDATE player
                    SET player_score = (
                    SELECT player_score FROM player
                    WHERE player_id=$player_id) + $score_change
                    ) WHERE player_id=$player_id";
            $this->DbQuery( $sql );
        }
        // update hands
        
        $this->DbQuery( $sql );
        $sql = "UPDATE hands
                SET piece = NULL
                WHERE player_id=$player_id AND pos=$handpos";
        $this->DbQuery( $sql );

        // update "moves this turn"
        $sql = "INSERT INTO moves_this_turn
                (player_id, seq_id, piece, piece_pos, board_x, board_y, captured, points)
                VALUES($player_id, 0, '$piece_type', $handpos, $x, $y, FALSE, 0)";
        $this->DbQuery( $sql );

        // notify players of the move and scoring changes

        // Notify all players about the card played.
        $this->notifyAllPlayers("piecePlayed", clienttranslate('${player_name} plays ${piece_type}'), [
            "player_id" => $player_id,
            "player_name" => $this->getActivePlayerName(),
            "piece_type" => $piece_type,
            "x" => $x,
            "y" => $y,
            "ziggurat_score" => $zs,
            "farm_score" => $fs,
            "i18n" => ['piece_type'],
        ]);

        // at the end of the action, move to the next state
        $this->gamestate->nextState("playPiece");
    }

    private function saveBoardToDb(&$board): void {
        $sql = "INSERT INTO board (board_x, board_y, hextype, piece, scored, player_id) VALUES ";
        $sql_values = [];
        $board->visitAll(function ($hex) use (&$sql_values) {
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
        $this->DbQuery( $sql );
    }

    private function savePlayerInfosToDb(&$pis): void {
        // first the pools
        $sql = "INSERT INTO handpools (player_id, seq_id, piece) VALUES ";
        $sql_values = [];
        foreach ($pis as $player_id => $pi) {
            foreach ($pi->pool as $p) {
                $sql_values[] = "($player_id, NULL, '$p->value')";
            }
        }
        $sql .= implode(',', $sql_values);
        $this->DbQuery( $sql );

        // then the hands
        $sql = "INSERT INTO hands (player_id, pos, piece) VALUES ";
        $sql_values = [];
        foreach ($pis as $player_id => $pi) {
            for ($i = 0; $i < count($pi->hand); ++$i) {
                $p = $pi->hand[$i];
                $sql_values[] = "($player_id, $i, '$p->value')";
            }
        }
        $sql .= implode(',', $sql_values);
        $this->DbQuery( $sql );

    }

    public function actPass(): void
    {
        // Retrieve the active player ID.
        $player_id = (int)$this->getActivePlayerId();

        // Notify all players about the choice to pass.
        $this->notifyAllPlayers("cardPlayed", clienttranslate('${player_name} passes'), [
            "player_id" => $player_id,
            "player_name" => $this->getActivePlayerName(),
        ]);

        // at the end of the action, move to the next state
        $this->gamestate->nextState("pass");
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
        // Get some values from the current game situation from the database.

        return [
            "playableCardsIds" => [1, 2],
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
        $player_id = (int)$this->getActivePlayerId();

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
        $current_player_id = (int) $this->getCurrentPlayerId();

        // Get information about players.

        // TODO: include zig cards info as well.
        $result["players"] = $this->getCollectionFromDb(
            "SELECT P.player_id, P.player_score score, P.player_no player_number, H.hand_size
             FROM
               (SELECT player_id, COUNT(*) hand_size FROM hands GROUP BY player_id) H
             JOIN player P
             ON P.player_id = H.player_id"
            // "SELECT P.player_id player_id,
            //         P.player_score score,
            //         P.player_color color,
            //         COUNT(H.piece) hand_size,
            //         GROUP_CONCAT(z.ziggurat_card SEPARATOR ',') cards
            //  FROM player P
            //  INNER JOIN hands H ON P.player_id = H.player_id
            //  INNER JOIN ziggurat_cards Z ON P.player_id = Z.player_id"
        );

        $result["hand"] = $this->getObjectListFromDB(
            "SELECT piece from hands WHERE player_id = $current_player_id ORDER BY pos"
        );

        $result['board'] = self::getObjectListFromDB(
            "SELECT board_x x, board_y y, hextype, piece, scored, player_id board_player FROM board"
        );

        return $result;
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
        $this->saveBoardtoDb($board);

        $pis = [];
        foreach ($players as $player_id => $player) {
            $pis[$player_id] = PlayerInfo::newPlayerInfo($player_id);
        }
        $this->savePlayerInfosToDb($pis);

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
}
