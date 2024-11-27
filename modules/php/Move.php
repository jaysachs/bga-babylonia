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

/* A played move */
class Move {
    function __construct(public int $player_id,
                         public Piece $piece,
                         public Piece $original_piece,
                         public int $handpos,
                         public RowCol $rc,
                         public Piece $captured_piece,
                         public int $field_points,
                         public int $ziggurat_points,
                         public int $seq_id = 0) {}

    public function points(): int {
        return $this->field_points + $this->ziggurat_points;
    }

    public function __toString(): string {
        return sprintf("id:%d/%d piece:%s opiece:%s pos:%d %s cap:%s field points:%d zig points:%d",
                       $this->player_id, $this->seq_id,
                       $this->piece->value, $this->original_piece->value,
                       $this->handpos,
                       $this->rc,
                       $this->captured_piece->value,
                       $this->field_points,
                       $this->ziggurat_points);
    }


}

?>
