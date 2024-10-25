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
    // Used during scoring ziggurats in case the scoring of a ziggurat
    //  means another player needs to choose a tile; this global holds
    //  the ID of the "primary" player, i.e. who should become active
    //  once the ziggurat tile is selected.
    private const GLOBAL_PRIMARY_PLAYER_ID = 'primary_player_id';

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
            Game::GLOBAL_PRIMARY_PLAYER_ID => 10,
            Option::ADVANCED_ZIGGURAT_TILES->value => 100
        ]);

        Logging::init($this);
        $this->db = new Db($this);
    }

    public function actPlayPiece(int $handpos, int $row, int $col): void
    {
        $player_id = intval($this->getActivePlayerId());
        $model = new Model($this->db, $player_id);

        $result = $model->playPiece($handpos, $row, $col);
        $points = $result["points"];
        $piece = $result["piece"];

        $msg = "";
        if ($points > 0) {
            $msg = clienttranslate('${player_name} plays ${piece} to ${row} ${col} scoring ${points} points');
        } else {
            $msg = clienttranslate('${player_name} plays ${piece} to ${row} ${col}');
        }
        $this->notifyAllPlayers("piecePlayed", $msg, [
            "player_id" => $player_id,
            "player_number" => $this->getPlayerNoById($player_id),
            "player_name" => $this->getActivePlayerName(),
            "piece" => $piece,
            "handpos" => $handpos,
            "row" => $row,
            "col" => $col,
            "points" => $points,
            "newscore" => $this->db->retrieveScore( $player_id ),
            "i18n" => ['piece'],
        ]);

        $this->gamestate->nextState("playPieces");
    }

    public function actDonePlayPieces(): void
    {
        $player_id = intval($this->getActivePlayerId());
        $model = new Model($this->db, $player_id);
        if (count($model->playedTurn()->moves) < 2) {
            throw new \BgaUserException("Attempt to end turn but less than 2 pieces played");
        }

        $this->notifyAllPlayers("donePlayed", clienttranslate('${player_name} finishes playing pieces'), [
            "player_id" => $player_id,
            "player_name" => $this->getActivePlayerName(),
        ]);

        // TODO: if scoring needed, go to scoring
        $this->gamestate->nextState("done");
    }

    /**
     * Game state arguments, example content.
     *
     * This method returns some additional information that is very
     * specific to the `playerTurn` game state.
     *
     * @return array
     * @see ./states.inc.php
     */
    public function argPlayPieces(): array
    {
        $model = new Model($this->db, intval($this->getActivePlayerId()));
        // [ ["farmer" => [hex1, hex2, ...] ];
        $allowed_moves = $model->getAllowedMoves();

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
            "canEndTurn" => count($model->playedTurn()->moves) >= 2,
        ];
    }

    /**
     * Compute and return the current game progression.
     *
     * The number returned must be an integer between 0 and 100.
     *
     * This method is called each time we are in a game state with the
     * "updateGameProgression" property set to true.
     *
     * @return int
     * @see ./states.inc.php
     */
    public function getGameProgression()
    {
        // TODO: compute and return the game progression

        return 0;
    }

    private function doScoring(Model $model): void {
        foreach ($model->citiesRequiringScoring() as $cityhex) {
            $scores = $model->scoreCity($cityhex);
        }
        
    }
    
    /**
     * Called when state finishTurn is entered.
     */
    public function stFinishTurn(): void {
        $player_id = intval($this->getActivePlayerId());
        $model = new Model($this->db, $player_id);

        // TODO: this doesn't belong here
        $this->doScoring();
        
        $result = $model->finishTurn();
        if ($result["gameOver"]) {
            $this->notifyAllPlayers("gameEnded", clienttranslate('${player_name} unable to refill their hand'), [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
            ]);
            $this->gamestate->nextState("endGame");
            return;
        }

        // TODO: this shouldn't return the whole hand, just the refilled parts
        // Capture the delta and return *that*. Then it can be animated on
        // the client.
        $this->notifyPlayer($player_id, "handRefilled", "You refilled your hand", [
            "player_id" => $player_id,
            "player_number" => $this->getPlayerNoById($player_id),
            "hand" => $result["hand"],
        ]);

        $this->giveExtraTime($player_id);

        $this->activeNextPlayer();

        $this->gamestate->nextState("nextPlayer");
    }

    /**
     * Migrate database.
     *
     * You don't have to care about this until your game has been
     * published on BGA. Once your game is on BGA, this method is
     * called everytime the system detects a game running with your
     * old database scheme. In this case, if you change your database
     * scheme, you just have to apply the needed changes in order to
     * update the game database and allow the game to continue to run
     * with your new version.
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
     * Gather all information about current game situation (visible by
     * the current player).
     *
     * The method is called each time the game interface is displayed
     * to a player, i.e.:
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
            'board' => $this->db->retrieveBoardData(),
            'ziggurat_cards' => $this->db->retrieveZigguratCards()
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
     * This method is called only once, when a new game is
     *  launched. In this method, you must setup the game according to
     *  the game rules, so that the game is ready to be played.
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

        $model = new Model($this->db, 0);
        $model->createNewGame(
            array_keys($players),
            $this->optionEnabled($options, Option::ADVANCED_ZIGGURAT_TILES));

        // Activate first player once everything has been initialized and ready.
        $this->activeNextPlayer();
    }

    private function optionEnabled(array $options, Option $option): bool {
        return $this->getGameStateValue($option->value) > 0;
    }

    /**
     * This method is called each time it is the turn of a player who
     * has quit the game (= "zombie" player).  You can do whatever you
     * want in order to make sure the turn of this player ends
     * appropriately (ex: pass).
     *
     * Important: your zombie code will be called when the player
     * leaves the game. This action is triggered from the main site
     * and propagated to the gameserver from a server, not from a
     * browser.  As a consequence, there is no current player
     * associated to this action. In your zombieTurn function, you
     * must _never_ use `getCurrentPlayerId()` or
     * `getCurrentPlayerName()`, otherwise it will fail with a "Not
     * logged" error message.
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
