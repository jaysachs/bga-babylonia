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
        p = e.getAttribute('bbl_piece') || all[0];
        for (i = 0; i < all.length; ++i) {
            if (p == all[i]) {
                if (i < all.length-1) {
                    e.setAttribute('bbl_piece', all[i+1]);
                } else {
                    e.setAttribute('bbl_piece', all[0]);
                }
                return;
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
        let hc = e.parentElement;
        if (hc.id == "bbl_hand") {
            let p = e.getAttribute('bbl_piece');
            if (!p || p == 'empty') { return; }
            let c = e.classList;
            if (c.contains('bbl_unplayable')) { return; }
            if (!c.contains("bbl_selected")) {
                hc.querySelectorAll('#bbl_hand > .bbl_selected').forEach(
                div => div.classList.remove('bbl_selected'));
            }
            c.toggle("bbl_selected");
        }
    }

      function toggle_zcards() {
      zcs = document.getElementById('bbl_available_zcards');
      console.log(zcs);
      a = zcs.style.height;
      console.log(`a is x${a}x`);
      if (a == null || a == '') { zcs.style.height = '0px'; zcs.style.visibility='hidden';}
      else { zcs.style.height = ''; zcs.style.visibility='initial';}

      }
