<?php

/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <vagabond@covariant.org>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * states.inc.php
 *
 * babylonia game states description
 *
 */

/*
   Game state machine is a tool used to facilitate game developpement by doing common stuff that can be set up
   in a very easy way from this configuration file.

   Please check the BGA Studio presentation about game state to understand this, and associated documentation.

   Summary:

   States types:
   _ activeplayer: in this type of state, we expect some action from the active player.
   _ multipleactiveplayer: in this type of state, we expect some action from multiple players (the active players)
   _ game: this is an intermediary state where we don't expect any actions from players. Your game logic must decide what is the next game state.
   _ manager: special type for initial and final state

   Arguments of game states:
   _ name: the name of the GameState, in order you can recognize it on your own code.
   _ description: the description of the current game state is always displayed in the action status bar on
                  the top of the game. Most of the time this is useless for game state with 'game' type.
   _ descriptionmyturn: the description of the current game state when it's your turn.
   _ type: defines the type of game states (activeplayer / multipleactiveplayer / game / manager)
   _ action: name of the method to call when this game state become the current game state. Usually, the
             action method is prefixed by 'st' (ex: 'stMyGameStateName').
   _ possibleactions: array that specify possible player actions on this step. It allows you to use 'checkAction'
                      method on both client side (Javacript: this.checkAction) and server side (PHP: $this->checkAction).
   _ transitions: the transitions are the possible paths to go from a game state to another. You must name
                  transitions in order to use transition names in 'nextState' PHP method, and use IDs to
                  specify the next game state for each transition.
   _ args: name of the method to call to retrieve arguments for this gamestate. Arguments are sent to the
           client side to be used on 'onEnteringState' or to set arguments in the gamestate description.
   _ updateGameProgression: when specified, the game progression is updated (=> call to your getGameProgression
                            method).
*/

//    !! It is not a good idea to modify this file when a game is running !!

if (!defined('STATE_START_TURN')) { // guard since this included multiple times
    define('STATE_START_TURN', 2);
    define('STATE_PLAYER_PLAY_PIECES', 12);
    define('STATE_END_OF_TURN_SCORING', 22);
    define('STATE_PLAYER_SELECT_SCORING_HEX', 32);
    define('STATE_PLAYER_SELECT_ZIGGURAT_CARD', 42);
    define('STATE_FINISH_TURN', 52);
    define('STATE_ZIGGURAT_SCORING', 62);
    define('STATE_CITY_SCORING', 72);
    define('STATE_PLAYER_EXTRA_TURN', 82);
    define('STATE_NEXT_PLAYER', 92);
    define('STATE_AUTO_SCORING_HEX_SELECTION', 102);
}

use Bga\GameFramework\GameStateBuilder;
use Bga\GameFramework\StateType;

$machinestates = [

    STATE_START_TURN => GameStateBuilder::create()
        ->name('startTurn')
        ->type(StateType::GAME)
        ->description('')
        ->action('stStartTurn')
        ->transitions([
            'play' => STATE_PLAYER_PLAY_PIECES,
        ])
        ->build(),

    STATE_PLAYER_PLAY_PIECES => GameStateBuilder::create()
        ->name('playPieces')
        ->description(clienttranslate('${actplayer} is playing pieces'))
        ->descriptionmyturn(clienttranslate('${you} may play a piece or end the turn'))
        ->type(StateType::ACTIVE_PLAYER)
        ->args('argPlayPieces')
        ->possibleactions([
            'actPlayPiece',
            'actDonePlayPieces',
            'actUndoPlay',
        ])
        ->transitions([
            'playPieces' => STATE_PLAYER_PLAY_PIECES,
            'done' => STATE_END_OF_TURN_SCORING,
            'zombiePass' => STATE_END_OF_TURN_SCORING,
        ])
        ->build(),

    STATE_END_OF_TURN_SCORING => GameStateBuilder::create()
        ->name('endOfTurnScoring')
        ->type(StateType::GAME)
        ->description('')
        ->action('stEndOfTurnScoring')
        ->args('argSelectHexToScore')
        ->updateGameProgression(true)
        ->transitions([
            'selectHex' => STATE_PLAYER_SELECT_SCORING_HEX,
            'automatedHexSelection' => STATE_AUTO_SCORING_HEX_SELECTION,
            'done' => STATE_FINISH_TURN,
        ])
        ->build(),

    STATE_AUTO_SCORING_HEX_SELECTION => GameStateBuilder::create()
        ->name('autoScoringHexSelection')
        ->type(StateType::GAME)
        ->description('')
        ->action('stAutoScoringHexSelection')
        ->transitions([
            'citySelected' => STATE_CITY_SCORING,
            'zigguratSelected' => STATE_ZIGGURAT_SCORING,
        ])
        ->build(),

    STATE_PLAYER_SELECT_SCORING_HEX => GameStateBuilder::create()
        ->name('selectHexToScore')
        ->description(clienttranslate('${actplayer} must select a hex to score'))
        ->descriptionmyturn(clienttranslate('${you} must select a hex to score'))
        ->type(StateType::ACTIVE_PLAYER)
        ->args('argSelectHexToScore')
        ->possibleactions([
            'actSelectHexToScore',
        ])
        ->updateGameProgression(true)
        ->transitions([
            'citySelected' => STATE_CITY_SCORING,
            'zigguratSelected' => STATE_ZIGGURAT_SCORING,
            // no 'zombiePass' since we need to act on the zombie
            //  player's behalf to properly progress the game.
        ])
        ->build(),

    STATE_CITY_SCORING => GameStateBuilder::create()
        ->name('cityScoring')
        ->type(StateType::GAME)
        ->description('')
        ->action('stCityScoring')
        // ->args('argCityScoring')
        ->updateGameProgression(true)
        ->transitions([
            'cityScored' => STATE_END_OF_TURN_SCORING,
        ])
        ->build(),

    STATE_ZIGGURAT_SCORING => GameStateBuilder::create()
        ->name('zigguratScoring')
        ->type(StateType::GAME)
        ->description('')
        ->action('stZigguratScoring')
        ->args('argZigguratScoring')
        ->updateGameProgression(true)
        ->transitions([
            'selectZigguratCard' => STATE_PLAYER_SELECT_ZIGGURAT_CARD,
            'noWinner' => STATE_END_OF_TURN_SCORING,
        ])
        ->build(),

    STATE_PLAYER_SELECT_ZIGGURAT_CARD => GameStateBuilder::create()
        ->name('selectZigguratCard')
        ->description(clienttranslate('${actplayer} must select a ziggurat card'))
        ->descriptionmyturn(clienttranslate('${you} must select a ziggurat card'))
        ->type(StateType::ACTIVE_PLAYER)
        ->args('argSelectZigguratCard')
        ->possibleactions([
            'actSelectZigguratCard',
        ])
        ->updateGameProgression(true)
        ->transitions([
            'cardSelected' => STATE_END_OF_TURN_SCORING,
            'zombiePass' => STATE_END_OF_TURN_SCORING,
        ])
        ->build(),

    // replenishes, switches player or ends game
    STATE_FINISH_TURN => GameStateBuilder::create()
        ->name('finishTurn')
        ->description('')
        ->type(StateType::GAME)
        ->action('stFinishTurn')
        ->updateGameProgression(true)
        ->transitions([
            'endGame' => 99,
            'nextPlayer' => STATE_NEXT_PLAYER,
            'extraTurn' => STATE_PLAYER_EXTRA_TURN,
        ])
        ->build(),

    STATE_NEXT_PLAYER => GameStateBuilder::create()
        ->name('nextPlayer')
        ->description('')
        ->type(StateType::GAME)
        ->action('stNextPlayer')
        ->updateGameProgression(true)
        ->transitions([
            'done' => STATE_START_TURN,
        ])
        ->build(),

    STATE_PLAYER_EXTRA_TURN => GameStateBuilder::create()
        ->name('chooseExtraTurn')
        ->description(clienttranslate('${actplayer} may choose to take another turn'))
        ->descriptionmyturn(clienttranslate('${you} must choose whether to take another turn'))
        ->type(StateType::ACTIVE_PLAYER)
        ->possibleactions([
            'actChooseExtraTurn',
        ])
        ->updateGameProgression(true)
        ->transitions([
            'extraTurn' => STATE_START_TURN,
            'nextPlayer' => STATE_NEXT_PLAYER,
            'zombiePass' => STATE_NEXT_PLAYER,
        ])
        ->build(),
];
