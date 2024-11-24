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
            let id = `spinGrowFx-${lastId++}`;
            // We use a container node to hold the final size.
            //   something in BGA's CSS and structure gets in the way
            //   and shrinks the node down to its minimum.
            let outer = dojo.place(`<span id="${id}">${p.text}</span>`, p.parent);
            outer.style.color = "transparent";
            outer.style.position = "absolute";
            outer.style.fontSize = p.fontSize + "pt";
            outer.style.display = "inline-block";
            outer.style.justifyContent = "center";
            outer.style.alignItems = "center";
            outer.style.display = "flex";
            // probably should allow a class to be passed in and used for these two
            outer.style.fontFamily = "Helvetica";
            outer.style.fontStyle = "bold";

            // get the ultimate dimensions of the container span
            let nrect = outer.getBoundingClientRect();
            outer.style.width = nrect.width;
            outer.style.height = nrect.height;

            // center the container on the center of the appropriate node
            let centerNode = dom.byId(p.centeredOn || p.parent);
            let prect = dom.byId(p.parent).getBoundingClientRect();
            let crect = centerNode.getBoundingClientRect();
            let left = (crect.left + crect.width/2 - nrect.width/2 - prect.left);
            let top = (crect.top + crect.height/2 - nrect.height/2 - prect.top);
            outer.style.left = left + "px";
            outer.style.top = top + "px";

            // now create the node we're animating
            let node = dojo.place(`<span>${p.text}</span>`, id);
            node.style.position = "absolute";
            node.style.display = "inline-block";
            node.style.justifyContent = "center";
            node.style.alignItems = "center";
            node.style.display = "flex";
            // text not viewable
            node.style.fontSize = "0pt";
            // keep on top
            node.style.zIndex = "100";

            // this maybe ought to be a parameter, or part of the incoming class.
            node.style.textShadow = "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000";

            return fx.chain([
                dojo.fx.combine([
                    // the "grow"
                    new dojo.Animation({
                        duration: p.duration,
                        curve: [0, p.fontSize],
                        onBegin: () => node.style.color = p.color,
                        onAnimate: function(v) {
                            node.style.fontSize = `${v}pt`;
                        },
                    }),
                    // the "spin"
                    new dojo.Animation({
                        duration: p.duration,
                        curve: [0, p.spinCount * 360],
                        onAnimate: function (v) {
                            node.style["transform"] = 'rotate(' + v + 'deg)';
                        }
                    })
                ]),
                // and the fade out
                fx.fadeOut({
                    node: node,
                    duration: p.fadeTime,
                    onEnd: () => {
                        dojo.destroy(outer);
                    }
                }),
            ]);
        }
    };
});
