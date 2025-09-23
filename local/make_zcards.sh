#!/bin/zsh

CMD=
NUM=1
for C in 10pts xturn hand7 3nobles 3farmers fields citypts land river
do
    CMD+=" \( canvas:none -stroke black -fill \#D6C6B5 -draw 'rectangle 0,0 183,227' -stroke black -strokewidth 2 -fill black -gravity center -pointsize 42 -draw 'text 0,0 \""${C}"\"' -gravity SouthWest -pointsize 24 -strokewidth 1 -draw 'text 8,5 \""$((NUM++))"\"' \) "

done

# CMD+=" \( canvas:none -stroke none -fill \#867665 -draw 'rectangle 0,0 183,227' \) "

echo magick -size 184x228 -pointsize 24 -gravity center ${CMD} +append img/zcards.png | bash -s
