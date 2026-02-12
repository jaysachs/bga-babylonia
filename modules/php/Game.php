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

use Bga\GameFramework\Table;
use Bga\Games\babylonia\States\StartTurn;
use Bga\Games\babylonia\Utils\Arrays;
use Bga\Games\babylonia\Utils\DefaultDb;
use Bga\Games\babylonia\Utils\Log;
use Bga\Games\babylonia\Utils\Logger;

require_once(APP_GAMEMODULE_PATH . "module/table/table.game.php");

class GameLogger implements Logger {
	function __construct(private Table $table) { }

	public function debug(string $msg): void {
		$this->table->debug($msg);
	}

	public function dump(string $prefix, mixed $obj): void {
		$this->table->dump($prefix, $obj);
	}

	public function error(string $msg): void {
		$this->table->error($msg);
	}

	public function trace(string $msg): void {
		$this->table->trace($msg);
	}

	public function warn(string $msg): void {
		$this->table->warn($msg);
	}
}

class Game extends Table
{

	public Stats $stats;
    private PersistentStore $ps;

    public function __construct()
	{
		parent::__construct();

		Log::setImpl(new GameLogger($this));
		$logDecorator = new LogDecorator(\Closure::fromCallable($this->getPlayerNameById(...)));
		$this->notify->addDecorator($logDecorator->playerNames(...));
 		$this->stats = Stats::createForGame($this);
        $this->ps = new PersistentStore(new DefaultDb(), $this->globals);

		$this->initGameStateLabels([]);
	}

    /**
     * Compute and return the current game progression.
     *
     * This is based on total number of pieces played. Probably
     * can improve based on taking the max of that and cities scored.
     */
    public function getGameProgression(): int {
        $model = new Model($this->ps, $this->stats, 0);
        $player_infos = $model->allPlayerInfo();
        $total_pieces = 30 * count($player_infos);
        $remaining_pieces = 0;
        foreach ($player_infos as $pid => $pi) {
            $remaining_pieces += $pi->hand_size + $pi->pool_size;
        }
        return intval(100.0 - ($remaining_pieces * 100.0) / floatval($total_pieces));
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
    /**
     * @return array<string,mixed>
     */
    protected function getAllDatas(): array
    {
        // WARNING: We must only return information visible by the
        // current player.

        $model = new Model($this->ps, $this->stats, intval($this->getCurrentPlayerId()));

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
        /** @var list<array{row:int,col:int,hextype:string,piece:string,board_player:int}> */
        $board_data = [];
        $model->board()->visitAll(
            function (Hex &$hex) use (&$board_data) {
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
            'current_scoring_hex' => $this->ps->rowColBeingScored(),
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
     * This method is called only once, when a new game is
     *  launched. In this method, you must setup the game according to
     *  the game rules, so that the game is ready to be played.
     * @param array<string,int> $options
     */
    protected function setupNewGame($players, $options = []): mixed
    {
        // Set the colors of the players with HTML color code.The
        // number of colors defined here must correspond to the
        // maximum number of players allowed for the gams.
        $gameinfos = $this->getGameinfos();
        $default_colors = array_values($gameinfos['player_colors']);
        Arrays::shuffle($default_colors);
        $query_values = [];
        foreach ($players as $player_id => $player) {
            // Now you can access both $player_id and $player array
            $query_values[] = vsprintf("('%s', '%s', '%s')", [
                $player_id,
                array_shift($default_colors),
                addslashes($player["player_name"]),
            ]);
        }

        // Create players based on generic information.
        static::DbQuery(
            sprintf(
                "INSERT INTO player (player_id, player_color, player_name) VALUES %s",
                implode(",", $query_values)
            )
        );

        // TODO: turn this into a game option?
        // $this->reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);
        // $this->reloadPlayersBasicInfos();

        // Init game statistics.
        $this->stats->initAll();

        // Create the game.
        Model::createNewGame(
            $this->ps,
            array_keys($players),
            $this->optionEnabled(TableOption::ADVANCED_ZIGGURAT_CARDS)
        );

        // Activate first player once everything has been initialized and ready.
        $this->activeNextPlayer();

        return StartTurn::class;
    }

    function optionEnabled(TableOption $option): bool
    {
        return $this->tableOptions->get($option->value) > 0;
    }

    public function debug_zc(string $zctype, int $points, bool $used, int $row, int $col): void {
        $active_player_id = intval($this->getActivePlayerId());
        $this->notify->all(
            "zigguratCardSelection",
            clienttranslate('${player_name} chose ziggurat card ${zcard}'),
            [
                "player_id" => $active_player_id,
                "player_name" => $this->getPlayerNameById($active_player_id),
                "zcard" => $zctype,
                "cardused" => $used,
                "points" => $points,
                "hex" => new RowCol($row, $col),
            ]
        );
    }
}
