#!/bin/zsh
SIZE=200x173
HEX="0,86 48,0 148,0 199,96 148,172 48,172"
HEX2="4,86 48,4 148,4 194,86 148,172 48,168"
HEX4="8,86 48,8 148,8 190,86 148,164 48,164"
INNERHEX="0,43 12,22 88,22 99,43 88,66 12,66"
SMALLHEX="21,68 29,54 71,54 79,68 71,82 29,82"

COLORS=("${(@f)$(strip-json-comments gameinfos.jsonc | jq '.["player_colors"].[]')}")

# tile back
# addCanvas "-stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}'"

# hex highlight
magick -size ${SIZE} -gravity center canvas:none -stroke yellow -strokewidth 10 -fill none -draw "polygon ${HEX2}" +append hex_highlight.png

# hand piece highlight
magick -size ${SIZE} -gravity center canvas:none -stroke yellow -strokewidth 10 -fill none -draw 'circle 100,86 100,168' +append hand_highlight.png

# empty hand position alpha mask
# remember this technique -- can specify alpha channel directly w/ 4-byte hex colors
magick -size ${SIZE} -gravity center canvas:none -background none -stroke \#FFFFFF30 -strokewidth 4 -fill \#FFFFFF30 -draw 'circle 100,86 100,168' +append empty_hand.png

# hex scoring
magick -size ${SIZE} -gravity center canvas:none -stroke \#FF2222 -strokewidth 18 -fill none -draw "polygon ${HEX4}" +append hex_scoring.png

I=1
for COLOR in ${COLORS[*]}
do
    C=${COLOR//\"/}
    magick -size ${SIZE} -gravity center canvas:none -stroke black -fill \#${C} -draw 'circle 100,86 100,168' +append hidden-p-${I}.png
    # the player board "pool" icon
    magick -size ${SIZE} -gravity center canvas:none -stroke black -fill \#${C} -draw 'circle 62,60 102,86' -stroke black -fill \#${C} -draw 'circle 100,120 140,146' -stroke black -fill \#${C} -draw 'circle 138,60 178,86' -transparent \#000001 +append pool-p-${I}.png
    I=$((I+1))
done
