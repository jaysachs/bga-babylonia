"use strict";
define([
    "dojo","dojo/_base/declare",
    'dojo/dom',
    'dojo/domReady!'
], function (dom) {

    const calcrm = function (s) {
        if (s.startsWith('calc(')) {
            s = s.substring(5);
        }
        if (s.endsWith('px)')) {
            s = s.substring(0, s.length-3);
        }
        return s;
    };

    const computeHexDimensions = function() {
        // Extract the hex dimension from CSS:
        const boardDiv = document.getElementById('bbl_board');
        const style = getComputedStyle(boardDiv);
        const hexheight = style.getPropertyValue('--hex-height');
        const hexwidth = style.getPropertyValue('--hex-width');
        // console.log(hexwidth, hexheight);

        // Now set it on a div so we can resolve the computed values
        const s = document.getElementById('bbl_vars').style;
        s.setProperty('width', hexwidth);
        s.setProperty('height', hexheight);
        // console.log(s);
        return {
            width: calcrm(s.getPropertyValue('width')),
            height: calcrm(s.getPropertyValue('height'))
        };
    };

    const hexDim = computeHexDimensions();
    // console.log(hexDim);

    // Now compute the per-hex deltas in both directions
    const hdelta = 0.75 * hexDim.width + 2.0;
    const vdelta = 1.0 * hexDim.height + 2.0;
    // console.log(hdelta, vdelta);

    const hstart = 38.0; // this is related to board width but not sure how
    const vstart = 9.0; // depends on board size too

    return {
        hexLocation: function(hex) {
            return {
                top: vstart + hex.row * vdelta / 2,
                left: hstart + hex.col * hdelta,
            };
        }
    };
})
