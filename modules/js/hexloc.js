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

    let computeHexDimensions = function() {
        // Extract the hex dimension from CSS:
        let boardDiv = document.getElementById('bbl_board');
        var style = getComputedStyle(boardDiv);
        let hexheight = style.getPropertyValue('--hex-height');
        let hexwidth = style.getPropertyValue('--hex-width');
        // console.log(hexwidth, hexheight);

        // Now set it on a div so we can resolve the computed values
        let s = document.getElementById('bbl_vars').style;
        s.setProperty('width', hexwidth);
        s.setProperty('height', hexheight);
        // console.log(s);
        return {
            width: calcrm(s.getPropertyValue('width')),
            height: calcrm(s.getPropertyValue('height'))
        };
    };

    hexDim = computeHexDimensions();
    // console.log(hexDim);

    // Now compute the per-hex deltas in both directions
    let hdelta = 0.75 * hexDim.width + 2.0;
    let vdelta = 1.0 * hexDim.height + 2.0;
    // console.log(hdelta, vdelta);

    let hstart = 38.0; // this is related to board width but not sure how
    let vstart = 9.0; // depends on board size too

    return {
        hexLocation: function(hex) {
            return {
                top: vstart + hex.row * vdelta / 2,
                left: hstart + hex.col * hdelta,
            };
        }
    };
})
