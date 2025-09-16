<?php

namespace Bga\Games\babylonia\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\Games\babylonia\DefaultDb;
use Bga\Games\babylonia\Game;
use Bga\Games\babylonia\Model;
use Bga\Games\babylonia\PersistentStore;
use Bga\Games\babylonia\RowCol;
use Bga\Games\babylonia\Stats;
use Bga\Games\babylonia\TableOption;

abstract class AbstractState extends GameState
{
    protected PersistentStore $ps;
    protected Stats $stats;
    private Game $game;

    function __construct(
        Game $game,
        int $id,
        StateType $type,
        ?string $description = '',
        ?string $descriptionMyTurn = '',
        bool $updateGameProgression = false
    ) {
        parent::__construct(
            game: $game,
            id: $id,
            type: $type,
            name: null,
            description: $description,
            descriptionMyTurn: $descriptionMyTurn,
            updateGameProgression: $updateGameProgression);

            /*
            // optional
            description: clienttranslate('${actplayer} must play a card or pass'),
            descriptionMyTurn: clienttranslate('${you} must play a card or pass'),
            transitions: [],
            updateGameProgression: false,
            initialPrivate: null,
            */
        $this->game = $game;

        $this->ps = new PersistentStore(new DefaultDb());
        $this->stats = Stats::createForGame($game);
    }

    // TODO: move global storage into PersistentStore
    //   and then these kinds of methods move onto the Model.
    protected function rowColBeingScored(): ?RowCol
    {
        $v = $this->globals->get(Game::GLOBAL_ROW_COL_BEING_SCORED);
        if ($v == 0) {
            return null;
        }
        return RowCol::fromKey(intval($v));
    }

    protected function setRowColBeingScored(RowCol $rc)
    {
        $this->globals->set(Game::GLOBAL_ROW_COL_BEING_SCORED, $rc->asKey());
    }

    protected function createModel(?int $player_id = null): Model {
        return new Model($this->ps, $this->stats, $player_id ?? $this->activePlayerId());
    }

    protected function playerOnTurn(): int
    {
        return intval($this->globals->get(Game::GLOBAL_PLAYER_ON_TURN));
    }

    protected function setPlayerOnTurn(int $player_id)
    {
        $this->globals->set(Game::GLOBAL_PLAYER_ON_TURN, $player_id);
    }

        private function currentPlayerId(): int
    {
        return intval($this->game->getCurrentPlayerId());
    }

    protected function activePlayerId(): int
    {
        return intval($this->game->getActivePlayerId());
    }

    protected function getActivePlayerName(): string {
        return $this->game->getActivePlayerName();
    }

    protected function giveExtraTime(int $player_id, ?int $specificTime = null): void {
        $this->game->giveExtraTime($player_id, $specificTime);
    }

    protected function activeNextPlayer(): void {
        $this->game->activeNextPlayer();
    }

    protected function optionEnabled(TableOption $option): bool
    {
        return $this->tableOptions->get($option->value) > 0;
    }

    protected function getPlayerNameById(int $player_id): string {
        return $this->game->getPlayerNameById($player_id);
    }

    protected function shuffle(array &$a): void {
        $this->game->shuffle($a);
    }
}
