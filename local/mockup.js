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
        "farmer_1",
        "merchant_1",
        "servant_1",
        "priest_1",
        "hidden_1",
        "farmer_2",
        "merchant_2",
        "servant_2",
        "priest_2",
        "hidden_2",
        "farmer_3",
        "merchant_3",
        "servant_3",
        "priest_3",
        "hidden_3",
        "farmer_4",
        "merchant_4",
        "servant_4",
        "priest_4",
        "hidden_4",
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
    let c = e.parentElement.classList;
    if (c.contains('bbl_unplayable')) { return; }
    if (!c.contains("bbl_selected")) {
        document.querySelectorAll('#bbl_available_zcards > .bbl_selected').forEach(
            div => div.classList.remove('bbl_selected'));
    }
    c.toggle("bbl_selected");
 }
