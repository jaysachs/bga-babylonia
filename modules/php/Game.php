<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <vagabond@covariant.org>
 *
 * Copyright 2024 Jay Sachs <vagabond@covariant.org>
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
    /** @var string */
    private const GLOBAL_PLAYER_ON_TURN = 'player_on_turn';
    /** @var string */
    private const GLOBAL_NEXT_PLAYER_TO_BE_ACTIVE = 'next_player_to_be_active';

    private PersistentStore $ps;

    public function __construct()
    {
        parent::__construct();

        $this->initGameStateLabels([
            Game::GLOBAL_PLAYER_ON_TURN => 10,
            Game::GLOBAL_NEXT_PLAYER_TO_BE_ACTIVE => 11,
            Option::ADVANCED_ZIGGURAT_CARDS->value => 100,
            Option::AUTOMATED_SCORING_SELECTION->value => 101
        ]);

        Logging::init($this);
        Stats::init($this);
        $this->ps = new PersistentStore($this);
    }

    public function actPlayPiece(int $handpos, int $row, int $col): void
    {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        $move = $model->playPiece($handpos, new RowCol($row, $col));
        $points = $move->points();
        $piece = $move->piece->value;
        if ($move->captured_piece->isField()) {
            Stats::PLAYER_FIELDS_CAPTURED->inc($player_id);
        }
        if ($move->piece->isHidden()) {
            Stats::PLAYER_RIVER_SPACES_PLAYED->inc($player_id);
        }
        $msg = "";
        if ($points > 0) {
            $msg = '${player_name} plays ${piece} to (${row},${col}) scoring ${points} points';
            Stats::PLAYER_POINTS_FROM_FIELDS->
                inc($player_id, $move->field_points);
            Stats::PLAYER_POINTS_FROM_ZIGGURATS->
                inc($player_id, $move->ziggurat_points);
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

    public function argPlayPieces(): array
    {
        $model = new Model($this->ps, $this->activePlayerId());

        return [
            "allowedMoves" => $model->getAllowedMoves(),
            "canEndTurn" => $model->canEndTurn(),
            "canUndo" => $model->turnProgress()->canUndo(),
        ];
    }

    /**
     * Compute and return the current game progression.
     *
     * This is based on total number of pieces played. Probably
     * can improve based on taking the max of that and cities scored.
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

    private function scoreZiggurat(Model $model, Hex $zighex): int {
        $scored_zig = $model->scoreZiggurat($zighex->rc);
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
                "row" => $zighex->rc->row,
                "col" => $zighex->rc->col,
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
        $scored_city = $model->scoreCity($cityhex->rc);
        $captured_by = $scored_city->captured_by;
        if ($captured_by > 0) {
            Stats::PLAYER_CITIES_CAPTURED->inc($captured_by);
            $pnk = $this->playerNameKey($captured_by);
            $msg = '${city} at (${row},${col}) scored, captured by ${' . $pnk . '}';
        } else {
            $pnk = 'noone';
            $msg = '${city} at (${row},${col}) scored, uncaptured';
        }
        $capturer_name =
            $captured_by > 0 ? $this->getPlayerNameById($captured_by) : "noone";

        $player_infos = $model->allPlayerInfo();

        $details = [];
        foreach ($player_infos as $pid => $pi) {
            $points = $scored_city->pointsForPlayer($pid);
            Stats::PLAYER_POINTS_FROM_CITY_NETWORKS->
                inc($pid, $scored_city->networkPointsForPlayer($pid));
            Stats::PLAYER_POINTS_FROM_CAPTURED_CITIES->
                inc($pid, $scored_city->capturePointsForPlayer($pid));
            $details[$pid] = [
                "player_id" => $pid,
                "player_name" => $this->getPlayerNameById($pid),
                "captured_city_count" => $pi->captured_city_count,
                "scored_hexes" => $scored_city->scoringHexesForPlayer($pid),
                "network_hexes" => $scored_city->networkHexesForPlayer($pid),
                "network_points" => $scored_city->networkPointsForPlayer($pid),
                "capture_points" => $scored_city->capturePointsForPlayer($pid),
                "score" => $pi->score,
            ];
            if ($points > 0) {
                // TODO: figure out what to do here.
                $pnk2 = $this->playerNameKey($pid);
                $details[$pid]["message"] =
                    clienttranslate('${' . $pnk2 . '} scored ${points}');
                $details[$pid][$pnk] = $this->getPlayerNameById($pid);
            }
        }

        $this->notifyAllPlayers(
            "cityScored",
            clienttranslate($msg), [
                "city" => $city,
                "row" => $cityhex->rc->row,
                "col" => $cityhex->rc->col,
                $pnk => $capturer_name,
                "captured_by" => $captured_by,
                "details" => $details,
            ]
        );
    }

    public function stAutoScoringHexSelection(): void {
        $model = new Model($this->ps, $this->playerOnTurn());
        $hexes = $model->hexesRequiringScoring();
        if (count($hexes) == 0) {
            $this->gamestate->nextState("done");
            return;
        }
        $this->actSelectHexToScore($hexes[0]->rc->row, $hexes[0]->rc->col);
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
                function ($z): string {
                    return $z->type->value;
                },
                $model->components()->availableZigguratCards()
            ),
        ];
    }

    public function actSelectZigguratCard(string $zctype): void {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        $selection =
            $model->selectZigguratCard(ZigguratCardType::from($zctype));
        Stats::PLAYER_ZIGGURAT_CARDS->inc($player_id);
        $stat = match ($selection->card->type) {
            ZigguratCardType::PLUS_10 => Stats::PLAYER_ZIGGURAT_CARD_1_CHOSEN,
            ZigguratCardType::EXTRA_TURN => Stats::PLAYER_ZIGGURAT_CARD_2_CHOSEN,
            ZigguratCardType::HAND_SIZE_7 => Stats::PLAYER_ZIGGURAT_CARD_3_CHOSEN,
            ZigguratCardType::NOBLES_3_KINDS => Stats::PLAYER_ZIGGURAT_CARD_4_CHOSEN,
            ZigguratCardType::NOBLE_WITH_3_FARMERS => Stats::PLAYER_ZIGGURAT_CARD_5_CHOSEN,
            ZigguratCardType::NOBLES_IN_FIELDS => Stats::PLAYER_ZIGGURAT_CARD_6_CHOSEN,
            ZigguratCardType::EXTRA_CITY_POINTS => Stats::PLAYER_ZIGGURAT_CARD_7_CHOSEN,
            ZigguratCardType::FREE_CENTER_LAND_CONNECTS => Stats::PLAYER_ZIGGURAT_CARD_8_CHOSEN,
            ZigguratCardType::FREE_RIVER_CONNECTS => Stats::PLAYER_ZIGGURAT_CARD_9_CHOSEN,
        };
        $stat->set($player_id, true);
        $this->notifyAllPlayers(
            "zigguratCardSelection",
            clienttranslate('${player_name} chose ziggurat card ${card}'),
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "card" => $selection->card->type->value,
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
                    return ["row" => $hex->rc->row, "col" => $hex->rc->col ];
                },
                $hexes
            ),
        ];
    }

    public function actSelectHexToScore(int $row, int $col): void {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        $rc = new RowCol($row, $col);
        $hex = $model->board()->hexAt($rc);
        if ($hex == null) {
            throw new \InvalidArgumentException("Hex at ({$rc}) can't be scored");
        }
        $msg = $this->optionEnabled(Option::AUTOMATED_SCORING_SELECTION)
            ? 'hex (${row},${col}) is scored'
            : '${player_name} chose hex (${row},${col}}) to score';
        $this->notifyAllPlayers(
            "scoringSelection",
            clienttranslate($msg),
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "row" => $rc->row,
                "col" => $rc->col,
            ]
        );

        $next_player = 0;
        if ($hex->piece->isCity()) {
            $this->scoreCity($model, $hex);
            Stats::PLAYER_CITY_SCORING_TRIGGERED->inc($player_id);
            $this->gamestate->nextState("citySelected");
        } else if ($hex->piece->isZiggurat()) {
            $next_player = $this->scoreZiggurat($model, $hex);
            if ($next_player != 0) {
                $this->setNextPlayerToBeActive($next_player);
            }
            Stats::PLAYER_ZIGGURAT_SCORING_TRIGGERED->inc($player_id);
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

        if (count($hexes) == 0) {
            $this->gamestate->nextState("done");
            return;
        }

        if ($this->optionEnabled(Option::AUTOMATED_SCORING_SELECTION)) {
            $this->gamestate->nextState("automatedHexSelection");
            return;
        }

        $this->notifyAllPlayers(
            "scoringHexChoice",
            clienttranslate('${player_name} must select a hex to score'),
            [
                "player_name" => $this->getActivePlayerName(),
            ]
        );
        $this->gamestate->nextState("selectHex");
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

        $result = $model->finishTurn();
        if ($result->gameOver()) {
            if ($result->less_than_two_remaining_cities) {
                Stats::TABLE_GAME_END_BY_CITY_CAPTURES->set(true);
            }
            if ($result->pieces_exhausted) {
                Stats::TABLE_GAME_END_BY_POOL_EXHAUSTION->set(true);
            }
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

        // TODO: this doesn't have to return the whole hand, just the
        // refilled parts.  Could capture the delta and return
        // *that*. Then it can be animated on the client.

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

        if ($model->components()->
            hasUnusedZigguratCard($player_id, ZigguratCardtype::EXTRA_TURN)) {
            $this->gamestate->nextState("extraTurn");
            return;
        }

        $this->gamestate->nextState("nextPlayer");
    }

    private function turnToNextPlayer(): void {
        $this->activeNextPlayer();
        $player_id = $this->activePlayerId();
        Stats::PLAYER_NUMBER_TURNS->inc($player_id);
        $this->giveExtraTime($player_id);
        $this->setPlayerOnTurn($player_id);
        $this->setNextPlayerToBeActive(0);
    }

    public function stNextPlayer() {
        $this->turnToNextPlayer();
        $this->gamestate->nextState("done");
    }

    public function actUndoPlay() {
        $player_id = $this->activePlayerId();
        $model = new Model($this->ps, $player_id);
        $move = $model->undo();

        if ($move->piece->isHidden()) {
            Stats::PLAYER_RIVER_SPACES_PLAYED->inc($player_id, -1);
        }
        if ($move->captured_piece->isField()) {
            Stats::PLAYER_FIELDS_CAPTURED->inc($player_id, -1);
        }
        if ($move->points() > 0) {
            Stats::PLAYER_POINTS_FROM_FIELDS->
                inc($player_id, -$move->field_points);
            Stats::PLAYER_POINTS_FROM_ZIGGURATS->inc(
                $player_id, -$move->ziggurat_points);
        }

        foreach ($model->allPlayerIds() as $pid) {
            $args = [
                "player_name" => $this->getActivePlayerName(),
                "player_number" =>
                    $this->getPlayerNoById($this->activePlayerId()),
                "preserve" => [
                    "player_number",
                ],
                "player_id" => $this->activePlayerId(),
                "row" => $move->rc->row,
                "col" => $move->rc->col,
                "piece" => $move->piece->value,
                "captured_piece" => $move->captured_piece->value,
                "points" => $move->points(),
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
                    "card" => ZigguratCardType::EXTRA_TURN->value,
                    "cardused" => true,
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
        // WARNING: We must only return information visible by the
        // current player.

        $model = new Model($this->ps, $this->currentPlayerId());

        $player_data = [];
        foreach ($model->allPlayerInfo() as $pid => $pi) {
            $player_data[$pid] = [
                "player_id" => $pid,
                "player_name" => $pi->player_name,
                "player_color" => $pi->player_color,
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
                    "row" => $hex->rc->row,
                    "col" => $hex->rc->col,
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
        // Set the colors of the players with HTML color code.The
        // number of colors defined here must correspond to the
        // maximum number of players allowed for the gams.
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
        static::DbQuery(
            sprintf(
                "INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES %s",
                implode(",", $query_values)
            )
        );

        $this->reattributeColorsBasedOnPreferences($players,
                                                   $gameinfos["player_colors"]);
        $this->reloadPlayersBasicInfos();

        // Init game statistics.
        Stats::initAll(array_keys($players));

        // Create the game mode.
        $model = new Model($this->ps, 0);
        $model->createNewGame(
            array_keys($players),
            $this->optionEnabled(Option::ADVANCED_ZIGGURAT_CARDS));

        // Activate first player once everything has been initialized and ready.
        $this->turnToNextPlayer();
    }

    private function optionEnabled(Option $option): bool {
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
                        $hex = array_shift($hexes);
                        $this->actSelectHexToScore($hex->rc->row, $hex->rc->col);
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
