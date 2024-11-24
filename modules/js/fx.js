define([
    "dojo",
    'dojo/dom',
    'dojox/fx'
], function (dojo, dom, fx) {
    let lastId = 0;
    const defParams = {
        text: "",
        parent: null,
        color: 'inherit',
        centeredOn: null, // null defaults to parent
        fontSize: 128, // in points
        spinCount: 2, // number of full revolutions
        duration: 700,
        fadeTime: 1000
    };
    return {
        spinGrowText : function(params = defParms) {
            let p = Object.assign(Object.assign({}, defParams), params);
            console.log("spinGrowText", p);
            let id = `spinGrowFx-${lastId++}`;
            let node = dojo.place(`<span id="${id}">${p.text}</span>`, p.parent);

            node.style.color = "transparent";
            node.style.position = "absolute";
            node.style.fontSize = "128pt";
            node.style.fontFamily = "Helvetica";
            node.style.fontStyle = "bold";
            node.style.display = "inline-block";
            node.style.justifyContent = "center";
            node.style.alignItems = "center";

            // get the ultimate dimensions of the span
            let nrect = node.getBoundingClientRect();
            console.log(nrect);
            node.style.width = nrect.width;
            node.style.height = nrect.height;
            // make text not viewable
            node.style.fontSize = "0pt";
            node.style.display = "flex";
            node.style.zIndex = "100";
            node.style.textShadow = "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000";


            // center the node on the center of the appropriate node
            let centerNode = dom.byId(p.centeredOn || p.parent);
            let prect = dom.byId(p.parent).getBoundingClientRect();
            let crect = centerNode.getBoundingClientRect();
            console.log(prect);
            console.log(crect);
            console.log(dom.byId('bbl_board').getBoundingClientRect());
            let left = (crect.left + crect.width/2 - nrect.width/2 - prect.left);
            let top = (crect.top + crect.height/2 - nrect.height/2 - prect.top);

            node.style.left = left + "px";
            node.style.top = top + "px";

            return fx.chain([
                dojo.fx.combine([
                    new dojo.Animation({
                        duration: p.duration,
                        curve: [0, p.fontSize],
                        onBegin: () => node.style.color = p.color,
                        onAnimate: function(v) {
                            node.style.fontSize = `${v}pt`;
                        },
                    })
                    ,
                    new dojo.Animation({
                        duration: p.duration,
                        curve: [0, p.spinCount * 360],
                        onAnimate: function (v) {
                            node.style["transform"] = 'rotate(' + v + 'deg)';
                        }
                    })
                ]),
                fx.fadeOut({
                    node: node,
                    duration: p.fadeTime,
                    onEnd: () => {
                        dojo.destroy(node);
                    }
                }),
            ]);
        }
    };
});
