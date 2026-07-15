#!/bin/zsh

# copied from make_sprites.sh
ZIG="66,61 70,45 74,45 78,29 82,29 84,21 116,21 118,29 122,29 126,45 130,45 134,61"

NUM=1
for C in '+10pts' '+ turn' hand7 3nobles 3farmers fields citypts land river
do
    magick -size 184x228 -pointsize 24 -gravity center canvas:none -stroke black -fill \#D6C6B5 -draw 'rectangle 0,0,183,227' -fill \#924018 -draw "polygon ${ZIG}" -stroke black -strokewidth 2 -fill black -gravity center -pointsize 42 -draw "text 0,0 '${C}'" -gravity SouthWest -pointsize 24 -strokewidth 1 -draw "text 8,5 '${NUM++}'" +append ZigCard-$((NUM++)).png

done
