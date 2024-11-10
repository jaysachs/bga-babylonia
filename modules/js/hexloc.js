

let calcrm = function(s) {
    if (s.startsWith('calc(')) {
        s = s.substring(5);
    }
    if (s.endsWith('px)')) {
        s = s.substring(0, s.length-3);
    }
    return s;
};

let boardDiv = document.getElementById('board');
var style = getComputedStyle(board);
let hexheight = style.getPropertyValue('--hex-height');
let hexwidth = style.getPropertyValue('--hex-width');
console.log(hexwidth, hexheight);
let s = document.getElementById('vars').style;
s.setProperty('width', hexwidth);
s.setProperty('height', hexheight);
// console.log(s);
let hw = calcrm(s.getPropertyValue('width'));
let hh = calcrm(s.getPropertyValue('height'));

console.log(hw, hh);
let hoffset = 0.75 * hw;
let voffset = 1.0 * hh + 1.0;
console.log(hoffset, voffset);
let hstart = 38.0; // this is related to board width but not sure how
let vstart = 9.0; // depends on board size too

export function hexLocation(hex) {
    return {
        top: vstart + hex.row * (voffset+1) / 2,
        left: hstart + (hex.col * (hoffset+2)),
    };
}
