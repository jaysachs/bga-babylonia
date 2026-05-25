const hstart = 38.0; // this is related to board width but not sure how
const vstart = 9.0; // depends on board size too
const height = 768 / 12.59;
const width = height * 1.155;
const hdelta = 0.75 * width + 2.0;
const vdelta = 1.0 * height + 2.0;


const putHex = function(rc) {
    let top = vstart + rc.row * vdelta / 2;
    let left = hstart + rc.col * hdelta;

    return `<div style='top:${top}px; left:${left}px;' id='bbl_hex_${rc.row}_${rc.col}'></div>`;
};

function cycleThings(e) {
    let pieces = [
        "empty",
        "farmer_dddddd",
        "merchant_dddddd",
        "servant_dddddd",
        "priest_dddddd",
        "hidden_dddddd",
        "farmer_c26a77",
        "merchant_c26a77",
        "servant_c26a77",
        "priest_c26a77",
        "hidden_c26a77",
        "farmer_5da899",
        "merchant_5da899",
        "servant_5da899",
        "priest_5da899",
        "hidden_5da899",
        "farmer_dccd7d",
        "merchant_dccd7d",
        "servant_dccd7d",
        "priest_dccd7d",
        "hidden_dccd7d",
    ];
    let cities = [
        "city_msp",
        "city_m",
        "city_p",
        "city_s",
        "city_ms",
        "city_sp",
        "city_mp",
        "field_5",
        "field_6",
        "field_7",
        "field_X",
        "ziggurat",
    ];
    let all = pieces.concat(cities);
    let pdiv = e.firstElementChild;
    if (pdiv == null) {
        idiv = document.createElement('div');
        idiv.setAttribute('bbl_piece', all[1]);
        e.appendChild(idiv);
    } else {
        let p = pdiv.getAttribute('bbl_piece');
        for (let i = 0; i < all.length; ++i) {
            if (p == all[i]) {
                if (i < all.length-1) {
                    pdiv.setAttribute('bbl_piece', all[i+1]);
                } else {
                    e.replaceChildren();
                }
                return;
            }
        }
    }
}

function selectHex(event) {
    event.preventDefault();
    event.stopPropagation();
    let e = event.target;
    while (e.parentElement != null && e.parentElement.id != "bbl_board") {
        e = e.parentElement;
    }
    if (e.parentElement != null) {
        let x = e.id.split("_");
        console.log("selected hex " + x[2] + ", " + x[3]);
        // e.classList.toggle("selected");
        cycleThings(e);
    }
}

function selectPieceToPlay(event) {
    event.preventDefault();
    event.stopPropagation();
    let e = event.target;
    console.log(e);
    let p = e.getAttribute('bbl_piece');
    if (!p || p == 'empty') { return; }
    let c = e.parentElement.classList;
    if (c.contains('bbl_unplayable')) { return; }
    if (!c.contains("bbl_selected")) {
        document.querySelectorAll('#bbl_hand > .bbl_selected').forEach(
            div => div.classList.remove('bbl_selected'));
    }
    c.toggle("bbl_selected");
}

function selectZCard(event) {
    event.preventDefault();
    event.stopPropagation();
    let e = event.target;
    let z = e.getAttribute('bbl_ztype');
    if (!z) { return; }
    let c = e.classList;
    if (c.contains('bbl_unplayable')) { return; }
    if (!c.contains("bbl_selected")) {
        document.querySelectorAll('#bbl_available_zcards > .bbl_selected').forEach(
            div => div.classList.remove('bbl_selected'));
    }
    c.toggle("bbl_selected");
 }

const BblHtml = {
    hstart: 38.0, // this is related to board width but not sure how
    vstart: 9.0, // depends on board size too
    height: 768 / 12.59,
    width: height * 1.155,
    hdelta: 0.75 * width + 2.0,
    vdelta: 1.0 * height + 2.0,

    makeHexDiv: function(hex) {
        const row = Math.trunc(hex.rc / 100);
        const col = Math.trunc(hex.rc % 100);
        let top = this.vstart + row * this.vdelta / 2;
        let left = this.hstart + col * this.hdelta;

        let h = document.createElement('div');
        h.id = `bbl_hex_${col}_${row}`;
        h.setAttribute('bbl_col', col);
        h.setAttribute('bbl_row', row);
        h.style = `top: ${top/7.68}%; left: ${left/10.24}%`;
        return h;
    }
};

function populateBoard() {
    const b = document.getElementById('bbl_board');
    for (let col = 1; col < 16; ++col) {
        for (let row = 1 + col % 2; row < 10; ++row) {
            const h2 = BblHtml.makeHexDiv({ rc: row * 100 + col });
            b.appendChild(h2);
            if (col == 4 && row == 4) {
                h2.innerHTML='<div bbl_piece="city_m"></div>';
            }
        }
    }
//    document.getElementById('bbl_board').innerHTML='<div id="bbl_hex_0_8" style="top: 9px; left: 476.736px;" class=""></div><div id="bbl_hex_1_1" style="top: 40.5004px; left: 92.8419px;" class=""></div><div id="bbl_hex_1_7" style="top: 40.5004px; left: 421.894px;" class=""></div><div id="bbl_hex_2_0" style="top: 72.0008px; left: 38px;" class=""></div><div id="bbl_hex_2_2" style="top: 72.0008px; left: 147.684px;" class=""></div><div id="bbl_hex_2_4" style="top: 72.0008px; left: 257.368px;" class=""></div><div id="bbl_hex_2_6" style="top: 72.0008px; left: 367.052px;" class=""></div><div id="bbl_hex_2_8" style="top: 72.0008px; left: 476.736px;" class=""></div><div id="bbl_hex_3_1" style="top: 103.501px; left: 92.8419px;" class=""><div bbl_piece="ziggurat"></div></div><div id="bbl_hex_3_3" style="top: 103.501px; left: 202.526px;"><div bbl_piece="city_m"></div></div><div id="bbl_hex_3_5" style="top: 103.501px; left: 312.21px;" class=""></div><div id="bbl_hex_3_7" style="top: 103.501px; left: 421.894px;" class=""></div><div id="bbl_hex_4_0" style="top: 135.002px; left: 38px;" class=""></div><div id="bbl_hex_4_2" style="top: 135.002px; left: 147.684px;" class=""></div><div id="bbl_hex_4_4" style="top: 135.002px; left: 257.368px;" class=""></div><div id="bbl_hex_4_6" style="top: 135.002px; left: 367.052px;"><div bbl_piece="field_5"></div></div><div id="bbl_hex_4_8" style="top: 135.002px; left: 476.736px;" class=""></div><div id="bbl_hex_5_1" style="top: 166.502px; left: 92.8419px;" class=""><div bbl_piece="merchant_3"></div></div><div id="bbl_hex_5_3" style="top: 166.502px; left: 202.526px;" class=""></div><div id="bbl_hex_5_5" style="top: 166.502px; left: 312.21px;" class=""></div><div id="bbl_hex_5_7" style="top: 166.502px; left: 421.894px;" class=""></div><div id="bbl_hex_5_9" style="top: 166.502px; left: 531.577px;" class=""></div><div id="bbl_hex_6_0" style="top: 198.002px; left: 38px;"><div bbl_piece="city_ms"></div></div><div id="bbl_hex_6_2" style="top: 198.002px; left: 147.684px;" class=""></div><div id="bbl_hex_6_4" style="top: 198.002px; left: 257.368px;" class=""></div><div id="bbl_hex_6_6" style="top: 198.002px; left: 367.052px;" class=""></div><div id="bbl_hex_6_8" style="top: 198.002px; left: 476.736px;"><div bbl_piece="city_sp"></div></div><div id="bbl_hex_6_10" style="top: 198.002px; left: 586.419px;" class=""></div><div id="bbl_hex_7_1" style="top: 229.503px; left: 92.8419px;" class=""></div><div id="bbl_hex_7_3" style="top: 229.503px; left: 202.526px;" class=""></div><div id="bbl_hex_7_5" style="top: 229.503px; left: 312.21px;"><div bbl_piece="city_mp"></div></div><div id="bbl_hex_7_7" style="top: 229.503px; left: 421.894px;" class=""></div><div id="bbl_hex_7_9" style="top: 229.503px; left: 531.577px;" class=""></div><div id="bbl_hex_8_0" style="top: 261.003px; left: 38px;" class=""></div><div id="bbl_hex_8_2" style="top: 261.003px; left: 147.684px;" class=""></div><div id="bbl_hex_8_4" style="top: 261.003px; left: 257.368px;" class=""></div><div id="bbl_hex_8_6" style="top: 261.003px; left: 367.052px;" class=""></div><div id="bbl_hex_8_8" style="top: 261.003px; left: 476.736px;" class=""><div bbl_piece="servant_3"></div></div><div id="bbl_hex_8_10" style="top: 261.003px; left: 586.419px;" class=""></div><div id="bbl_hex_9_1" style="top: 292.504px; left: 92.8419px;"><div bbl_piece="city_p"></div></div><div id="bbl_hex_9_3" style="top: 292.504px; left: 202.526px;" class=""></div><div id="bbl_hex_9_5" style="top: 292.504px; left: 312.21px;" class=""></div><div id="bbl_hex_9_7" style="top: 292.504px; left: 421.894px;" class=""></div><div id="bbl_hex_9_9" style="top: 292.504px; left: 531.577px;"><div bbl_piece="city_s"></div></div><div id="bbl_hex_10_0" style="top: 324.004px; left: 38px;" class=""></div><div id="bbl_hex_10_2" style="top: 324.004px; left: 147.684px;" class=""></div><div id="bbl_hex_10_4" style="top: 324.004px; left: 257.368px;"><div bbl_piece="field_X"></div></div><div id="bbl_hex_10_6" style="top: 324.004px; left: 367.052px;" class=""></div><div id="bbl_hex_10_8" style="top: 324.004px; left: 476.736px;" class=""></div><div id="bbl_hex_10_10" style="top: 324.004px; left: 586.419px;" class=""></div><div id="bbl_hex_11_1" style="top: 355.504px; left: 92.8419px;" class=""></div><div id="bbl_hex_11_3" style="top: 355.504px; left: 202.526px;" class=""></div><div id="bbl_hex_11_5" style="top: 355.504px; left: 312.21px;" class=""></div><div id="bbl_hex_11_7" style="top: 355.504px; left: 421.894px;" class=""></div><div id="bbl_hex_11_9" style="top: 355.504px; left: 531.577px;" class=""></div><div id="bbl_hex_12_0" style="top: 387.005px; left: 38px;"><div bbl_piece="city_mp"></div></div><div id="bbl_hex_12_2" style="top: 387.005px; left: 147.684px;" class=""></div><div id="bbl_hex_12_4" style="top: 387.005px; left: 257.368px;" class=""></div><div id="bbl_hex_12_6" style="top: 387.005px; left: 367.052px;"><div bbl_piece="field_X"></div></div><div id="bbl_hex_12_8" style="top: 387.005px; left: 476.736px;"><div bbl_piece="ziggurat"></div></div><div id="bbl_hex_12_10" style="top: 387.005px; left: 586.419px;" class=""></div><div id="bbl_hex_13_1" style="top: 418.505px; left: 92.8419px;" class=""></div><div id="bbl_hex_13_3" style="top: 418.505px; left: 202.526px;" class=""></div><div id="bbl_hex_13_5" style="top: 418.505px; left: 312.21px;" class=""></div><div id="bbl_hex_13_7" style="top: 418.505px; left: 421.894px;" class=""></div><div id="bbl_hex_13_9" style="top: 418.505px; left: 531.577px;" class=""></div><div id="bbl_hex_14_0" style="top: 450.006px; left: 38px;" class=""></div><div id="bbl_hex_14_2" style="top: 450.006px; left: 147.684px;"><div bbl_piece="city_ms"></div></div><div id="bbl_hex_14_4" style="top: 450.006px; left: 257.368px;"><div bbl_piece="field_X"></div></div><div id="bbl_hex_14_6" style="top: 450.006px; left: 367.052px;" class=""></div><div id="bbl_hex_14_8" style="top: 450.006px; left: 476.736px;" class=""></div><div id="bbl_hex_14_10" style="top: 450.006px; left: 586.419px;" class=""></div><div id="bbl_hex_15_1" style="top: 481.506px; left: 92.8419px;" class=""></div><div id="bbl_hex_15_3" style="top: 481.506px; left: 202.526px;" class=""></div><div id="bbl_hex_15_5" style="top: 481.506px; left: 312.21px;" class=""></div><div id="bbl_hex_15_7" style="top: 481.506px; left: 421.894px;" class=""></div><div id="bbl_hex_15_9" style="top: 481.506px; left: 531.577px;" class=""></div><div id="bbl_hex_16_0" style="top: 513.006px; left: 38px;" class=""></div><div id="bbl_hex_16_2" style="top: 513.006px; left: 147.684px;" class=""></div><div id="bbl_hex_16_4" style="top: 513.006px; left: 257.368px;" class=""></div><div id="bbl_hex_16_6" style="top: 513.006px; left: 367.052px;" class=""></div><div id="bbl_hex_16_8" style="top: 513.006px; left: 476.736px;"><div bbl_piece="city_m"></div></div><div id="bbl_hex_17_1" style="top: 544.507px; left: 92.8419px;" class=""></div><div id="bbl_hex_17_3" style="top: 544.507px; left: 202.526px;" class=""></div><div id="bbl_hex_17_5" style="top: 544.507px; left: 312.21px;" class=""></div><div id="bbl_hex_17_7" style="top: 544.507px; left: 421.894px;" class=""></div><div id="bbl_hex_17_9" style="top: 544.507px; left: 531.577px;" class=""></div><div id="bbl_hex_18_0" style="top: 576.007px; left: 38px;" class=""></div><div id="bbl_hex_18_2" style="top: 576.007px; left: 147.684px;"><div bbl_piece="ziggurat"></div></div><div id="bbl_hex_18_4" style="top: 576.007px; left: 257.368px;" class=""></div><div id="bbl_hex_18_6" style="top: 576.007px; left: 367.052px;" class=""></div><div id="bbl_hex_18_8" style="top: 576.007px; left: 476.736px;" class=""></div><div id="bbl_hex_19_1" style="top: 607.508px; left: 92.8419px;" class=""></div><div id="bbl_hex_19_3" style="top: 607.508px; left: 202.526px;" class=""></div><div id="bbl_hex_19_5" style="top: 607.508px; left: 312.21px;"><div bbl_piece="field_6"></div></div><div id="bbl_hex_19_7" style="top: 607.508px; left: 421.894px;"><div bbl_piece="city_p"></div></div><div id="bbl_hex_19_9" style="top: 607.508px; left: 531.577px;" class=""></div><div id="bbl_hex_20_0" style="top: 639.008px; left: 38px;" class=""></div><div id="bbl_hex_20_2" style="top: 639.008px; left: 147.684px;" class=""></div><div id="bbl_hex_20_4" style="top: 639.008px; left: 257.368px;" class=""></div><div id="bbl_hex_20_6" style="top: 639.008px; left: 367.052px;" class=""></div><div id="bbl_hex_20_8" style="top: 639.008px; left: 476.736px;" class=""></div><div id="bbl_hex_20_10" style="top: 639.008px; left: 586.419px;" class=""></div><div id="bbl_hex_21_1" style="top: 670.508px; left: 92.8419px;"><div bbl_piece="field_7"></div></div><div id="bbl_hex_21_3" style="top: 670.508px; left: 202.526px;" class=""></div><div id="bbl_hex_21_5" style="top: 670.508px; left: 312.21px;" class=""></div><div id="bbl_hex_21_7" style="top: 670.508px; left: 421.894px;" class=""></div><div id="bbl_hex_21_9" style="top: 670.508px; left: 531.577px;" class=""></div><div id="bbl_hex_22_2" style="top: 702.009px; left: 147.684px;" class=""></div><div id="bbl_hex_22_4" style="top: 702.009px; left: 257.368px;"><div bbl_piece="city_s"></div></div><div id="bbl_hex_22_6" style="top: 702.009px; left: 367.052px;" class=""></div><div id="bbl_hex_22_8" style="top: 702.009px; left: 476.736px;"><div bbl_piece="city_sp"></div></div><div id="bbl_hex_22_10" style="top: 702.009px; left: 586.419px;" class=""></div></div>';

}

function populateBoard2() {
          const hexDiv = (r,c) => {
              return document.getElementById(`bbl_hex_${r}_${c}`);
          }
          var boardData = [];
          for (var c = 0; c <= 16; c++) {
              let odd = c % 2 == 1;
              let start = odd ? 1 : 0;
              let end = odd ? 21 : 22
              for (let r = start; r <= end; r+=2) {
                  boardData.push({row: r, col: c});
              }
          }

          let boardDiv = document.getElementById("bbl_board");

          let html = new Html({});
          for( let h = 0; h < boardData.length; ++h) {
              let hex = boardData[h];
              boardDiv.insertAdjacentHTML('beforeend', putHex(hex));
          }

          let someHex = hexDiv(7,1);
          cycleThings(someHex);
          someHex.classList.add('bbl_playable');

          cycleThings(hexDiv(8, 4));
          cycleThings(hexDiv(10, 6));
          hexDiv(8,4).classList.add('bbl_in_network');
          hexDiv(10,6).classList.add('bbl_in_network');
          hexDiv(10,6).classList.add('bbl_unimportant');

          hexDiv(7, 5).classList.add('bbl_selected');
          hexDiv(11, 1).classList.add('bbl_selected');

          hexDiv(7, 11).classList.add('bbl_selected');
}

const IDS = {
    MAIN: 'bbl_main'
}

const View = {
    map_aspect_ratio:  2496.0 / 3385.0
}

const CSS = {
    LAYOUT_UNDER_BOARD: 'bbl_altflow'
}

function handleResize(evt) {
        const pageEl = document.getElementById('page-content');
        const pageRect = pageEl.getBoundingClientRect();
        const viewPort = window.visualViewport;

        const vertAvail = viewPort.height - pageRect.top;

        // "horizontal" "default" layout
        var w1 = pageRect.width * 0.875;
        var h1 = w1 * View.map_aspect_ratio;
        if (h1 > vertAvail) {
            w1 = vertAvail / View.map_aspect_ratio;
            h1 = vertAvail;
        }

        // "vertical" "alt" layout
        var h2 = vertAvail * 0.875;
        var w2 = h2 / View.map_aspect_ratio;
        if (w2 > pageRect.width) {
            w2 = pageRect.width - 12;
            h2 = w2 * View.map_aspect_ratio;
        }

        const mainElCl = document.getElementById(IDS.MAIN).classList;
        if (w1 >= w2) {
            mainElCl.remove(CSS.LAYOUT_UNDER_BOARD);
            document.body.style.setProperty('--bbl-board-width', (w1 - 12) + 'px');
        } else {
            mainElCl.add(CSS.LAYOUT_UNDER_BOARD);
            document.body.style.setProperty('--bbl-board-width', w2 + 'px');
        }
   }
