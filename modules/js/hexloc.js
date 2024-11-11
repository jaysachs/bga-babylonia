define([
    "dojo","dojo/_base/declare",
    'dojo/dom',
    'dojo/domReady!'
], function (dom) {

    let calcrm = function(s) {
        if (s.startsWith('calc(')) {
            s = s.substring(5);
        }
        if (s.endsWith('px)')) {
            s = s.substring(0, s.length-3);
        }
        return s;
    };

    // Extract the hex dimension from CSS:
    let boardDiv = document.getElementById('bbl_board');
    var style = getComputedStyle(boardDiv);
    let hexheight = style.getPropertyValue('--hex-height');
    let hexwidth = style.getPropertyValue('--hex-width');
    console.log(hexwidth, hexheight);
    let s = document.getElementById('bbl_vars').style;
    s.setProperty('width', hexwidth);
    s.setProperty('height', hexheight);
    // console.log(s);
    let hw = calcrm(s.getPropertyValue('width'));
    let hh = calcrm(s.getPropertyValue('height'));

    console.log(hw, hh);
    // Now compute the per-hex offsets in both directions
    let hoffset = 0.75 * hw;
    let voffset = 1.0 * hh + 1.0;
    console.log(hoffset, voffset);

    var hstart = 38.0; // this is related to board width but not sure how
    var vstart = 9.0; // depends on board size too
    // hstart = 15.0;
    // vstart = 5.0;

    return {
        hexLocation: function(hex) {
            return {
                top: vstart + hex.row * (voffset+1) / 2,
                left: hstart + (hex.col * (hoffset+2)),
            };
        }
    };
})
