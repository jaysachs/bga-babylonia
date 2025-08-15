
define([
  'dojo',
  'dojo/_base/declare',
  'ebg/core/gamegui',
  'ebg/counter',
  getLibUrl('bga-animations', '1.x'),
], function (dojo, declare, gamegui, counter, BgaAnimations) {
  (window as any).BgaAnimations = BgaAnimations;
  declare('bgagame.babylonia', ebg.core.gamegui, new GameBody());
});
