
define([
  "dojo",
  "dojo/_base/declare",
  "ebg/core/gamegui",
  "ebg/counter"
], function (dojo: any, declare: any) {
  declare("bgagame.babylonia", ebg.core.gamegui, new GameBody());
});
