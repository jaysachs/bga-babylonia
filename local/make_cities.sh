#!/bin/bash

CMD=
HEX="0,43 24,0 74,0 99,43 74,86 24,86"
for P in ' ' M S P MS MP SP MSP F5 F6 F7 FX
do
    CMD+=" \( canvas:none -stroke none -fill green -draw 'polygon ${HEX}' -stroke black -strokewidth 2 -fill black -draw 'text 0,0 "${P}"' \) "
done

# ziggurat
CMD+=" \( canvas:none -stroke none -fill red -draw 'polygon 20,43 32,43 32,33 44,33 44,23 56,23 56,33 68,33 68,43 80,43 80,53 92,53 92,63 8,63 8,53 20,53' \) "

echo magick -size 100x87 -pointsize 36 -gravity center ${CMD} -append cities.png

echo magick -size 100x87 -gravity center canvas:none -stroke yellow -strokewidth 5 -fill none -draw "'polygon ${HEX}'" -append highlight.png
