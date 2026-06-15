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

namespace Bga\Games\babylonia\Model;

use Bga\GameFramework\Components\Counters\PlayerCounter;
use Bga\GameFramework\Db\Globals;
use Bga\Games\babylonia\OpType;
use Bga\Games\babylonia\StatOp;
use Bga\Games\babylonia\Utils\Db;

class PersistentStore
{
    // Used during scoring ziggurats in case the scoring of a ziggurat
    //  means another player needs to choose a card; this global holds
    //  the ID of the "primary" player, i.e. who should become active
    //  once the ziggurat card is selected.
    /** @var string */
    private const GLOBAL_PLAYER_ON_TURN = 'player_on_turn';
    /** @var string */
    private const GLOBAL_ROW_COL_BEING_SCORED = 'row_col_being_scored';

    public function __construct(private Db $db, private Globals $globals, private PlayerCounter $playerScore, private PlayerCounter $playerScoreAux) {}

    public function initializeGlobals(\Closure $initFn): void {
        $initFn([self::GLOBAL_PLAYER_ON_TURN => 10,
                 self::GLOBAL_ROW_COL_BEING_SCORED => 11]);
    }

    private static function boolValue(bool $b): string
    {
        return $b ? 'TRUE' : 'FALSE';
    }

    public function rowColBeingScored(): ?int
    {
        /** @var int|null */
        $v = $this->globals->get(PersistentStore::GLOBAL_ROW_COL_BEING_SCORED, 0);
        if ($v == 0) {
            return null;
        }
        return intval($v);
    }

    public function setRowColBeingScored(?int $rc): void
    {
        $this->globals->set(PersistentStore::GLOBAL_ROW_COL_BEING_SCORED, $rc === null ? 0 : $rc);
    }

    public function playerOnTurn(): int
    {
        /** @var int|null */
        $v = $this->globals->get(PersistentStore::GLOBAL_PLAYER_ON_TURN);
        return intval($v);
    }

    public function setPlayerOnTurn(int $player_id): void
    {
        $this->globals->set(PersistentStore::GLOBAL_PLAYER_ON_TURN, $player_id);
    }

    /** @param array<int,PlayerInfo> $pinfos */
    public function insertAll(Board $board, Components $components, array $pinfos): void {
        $sql_values = [];
        $board->visitAll(function (Hex $hex) use (&$sql_values) {
            $piece = $hex->piece->value;
            $player_id = $hex->player_id;
            $sc = self::boolValue($hex->scored);
            $t = $hex->terrain->value;
            $rc = $hex->rc;
            $sql_values[] = "('BOARD', $rc, '$piece', $player_id, $sc, '$t')";
        });

        foreach ($components->allZigguratCards() as $id => $zc) {
            $t = $zc->type->value;
            $pid = $zc->owning_player_id;
            $used = self::boolValue($zc->used);
            $sql_values[] = "('ZCARD', $id, '$t', $pid, $used, NULL)";
        }

        foreach ($pinfos as $pinfo) {
            foreach ($pinfo->pool->pieces() as $i => $p) {
                $x = $p->value;
                $sql_values[] = "('POOL', $i, '$x', $pinfo->player_id, NULL, NULL)";
            }
            foreach ($pinfo->hand->pieces() as $i => $p) {
                $x = $p->value;
                $sql_values[] = "('HAND', $i, '$x', $pinfo->player_id, NULL, NULL)";
            }
        }
        if (count($sql_values) == 0) {
            return;
        }
        $values = implode(',', $sql_values);
        $sql = "INSERT INTO pieces (location, location_id, type, player_id, used, terrain)
                VALUES $values";
        $this->db->execute($sql);
    }

    /** @return array{player_infos:array<int,PlayerInfo>,board:Board,components:Components,hand:Hand,pool:Pool,turnProgress:TurnProgress} */
    public function retrieveAllData(int $player_id): array {
        $rows = $this->db->getObjectList("SELECT location, location_id, type, player_id, used, terrain FROM pieces ORDER BY location, location_id, player_id");

        /** @var Hex[] */
        $hexes = [];
        /** @var list<ZigguratCard> */
        $cards = [];

        /** @var array<int, array<int,PieceType>> */
        $hands = [];
        /** @var array<int, array<int,PieceType>> */
        $pools = [];

        $captured = [];

        $player_ids = [];

        foreach ($rows as $row) {
            $pid = intval($row["player_id"]);
            if ($pid > 0 && !isset($player_ids[$pid])) {
                $player_ids[$pid] = 1;
                $hands[$pid] = [];
                $pools[$pid] = [];
                $captured[$pid] = 0;
            }
            $locid = intval($row["location_id"]);
            switch ($row["location"]) {
                case "DISCARD":
                    $pt = PieceType::from($row["type"]);
                    if ($pt->isCity() && $pid > 0) {
                        $captured[$pid]++;
                    }
                    // use this to compute captured city count
                    break;
                case "HAND":
                    $hands[$pid][$locid] = PieceType::from($row['type']);
                    break;
                case "POOL":
                    $pools[$pid][$locid] = PieceType::from($row['type']);
                    break;
                case "ZCARD":
                    $cards[] = new ZigguratCard(
                        ZigguratCardType::from($row["type"]),
                        $pid,
                        boolval($row["used"])
                    );
                    break;
                case "BOARD":
                    $hexes[] = new Hex(
                        Terrain::from($row['terrain']),
                        $locid,
                        PieceType::from($row['type']),
                        $pid,
                        boolval($row['used'])
                    );
                    break;
            }
        }

        $pinfos = [];
        foreach ($player_ids as $pid => $_) {
            $pinfos[$pid] = new PlayerInfo($pid, $captured[$pid], new Hand($hands[$pid]), new Pool($pools[$pid]));
        }
        return [
            'player_infos' => $pinfos,
            'board' => Board::fromHexes($hexes),
            'components' => new Components($cards),
            'hand' => $player_id > 0 ? $pinfos[$player_id]->hand : new Hand([]),
            'pool' => $player_id > 0 ? $pinfos[$player_id]->pool : new Pool([]),
            'turnProgress' => $this->retrieveTurnProgress($player_id),
        ];
    }

    public function updateUndoneMove(Move $move): void {
        $cpt = $move->captured_piece->value;
        if ($move->captured_piece <> PieceType::EMPTY) {
            // assert is farm; need to put it into 'DISCARD' location
            $this->db->execute("DELETE FROM pieces WHERE location = 'DISCARD' AND location_id = $move->rc");
        }

        $pt = $move->piece->value;
        $this->db->execute("UPDATE pieces SET type='$cpt',player_id=0 WHERE location='BOARD' AND location_id=$move->rc");
        $this->db->execute("UPDATE pieces SET type='$pt' WHERE location='HAND' AND location_id=$move->handpos AND player_id=$move->player_id");
        $this->incPlayerScore($move->player_id, -$move->points());
    }

    public function updatePlayedPiece(ElaboratedMove $move): void {
        if ($move->captured_piece <> PieceType::EMPTY) {
            $pt = $move->captured_piece->value;
            // assert is farm; need to put it into 'DISCARD' location
            $this->db->execute("INSERT INTO pieces (location, location_id, type, player_id, used)
                VALUES ('DISCARD', $move->rc, '$pt', $move->player_id, TRUE)");
        }
        $pt = $move->piece->value;
        $this->db->execute("UPDATE pieces SET type='$pt',player_id=$move->player_id WHERE location='BOARD' AND location_id=$move->rc");
        $this->db->execute("UPDATE pieces SET type='empty' WHERE location='HAND' AND location_id=$move->handpos AND player_id=$move->player_id");
        $this->incPlayerScore($move->player_id, $move->points());
    }

    public function incPlayerScore(int $player_id, int $amt): void {
        $this->playerScore->inc($player_id, $amt);
    }

    public function updateScoredZiggurat(int $rc): void {
        $this->db->execute("UPDATE pieces SET used=TRUE WHERE location='BOARD' and location_id=$rc");
    }

    /** @return list<StatOp> */
    public function deleteAllMoves(int $player_id): array
    {
        $rows = $this->db->getObjectList("SELECT op, stat_name, player_id, val FROM turn_progress_stats ORDER BY seq_id");
        $statOps = [];
        foreach ($rows as $row) {
            $pid = intval($row["player_id"]);
            if ($pid == 0) { $pid = null; }
            $statOps[] = new StatOp(OpType::from($row["op"]), $row["stat_name"], $pid, $row["val"]);
        }
        $sql = "DELETE FROM turn_progress
                WHERE player_id=$player_id";
        $this->db->execute($sql);
        return $statOps;
    }

    public function deleteSingleMove(Move $move): void
    {
        $sql = "DELETE FROM turn_progress
                WHERE player_id = $move->player_id
                AND seq_id = $move->seq_id";
        $this->db->execute($sql);
    }

    /** @param array<int, StatOp> $statOps */
    public function insertMove(Move $move, array $statOps): void
    {
        $captured_piece = $move->captured_piece->value;
        $piece = $move->piece->value;
        $opiece = $move->original_piece->value;
        $rc = $move->rc;
        $sql = "INSERT INTO turn_progress(player_id, seq_id,
                                          original_piece, piece, handpos,
                                          board_loc,
                                          captured_piece, field_points,
                                          ziggurat_points)
                VALUES($move->player_id, NULL, '$opiece', '$piece',
                       $move->handpos, $rc,
                       '$captured_piece', $move->field_points,
                       $move->ziggurat_points)";
        $this->db->execute($sql);

        if (count($statOps) > 0) {
            $seq_id = $this->db->getSingleFieldList("SELECT MAX(seq_id) FROM turn_progress")[0];

            $rows = [];
            foreach ($statOps as $op) {
                $val = "{$op->value}";
                $optype = $op->op_type->value;
                $pid = $op->player_id;
                $rows[] = "($seq_id, NULL, $pid, '$optype', '$op->name', '$val')";
            }
            $sql = "INSERT INTO turn_progress_stats(turn_progress_seq_id, seq_id, player_id, op, stat_name, val) VALUES "
                . implode(',', $rows);
            $this->db->execute($sql);
        }
    }

    private function retrieveTurnProgress(int $player_id): TurnProgress
    {
        $sql = "SELECT seq_id, player_id, handpos, piece, original_piece,
                       board_loc, captured_piece, field_points,
                       ziggurat_points
                FROM turn_progress
                WHERE player_id = $player_id
                ORDER BY seq_id";
        $data = $this->db->getObjectList($sql);
        $moves = [];
        foreach ($data as &$md) {
            $moves[] = new Move(
                intval($md['player_id']),
                PieceType::from($md['piece']),
                PieceType::from($md['original_piece']),
                intval($md['handpos']),
                intval($md['board_loc']),
                PieceType::from($md['captured_piece']),
                intval($md['field_points']),
                intval($md['ziggurat_points']),
                intval($md['seq_id'])
            );
        }
        return new TurnProgress($moves);
    }

    /** @param array<int,int> $aux_scores */
    public function updateAuxScores(array $aux_scores): void
    {
        foreach ($aux_scores as $pid => $aux_score) {
            $this->playerScoreAux->set($pid, $aux_score);
        }
    }

    public function updateScoredCity(ScoredCity $sc): void {
        $hw = $sc->hex_winner;
        $winner_pid = $hw->captured_by;
        $rc = $hw->hex->rc;
        $p = $hw->hex->piece->value;
        $this->db->execute("INSERT INTO pieces (location, location_id, type, player_id, used) VALUES ('DISCARD', $rc, '$p', $winner_pid, TRUE)");
        $this->db->execute("UPDATE pieces SET player_id=0,type='empty' WHERE location='BOARD' AND location_id=$rc");
    }

    public function updateZigguratCard(ZigguratCard $card): void
    {
        $pid = $card->owning_player_id;
        $used = self::boolValue($card->used);
        $type = $card->type->value;
        $this->db->execute("UPDATE pieces SET location='TAKEN',player_id=$pid, used=$used WHERE type='$type'");
    }

    /** @param array<int,int> $refilled */
    public function updateRefill(int $player_id, array $refilled): void {
        foreach ($refilled as $loc_id => $hand_pos) {
            $this->db->execute("DELETE FROM pieces WHERE player_id=$player_id AND location='HAND' and location_id = $hand_pos");
            $this->db->execute("UPDATE pieces SET location='HAND',location_id=$hand_pos WHERE player_id=$player_id AND location='POOL' and location_id = $loc_id");
        }
    }

    /** @param array<int> $added */
    public function updateExtendedHand(int $player_id, array $added): void {
        $values = [];
        foreach ($added as $pos) {
            $value[] = "('HAND', $pos, 'empty', $player_id)";
        }
        $this->db->execute("INSERT INTO pieces (location, location_id, type, player_id
                            VALUES " . implode(',', $values));
    }
}
