
define([
  "dojo",
  "dojo/_base/declare",
  "dojo/on",
  "ebg/core/gamegui",
  "ebg/counter"
], function (dojo, declare, on) {
  declare("bgagame.babylonia", ebg.core.gamegui, new GameBody());
});
