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

require_once("Stats.php");

class Game extends \Bga\GameFramework\Table /* implements \Bga\Games\babylonia\StatsImpl */
{
    // Used during scoring ziggurats in case the scoring of a ziggurat
    //  means another player needs to choose a card; this global holds
    //  the ID of the "primary" player, i.e. who should become active
    //  once the ziggurat card is selected.
    /** @var string */
    private const GLOBAL_PLAYER_ON_TURN = 'player_on_turn';
    /** @var string */
    private const GLOBAL_ROW_COL_BEING_SCORED = 'row_col_being_scored';

    private PersistentStore $ps;
    private Stats $stats;

    public function __construct()
    {
        parent::__construct();

        $this->initGameStateLabels([
            Game::GLOBAL_PLAYER_ON_TURN => 10,
            Game::GLOBAL_ROW_COL_BEING_SCORED => 11,
        ]);

        $this->stats = new Stats($this);
        $this->ps = new PersistentStore(new DefaultDb());
    }

    public function actPlayPiece(int $handpos, int $row, int $col): void
    {
        $player_id = $this->activePlayerId();
        $model = $this->model();
        $move = $model->playPiece($handpos, new RowCol($row, $col));
        $points = $move->points();
        $piece = $move->piece->value;
        if ($move->captured_piece->isField()) {
            $this->stats->PLAYER_FIELDS_CAPTURED->inc($player_id);
        }
        if ($move->piece->isHidden()) {
            $this->stats->PLAYER_RIVER_SPACES_PLAYED->inc($player_id);
        }
        $msg = null;
        if ($points > 0) {
            $msg = clienttranslate('${player_name} plays ${piece} to (${row},${col}) scoring ${points}');
            $this->stats->PLAYER_POINTS_FROM_FIELDS->inc($player_id, $move->field_points);
            $this->stats->PLAYER_POINTS_FROM_ZIGGURATS->inc($player_id, $move->ziggurat_points);
        } else {
            $msg = clienttranslate('${player_name} plays ${piece} to (${row},${col})');
        }
        $this->notify->all(
            "piecePlayed",
            $msg,
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "piece" => $piece,
                "handpos" => $handpos,
                "row" => $row,
                "col" => $col,
                "captured_piece" => $move->captured_piece->value,
                "points" => $points,
                "ziggurat_points" => $move->ziggurat_points,
                "field_points" => $move->field_points,
                "hand_size" => $model->hand()->size(),
                "touched_ziggurats" => $move->touched_ziggurats,
            ]
        );

        $this->gamestate->nextState("playPieces");
    }

    public function actDonePlayPieces(): void
    {
        $model = $this->model();
        if (!$model->canEndTurn()) {
            throw new \BgaUserException("Attempt to end turn but less than 2 pieces played");
        }

        $this->notify->all(
            "donePlayed",
            clienttranslate('${player_name} finishes playing pieces'),
            [
                "player_id" => $this->activePlayerId(),
                "player_name" => $this->getActivePlayerName(),
            ]
        );

        $this->gamestate->nextState("done");
    }

    public function argPlayPieces(): array
    {
        $model = $this->model();

        return [
            "allowedMoves" => $model->getAllowedMoves(),
            "canEndTurn" => $model->canEndTurn(),
            "canUndo" => $model->canUndo(),
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
        $model = $this->model();
        $player_infos = $model->allPlayerInfo();
        $total_pieces = 30 * count($player_infos);
        $remaining_pieces = 0;
        foreach ($player_infos as $pid => $pi) {
            $remaining_pieces += $pi->hand_size + $pi->pool_size;
        }
        return intval(100 - ($remaining_pieces * 100) / $total_pieces);
    }

    public function stCityScoring(): void
    {
        $model = $this->model();
        $cityhex = $model->board()->hexAt($this->rowColBeingScored());
        // grab this, as it will change underneath when the model scores it.
        $city = $cityhex->piece->value;
        $scored_city = $model->scoreCity($cityhex->rc);
        $captured_by = $scored_city->hex_winner->captured_by;
        if ($captured_by > 0) {
            $this->stats->PLAYER_CITIES_CAPTURED->inc($captured_by);
            $msg = clienttranslate('${city} at (${row},${col}) scored, captured by ${player_name}');
        } else {
            $msg = clienttranslate('${city} at (${row},${col}) scored, uncaptured');
        }
        $capturer_name =
            $captured_by > 0 ? $this->getPlayerNameById($captured_by) : "noone";

        $player_infos = $model->allPlayerInfo();

        $details = [];
        foreach ($player_infos as $pid => $pi) {
            $points = $scored_city->pointsForPlayer($pid);
            $this->stats->PLAYER_POINTS_FROM_CITY_NETWORKS->inc($pid, $scored_city->networkPointsForPlayer($pid));
            $this->stats->PLAYER_POINTS_FROM_CAPTURED_CITIES->inc($pid, $scored_city->capturePointsForPlayer($pid));
            $details[$pid] = [
                "player_id" => $pid,
                "player_name" => $this->getPlayerNameById($pid),
                "captured_city_count" => $pi->captured_city_count,
                "scored_locations" => $scored_city->scoringLocationsForPlayer($pid),
                "network_locations" => $scored_city->networkLocationsForPlayer($pid),
                "network_points" => $scored_city->networkPointsForPlayer($pid),
                "capture_points" => $scored_city->capturePointsForPlayer($pid),
                "score" => $pi->score,
            ];
            if ($points > 0) {
                // TODO: should we notify/log each player's point change?
                // $details[$pid]["message"] =
                //     clienttranslate('${' . $pnk2 . '} scored ${points}');
                // $details[$pid][$pnk] = $this->getPlayerNameById($pid);
            }
        }

        // FIXME: need to better distinguish unset.
        $this->setRowColBeingScored(new RowCol(0, 0));

        $this->notify->all(
            "cityScored",
            $msg,
            [
                "city" => $city,
                "row" => $cityhex->rc->row,
                "col" => $cityhex->rc->col,
                "winner_hexes" => $scored_city->hex_winner->winnerRowCols(),
                "other_hexes" => $scored_city->hex_winner->othersRowCols(),
                "player_name" => $capturer_name,
                "player_id" => $captured_by,
                "details" => $details,
            ]
        );
        $this->gamestate->nextState("cityScored");
    }

    public function stZigguratScoring(): void
    {
        $model = $this->model();
        $zighex = $model->board()->hexAt($this->rowColBeingScored());

        $scored_zig = $model->scoreZiggurat($zighex->rc);
        $winner = $scored_zig->captured_by;
        if ($winner == 0) {
            $winner_name = 'noone';
            $msg = clienttranslate('${city} at (${row},${col}) scored, no winner');
        } else {
            $winner_name = $this->getPlayerNameById($winner);
            $msg = clienttranslate('${city} at (${row},${col}) scored, winner is ${player_name}');
        }
        $this->notify->all(
            "zigguratScored",
            $msg,
            [
                "row" => $zighex->rc->row,
                "col" => $zighex->rc->col,
                "winner_hexes" => $scored_zig->winnerRowCols(),
                "other_hexes" => $scored_zig->othersRowCols(),
                "player_name" => $winner_name,
                "player_id" => $winner,
                "city" => "ziggurat",
            ]
        );

        if ($winner != 0) {
            if ($winner != $this->activePlayerId()) {
                $this->gamestate->changeActivePlayer($winner);
                $this->giveExtraTime($winner);
            }
            $this->gamestate->nextState("selectZigguratCard");
        } else {
            $this->gamestate->nextState("noWinner");
        }
    }

    public function argSelectZigguratCard(): array
    {
        $model = $this->model();
        $zcards = $model->components()->availableZigguratCards();
        return [
            "hex" => $this->rowColBeingScored(),
            "available_cards" => array_map(
                function ($z): string {
                    return $z->type->value;
                },
                $model->components()->availableZigguratCards()
            ),
        ];
    }

    public function actSelectZigguratCard(string $zctype): void
    {
        $player_id = $this->activePlayerId();
        $model = $this->model();
        $selection =
            $model->selectZigguratCard(ZigguratCardType::from($zctype));
        $this->stats->PLAYER_ZIGGURAT_CARDS->inc($player_id);
        $stat = match ($selection->card->type) {
            ZigguratCardType::PLUS_10 => $this->stats->PLAYER_ZIGGURAT_CARD_1_CHOSEN,
            ZigguratCardType::EXTRA_TURN => $this->stats->PLAYER_ZIGGURAT_CARD_2_CHOSEN,
            ZigguratCardType::HAND_SIZE_7 => $this->stats->PLAYER_ZIGGURAT_CARD_3_CHOSEN,
            ZigguratCardType::NOBLES_3_KINDS => $this->stats->PLAYER_ZIGGURAT_CARD_4_CHOSEN,
            ZigguratCardType::NOBLE_WITH_3_FARMERS => $this->stats->PLAYER_ZIGGURAT_CARD_5_CHOSEN,
            ZigguratCardType::NOBLES_IN_FIELDS => $this->stats->PLAYER_ZIGGURAT_CARD_6_CHOSEN,
            ZigguratCardType::EXTRA_CITY_POINTS => $this->stats->PLAYER_ZIGGURAT_CARD_7_CHOSEN,
            ZigguratCardType::FREE_CENTER_LAND_CONNECTS => $this->stats->PLAYER_ZIGGURAT_CARD_8_CHOSEN,
            ZigguratCardType::FREE_RIVER_CONNECTS => $this->stats->PLAYER_ZIGGURAT_CARD_9_CHOSEN,
        };
        $stat->set($player_id, true);
        $this->notify->all(
            "zigguratCardSelection",
            clienttranslate('${player_name} chose ziggurat card ${zcard}'),
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "zcard" => $selection->card->type->value,
                "cardused" => $selection->card->used,
                "points" => $selection->points,
                "score" => $model->allPlayerInfo()[$player_id]->score,
                "hex" => $this->rowColBeingScored(),
            ]
        );
        // FIXME: need to better distinguish unset.
        $this->setRowColBeingScored(new RowCol(0, 0));
        $this->gamestate->nextState("cardSelected");
    }

    public function stAutoScoringHexSelection(): void
    {
        $model = $this->model();
        $rcs = $model->locationsRequiringScoring();
        if (count($rcs) == 0) {
            $this->gamestate->nextState("done");
            return;
        }
        $rc = array_shift($rcs);
        $this->actSelectHexToScore($rc->row, $rc->col);
    }

    public function argSelectHexToScore(): array
    {
        $model = $this->model();
        $rcs = $model->locationsRequiringScoring();
        return ["hexes" => $rcs];
    }

    public function actSelectHexToScore(int $row, int $col): void
    {
        $player_id = $this->activePlayerId();
        $model = $this->model();
        $rc = new RowCol($row, $col);
        $hex = $model->board()->hexAt($rc);
        $msg = $this->optionEnabled(TableOption::AUTOMATED_SCORING_SELECTION)
            ? clienttranslate('${city} at (${row},${col}) is selected to be scored')
            : clienttranslate('${player_name} chose ${city} at (${row},${col}}) to score');
        $this->notify->all(
            "scoringSelection",
            $msg,
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "row" => $rc->row,
                "col" => $rc->col,
                "city" => $hex->piece->value,
            ]
        );
        $this->setRowColBeingScored($rc);

        if ($hex->piece->isCity()) {
            $this->stats->PLAYER_CITY_SCORING_TRIGGERED->inc($player_id);
            $this->gamestate->nextState("citySelected");
        } else if ($hex->piece->isZiggurat()) {
            $this->stats->PLAYER_ZIGGURAT_SCORING_TRIGGERED->inc($player_id);
            $this->gamestate->nextState("zigguratSelected");
        }
    }

    private function model() : Model {
        return new Model($this->ps, $this->activePlayerId());
    }

    public function stEndOfTurnScoring(): void
    {
        // switch back to player on turn if necessary.
        $player_on_turn = $this->playerOnTurn();
        if ($this->activePlayerId() != $player_on_turn) {
            $this->gamestate->changeActivePlayer($player_on_turn);
            $this->giveExtraTime($player_on_turn);
        }

        $rcs = $this->model()->locationsRequiringScoring();

        if (count($rcs) == 0) {
            $this->gamestate->nextState("done");
            return;
        }
        if (count($rcs) == 1) {
            $this->gamestate->nextState("automatedHexSelection");
            // TODO: is this useful/needed?
            // $this->notify->all(
            //     "automatedScoringSingle",
            //     clienttranslate('Single hex requiring scoring selected automatically')
            // );
            return;
        }

        if ($this->optionEnabled(TableOption::AUTOMATED_SCORING_SELECTION)) {
            $this->gamestate->nextState("automatedHexSelection");
            return;
        }

        $this->notify->all(
            "scoringHexChoice",
            clienttranslate('${player_name} must select a hex to score'),
            [
                "player_name" => $this->getActivePlayerName(),
            ]
        );
        $this->gamestate->nextState("selectHex");
    }

    public function stFinishTurn(): void
    {
        $player_id = $this->activePlayerId();
        $model = $this->model();

        $result = $model->finishTurn();
        if ($result->gameOver()) {
            if ($result->less_than_two_remaining_cities) {
                $this->stats->TABLE_GAME_END_BY_CITY_CAPTURES->set(true);
            }
            if ($result->pieces_exhausted) {
                $this->stats->TABLE_GAME_END_BY_POOL_EXHAUSTION->set(true);
            }
            $this->notify->all(
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

        $this->notify->player(
            $player_id,
            "handRefilled",
            clienttranslate("You refilled your hand"),
            [
                "player_id" => $player_id,
                'hand' => array_map(
                    function ($p) {
                        return $p->value;
                    },
                    $model->hand()->pieces()
                ),
            ]
        );

        $this->notify->all(
            "turnFinished",
            clienttranslate('${player_name} finished their turn'),
            [
                "player_id" => $player_id,
                "player_name" => $this->getActivePlayerName(),
                "hand_size" => $model->hand()->size(),
                "pool_size" => $model->pool()->size(),
            ]
        );

        if ($model->components()->hasUnusedZigguratCard($player_id, ZigguratCardtype::EXTRA_TURN)
        ) {
            $this->gamestate->nextState("extraTurn");
            return;
        }

        $this->gamestate->nextState("nextPlayer");
    }

    public function stStartTurn()
    {
        $player_id = $this->activePlayerId();
        $this->stats->PLAYER_NUMBER_TURNS->inc($player_id);
        $this->giveExtraTime($player_id);
        $this->setPlayerOnTurn($player_id);
        $this->gamestate->nextState("play");
    }

    public function stNextPlayer()
    {
        $this->activeNextPlayer();
        $this->gamestate->nextState("done");
    }

    public function actUndoPlay()
    {
        $player_id = $this->activePlayerId();
        $model = $this->model();
        $move = $model->undo();

        if ($move->piece->isHidden()) {
            $this->stats->PLAYER_RIVER_SPACES_PLAYED->inc($player_id, -1);
        }
        if ($move->captured_piece->isField()) {
            $this->stats->PLAYER_FIELDS_CAPTURED->inc($player_id, -1);
        }
        if ($move->points() > 0) {
            $this->stats->PLAYER_POINTS_FROM_FIELDS->inc($player_id, -$move->field_points);
            $this->stats->PLAYER_POINTS_FROM_ZIGGURATS->inc(
                $player_id,
                -$move->ziggurat_points
            );
        }

        $args = [
            "player_name" => $this->getActivePlayerName(),
            "player_id" => $this->activePlayerId(),
            "row" => $move->rc->row,
            "col" => $move->rc->col,
            "piece" => $move->piece->value,
            "captured_piece" => $move->captured_piece->value,
            "points" => $move->points(),
            "handpos" => $move->handpos,
            "original_piece" => $move->original_piece->value,
        ];

        $this->notify->player($this->activePlayerId(), "undoMoveActive", clienttranslate('${player_name} undid their move'), $args);
        unset($args["handpos"]);
        unset($args["original_piece"]);

        $this->notify->all("undoMove", clienttranslate('${player_name} undid their move'), $args);

        $this->gamestate->nextState("playPieces");
    }

    public function actChooseExtraTurn(bool $take_extra_turn)
    {
        if ($take_extra_turn) {
            $player_id = $this->activePlayerId();
            $model = $this->model();
            $model->useExtraTurnCard();
            $this->notify->all(
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

    private function currentPlayerId(): int
    {
        return intval($this->getCurrentPlayerId());
    }

    private function activePlayerId(): int
    {
        return intval($this->getActivePlayerId());
    }

    private function rowColBeingScored(): ?RowCol
    {
        $v = $this->getGameStateValue(Game::GLOBAL_ROW_COL_BEING_SCORED);
        if ($v == 0) {
            return null;
        }
        return RowCol::fromKey(intval($v));
    }

    private function setRowColBeingScored(RowCol $rc)
    {
        $this->setGameStateValue(Game::GLOBAL_ROW_COL_BEING_SCORED, $rc->asKey());
    }

    private function playerOnTurn(): int
    {
        return intval($this->getGameStateValue(Game::GLOBAL_PLAYER_ON_TURN));
    }

    private function setPlayerOnTurn(int $player_id)
    {
        $this->setGameStateValue(Game::GLOBAL_PLAYER_ON_TURN, $player_id);
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
    protected function getAllDatas(): array
    {
        // WARNING: We must only return information visible by the
        // current player.

        $model = new Model($this->ps, $this->currentPlayerId());

        $player_data = [];
        foreach ($model->allPlayerInfo() as $pid => $pi) {
            $player_data[$pid] = [
                "player_id" => $pid,
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
            'player_data' => $player_data,
            'hand' => array_map(
                function ($p) {
                    return $p->value;
                },
                $model->hand()->pieces()
            ),
            'board' => $board_data,
            'current_scoring_hex' => $this->rowColBeingScored(),
            'ziggurat_cards' =>
            array_map(
                function ($z) {
                    return [
                        "type" => $z->type->value,
                        "owning_player_id" => $z->owning_player_id,
                        "used" => $z->used,
                        "tooltip" => $z->type->tooltip(),
                    ];
                },
                $model->components()->allZigguratCards()
            ),
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
     * @param $arr string[]
     */
    private function shuffle(&$arr): void
    {
        $e = sizeof($arr) - 1;
        for ($i = 0; $i < $e; ++$i) {
            $j = random_int($i, $e);
            if ($j <> $i) {
                $tmp = $arr[$j];
                $arr[$j] = $arr[$i];
                $arr[$i] = $tmp;
            }
        }
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
        $this->shuffle($default_colors);
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

        // TODO: turn this into a game option?
        // $this->reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);
        // $this->reloadPlayersBasicInfos();

        // Init game statistics.
        $this->stats->initAll(array_keys($players));

        // Create the game.
        $model = new Model($this->ps, 0);
        $model->createNewGame(
            array_keys($players),
            $this->optionEnabled(TableOption::ADVANCED_ZIGGURAT_CARDS)
        );

        // Activate first player once everything has been initialized and ready.
        $this->activeNextPlayer();
    }

    private function optionEnabled(TableOption $option): bool
    {
        return $this->tableOptions->get($option->value) > 0;
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
                case 'selectHexToScore': {
                        // If a player goes zombie when they are on turn
                        // and have surrounded one or more ziggurats / cities.
                        // the game cannot progress properly. So choose one
                        // randomly.
                        $model = $this->model();
                        $rcs = $model->locationsRequiringScoring();
                        if (count($rcs) > 0) {
                            $rc = array_shift($rcs);
                            $this->actSelectHexToScore($rc->row, $rc->col);
                        }
                        break;
                    }
                // TODO: player may need to select ziggurat card
                default: {
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
