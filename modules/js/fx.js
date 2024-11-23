define([
    "dojo",
    'dojo/dom',
    'dojo/fx'
], function (dom, fx) {
    let lastId = 0;
    return {
        spinGrow : function(text,
                            parent,
                            params = {
                                color: null,
                                duration: null,
                                persistTime: null
                            }) {
            let color = params.color || 'inherit';
            let duration = params.duration || 700;
            let persistTime = params.persistTime || 700;
            let id = `spinGrowFx-${lastId++}`;

            let prect = dom.byId(parent).getBoundingClientRect();

            let node = dojo.place(`<div id=${id}>${text}</div>`, parent);
            node.style["position"] = "absolute";
            node.style["top"] = `${(prect.bottom - prect.top)/2}px`;
            node.style["left"] = `${(prect.right - prect.left)/2}px`;
            //            node.style["z-index"] = 1000;
            node.style["font-size"] = "1pt";
            node.style["font-family"] = "Helvetica";
            node.style["font-style"] = "bold";
            node.style["color"] = `#${color}`;
            return dojo.fx.combine([
                new dojo.Animation({
                    duration: duration,
                    curve: [0, 128],
                    onAnimate: function(v) {
                        node.style["font-size"] = `${v}pt`;
                    },
                }),
                new dojo.Animation({
                    duration: duration,
                    curve: [0, 720],
                    onAnimate: function (v) {
                        node.style["transform"] = 'rotate(' + v + 'deg)';
                    }
                }),
                new dojo.Animation({
                    duration: duration + persistTime,
                    curve: [0, 0],
                    onAnimate: function (v) { },
                    onEnd: () => {
                        dojo.destroy(node);
                    }
                }),
            ]);
        }
    };
});
