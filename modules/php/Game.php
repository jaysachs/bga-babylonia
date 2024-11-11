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
    //  means another player needs to choose a card; this global holds
    //  the ID of the "primary" player, i.e. who should become active
    //  once the ziggurat card is selected.
    private const GLOBAL_PLAYER_ON_TURN = 'player_on_turn';
    private const GLOBAL_NEXT_PLAYER_ACTIVE = 'next_player_to_be_active';

    private PersistentStore $ps;
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
            Game::GLOBAL_PLAYER_ON_TURN => 10,
            Game::GLOBAL_NEXT_PLAYER_TO_BE_ACTIVE => 11,
            Option::ADVANCED_ZIGGURAT_CARDS->value => 100
        ]);

        Logging::init($this);
        $this->ps = new PersistentStore($this);
    }

    public function actPlayPiece(int $handpos, int $row, int $col): void
    {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        $move = $model->playPiece($handpos, $row, $col);
        $points = $move->points;
        $piece = $move->piece->value;

        $msg = "";
        if ($points > 0) {
            $msg = '${player_name} plays ${piece} to (${row},${col}) scoring ${points} points';
        } else {
            $msg = '${player_name} plays ${piece} to (${row},${col})';
        }
        $player_info = $model->allPlayerInfo()[$player_id];
        $this->notifyAllPlayers(
            "piecePlayed",
            clienttranslate($msg),
            [
                "player_id" => $player_id,
                "player_number" => $this->getPlayerNoById($player_id),
                "preserve" => [
                    "player_number",
                ],
                "player_name" => $this->getActivePlayerName(),
                "piece" => $piece,
                "handpos" => $handpos,
                "row" => $row,
                "col" => $col,
                "points" => $points,
                "score" => $player_info->score,
                "hand_size" => $model->hand()->size(),
            ]
        );

        $this->gamestate->nextState("playPieces");
    }

    public function actDonePlayPieces(): void
    {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        if (!$model->canEndTurn()) {
            throw new \BgaUserException("Attempt to end turn but less than 2 pieces played");
        }

        $this->notifyAllPlayers(
            "donePlayed",
            clienttranslate('${player_name} finishes playing pieces'),
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
            ]
        );

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
        $model = new Model($this->ps, $this->activePlayerId());
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
            "canEndTurn" => $model->canEndTurn(),
            "canUndo" => $model->turnProgress()->canUndo(),
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
        $model = new Model($this->ps, $this->activePlayerId());
        $player_infos = $model->allPlayerInfo();
        $total_pieces = 0;
        $played_pieces = 0;
        foreach ($player_infos as $pid => $pi) {
            $total_pieces += 30;
            $played_pieces += 30 - $pi->hand_size - $pi->pool_size;
        }
        return intval(($played_pieces * 100) / $total_pieces);
    }

    private function scoreHex(Model $model, Hex $hex): int {
        if ($hex->piece->isCity()) {
            $this->scoreCity($model, $hex);
            return 0;
        } else if ($hex->piece->isZiggurat()) {
            return $this->scoreZiggurat($model, $hex);
        }
        return 0;
    }

    private function scoreZiggurat(Model $model, Hex $zighex): int {
        $scored_zig = $model->scoreZiggurat($zighex);
        $winner = $scored_zig->winning_player_id;
        if ($winner == 0) {
            $winner_name = 'noone';
            $pnk = 'unused';
            $msg = 'Ziggurat at (${row},${col}) scored, no winner';
        } else {
            $winner_name = $this->getPlayerNameById($winner);
            $pnk = $this->playerNameKey($scored_zig->winning_player_id);
            $msg = '${city} at (${row},${col}) scored, winner is ${' . $pnk . '}';
        }
        $this->notifyAllPlayers(
            "zigguratScored",
            clienttranslate($msg), [
                "row" => $zighex->row,
                "col" => $zighex->col,
                $pnk => $winner_name,
                "city" => "ziggurat",
            ]
        );
        return $winner;
    }

    // returns string key that will render nicely
    private function playerNameKey(int $player_id): string {
        return 'player_name' . $this->getPlayerNoById($player_id);
    }

    private function scoreCity(Model $model, Hex $cityhex): void {
        // grab this, as it will change underneath when the model scores it.
        $city = $cityhex->piece->value;
        $scored_city = $model->scoreCity($cityhex);
        $captured_by = $scored_city->captured_by;
        if ($captured_by > 0) {
            $pnk = $this->playerNameKey($captured_by);
            $msg = '${city} at (${row},${col}) scored, captured by ${' . $pnk . '}';
        } else {
            $pnk = 'noone';
            $msg = '${city} at (${row},${col}) scored, uncaptured';
        }
        $capturer_name =
            $captured_by > 0 ? $this->getPlayerNameById($captured_by) : "noone";

        $player_infos = $model->allPlayerInfo();
        // First notify that the city was captured
        $this->notifyAllPlayers(
            "cityScored",
            clienttranslate($msg), [
                "city" => $city,
                "row" => $cityhex->row,
                "col" => $cityhex->col,
                $pnk => $capturer_name,
                "captured_by" => $captured_by,
            ]
        );

        // Then notify of the scoring details
        foreach ($player_infos as $pid => $pi) {
            // foreach (array_keys($this->loadPlayersBasicInfos()) as $pid) {
            $points = $scored_city->pointsForPlayer($pid);
            if ($points > 0) {
                $pnk = $this->playerNameKey($pid);
                $this->notifyAllPlayers(
                    "cityScoredPlayer",
                    clienttranslate('${' . $pnk . '} scored ${points}'), [
                        // TODO: make more efficient, by only passing the delta?
                        "captured_city_count" => $pi->captured_city_count,
                        "scored_hexes" => $scored_city->hexesScoringForPlayer($pid),
                        "points" => $points,
                        "score" => $pi->score,
                        "player_id" => $pid,
                        $pnk => $this->getPlayerNameById($pid),
                    ]
                );
            }
        }
    }


    public function argZigguratScoring(): array {
        return [];
    }

    public function stZigguratScoring(): void {
        $next_player_id = $this->nextPlayerToBeActive();
        if ($next_player_id != 0) {
            if ($next_player_id != $this->activePlayerId()) {
                $this->gamestate->changeActivePlayer($next_player_id);
                $this->giveExtraTime($next_player_id);
            }
            $this->gamestate->nextState("selectZiggurat");
        } else {
            $this->gamestate->nextState("next");
        }
    }

    public function argSelectZigguratCard(): array {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        $zcards = $model->components()->availableZigguratCards();
        return [
            "available_cards" => array_map(
                function ($z) {
                    return $z->type->value;
                },
                $model->components()->availableZigguratCards()
            ),
        ];
    }

    public function actSelectZigguratCard(string $card_type) {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        $selection = $model->selectZigguratCard(ZigguratCardType::from($card_type));

        $this->notifyAllPlayers(
            "zigguratCardSelection",
            clienttranslate('${player_name} chose ziggurat card ${zcard}'),
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "zcard" => $selection->card->type->value,
                "cardused" => $selection->card->used,
                "points" => $selection->points,
                "score" => $model->allPlayerInfo()[$player_id]->score,
                "card_description" => "short description of card"
            ]
        );
        $this->gamestate->nextState("cardSelected");
    }

    public function argSelectHexToScore(): array {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        $hexes = $model->hexesRequiringScoring();

        return [
            "hexes" => array_map(
                function ($hex) {
                    return ["row" => $hex->row, "col" => $hex->col ];
                },
                $hexes
            ),
        ];
    }

    public function actSelectHexToScore(int $row, int $col): void {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        $hex = $model->board()->hexAt($row, $col);
        if ($hex == null) {
            throw new \InvalidArgumentException("Hex at ({$row},{$col}) can't be scored");
        }
        $this->notifyAllPlayers(
            "scoringSelection",
            clienttranslate('${player_name} chose hex (${row},${col}) to score'),
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "row" => $row,
                "col" => $col,
            ]
        );
        $piece = $hex->piece;
        $next_player = $this->scoreHex($model, $hex);
        if ($next_player != 0) {
            $this->setNextPlayerToBeActive($next_player);
        }

        if ($piece->isCity()) {
            $this->gamestate->nextState("citySelected");
        } else {
            $this->gamestate->nextState("zigguratSelected");
        }
    }

    public function stEndOfTurnScoring(): void {
        $player_id = $this->activePlayerId();
        $player_on_turn = $this->playerOnTurn();
        if ($player_id != $player_on_turn) {
            $this->gamestate->changeActivePlayer($player_on_turn);
            $this->giveExtraTime($player_on_turn);
            $player_id = $player_on_turn;
        }
        $model = new Model($this->ps, $player_id);
        $hexes = $model->hexesRequiringScoring();

        $this->setNextPlayerToBeActive(0);

        // TODO: make auto-choice when there is 1 a preference or game option.
        if (count($hexes) > 0 /* 1 */) {
            $this->notifyAllPlayers(
                "scoringHexChoice",
                clienttranslate('${player_name} must select a hex to score'),
                [
                    "player_name" => $this->getActivePlayerName(),
                ]
            );
            $this->gamestate->nextState("selectHex");
            return;
        }

        $this->gamestate->nextState("done");
    }

    public function stFinishTurn(): void {
        $player_id = $this->activePlayerId();
        $player_on_turn = $this->playerOnTurn();
        if ($player_on_turn != 0) {
            if ($player_on_turn != $player_id) {
                $this->giveExtraTime($player_on_turn);
                $this->gamestate->changeActivePlayer($player_on_turn);
                $player_id = $player_on_turn;
            }
        }

        $model = new Model($this->ps, $player_id);

        if ($model->finishTurn()) {
            $this->notifyAllPlayers(
                "gameEnded",
                clienttranslate('Game has ended'),
                [
                    "player_id" => $player_id,
                    "player_name" => $this->getActivePlayerName(),
                ]
            );
            $this->gamestate->nextState("endGame");
            return;
        }

        // TODO: this doesn't have to return the whole hand,
        // just the refilled parts.
        // Could capture the delta and return *that*. Then it can be animated on
        // the client.

        $this->notifyPlayer(
            $player_id,
            "handRefilled",
            clienttranslate("You refilled your hand"),
            [
                "player_id" => $player_id,
                'hand' => array_map(function ($p) { return $p->value; },
                                    $model->hand()->pieces()),
            ]
        );

        $this->notifyAllPlayers(
            "turnFinished",
            clienttranslate('${player_name} finished their turn'),
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "player_number" => $this->getPlayerNoById($player_id),
                "hand_size" => $model->hand()->size(),
                "pool_size" => $model->pool()->size(),
            ]
        );

        $this->setNextPlayerToBeActive(0);

        if ($model->components()->hasUnusedZigguratCard($player_id, ZigguratCardtype::EXTRA_TURN)) {
            $this->gamestate->nextState("extraTurn");
            return;
        }

        $this->gamestate->nextState("nextPlayer");
    }

    public function stNextPlayer() {
        $this->activeNextPlayer();
        $this->giveExtraTime($this->activePlayerId());
        $this->setPlayerOnTurn($this->activePlayerId());
        $this->gamestate->nextState("done");
    }

    public function actUndoPlay() {
        $model = new Model($this->ps, $this->activePlayerId());
        $move = $model->undo();

        foreach ($model->allPlayerIds() as $pid) {
            $args = [
                "player_name" => $this->getActivePlayerName(),
                "player_number" => $this->getPlayerNoById($this->activePlayerId()),
                "preserve" => [
                    "player_number",
                ],
                "player_id" => $this->activePlayerId(),
                "row" => $move->row,
                "col" => $move->col,
                "piece" => $move->piece->value,
                "captured_piece" => $move->captured_piece->value,
                "points" => $move->points,
            ];

            if ($pid == $this->activePlayerId()) {
                $args["handpos"] = $move->handpos;
                $args["original_piece"] = $move->original_piece->value;
                $msg = 'You undid your move and returned ${original_piece} to your hand.';
            } else {
                $msg = '${player_name} undid their move';
            }
            $this->notifyPlayer($pid, "undoMove", clienttranslate( $msg ), $args );
        }

        // final notifyAll required to keep moves and replays in sync
        $this->notifyAllPlayers('sync', '', []);

        $this->gamestate->nextState("playPieces");
    }

    public function actChooseExtraTurn(bool $take_extra_turn) {
        if ($take_extra_turn) {
            $player_id = $this->activePlayerId();
            $model = new Model($this->ps, $player_id);
            $model->useExtraTurnCard();
            $this->notifyAllPlayers(
                "extraTurnUsed",
                clienttranslate('${player_name} is taking an extra turn'),
                [
                    "player_id" => $player_id,
                    "player_name" => $this->getActivePlayerName(),
                ]
            );
            $this->gamestate->nextState("extraTurn");
        } else {
            $this->gamestate->nextState("nextPlayer");
        }
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

    private function currentPlayerId(): int {
        return intval($this->getCurrentPlayerId());
    }

    private function activePlayerId(): int {
        return intval($this->getActivePlayerId());
    }

    private function playerOnTurn(): int {
        return intval($this->getGameStateValue(Game::GLOBAL_PLAYER_ON_TURN));
    }

    private function setPlayerOnTurn(int $player_id) {
        $this->setGameStateValue(Game::GLOBAL_PLAYER_ON_TURN, $player_id);
    }

    private function nextPlayerToBeActive(): int {
        return intval(
            $this->getGameStateValue(Game::GLOBAL_NEXT_PLAYER_TO_BE_ACTIVE));
    }

    private function setNextPlayerToBeActive(int $player_id) {
        $this->setGameStateValue(Game::GLOBAL_NEXT_PLAYER_TO_BE_ACTIVE,
                                 $player_id);
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
        // WARNING: We must only return information visible by the current player.

        $model = new Model($this->ps, $this->currentPlayerId());

        $player_data = [];
        foreach ($model->allPlayerInfo() as $pid => $pi) {
            $player_data[$pid] = [
                "player_id" => $pid,
                "player_name" => $pi->player_name,
                "player_number" => $pi->player_number,
                "score" => $pi->score,
                "captured_city_count" => $pi->captured_city_count,
                "hand_size" => $pi->hand_size,
                "pool_size" => $pi->pool_size
            ];
        }
        $board_data = [];
        $model->board()->visitAll(
            function (&$hex) use (&$board_data) {
                $board_data[] = [
                    "row" => $hex->row,
                    "col" => $hex->col,
                    "hextype" => $hex->type->value,
                    "piece" => $hex->piece->value,
                    "board_player" => $hex->player_id,
                ];
            }
        );

        return [
            'players' => $player_data,
            'hand' => array_map(function ($p) { return $p->value; },
                                $model->hand()->pieces()),
            'board' => $board_data,
            'ziggurat_cards' =>
                array_map(
                    function ($z) { return [
                        "type" => $z->type->value,
                        "owning_player_id" => $z->owning_player_id,
                        "used" => $z->used,
                        "tooltip" => clienttranslate($z->type->tooltip()),
                    ]; },
                    $model->components()->allZigguratCards()),
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

        // Init game statistics.
        //
        // NOTE: statistics used in this file must be defined in your `stats.inc.php` file.

        // Dummy content.
        // $this->initStat("table", "table_teststat1", 0);
        // $this->initStat("player", "player_teststat1", 0);

        $model = new Model($this->ps, 0);
        $model->createNewGame(
            array_keys($players),
            $this->optionEnabled($options, Option::ADVANCED_ZIGGURAT_CARDS));

        // Activate first player once everything has been initialized and ready.
        $this->activeNextPlayer();
        $this->giveExtraTime($this->activePlayerId());
        $this->setPlayerOnTurn($this->activePlayerId());
        $this->setNexPlayerActive(0);
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
                case 'selectHexToScore':
                {
                    // If a player goes zombie when they are on turn
                    // and have surrounded one or more ziggurats / cities.
                    // the game cannot progress properly. So choose one
                    // randomly.
                    $player_id = $this->activePlayerId();
                    $model = new Model($this->ps, $player_id);
                    $hexes = $model->hexesRequiringScoring();
                    if (count($hexes) > 0) {
                        shuffle($hexes);
                        $hex = array_shift($hexes);
                        $this->actSelectHexToScore($hex->row, $hex->col);
                    }
                    break;
                }
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

    /*
     * forwarder method
     */
    final public function getNonEmptyObjectFromDB2(string $sql): array
    {
        return $this->getNonEmptyObjectFromDB($sql);
    }
}
