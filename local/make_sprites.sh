#!/bin/zsh
SIZE=200x173
HEX="0,86 48,0 148,0 199,96 148,172 48,172"
HEX2="4,86 48,4 148,4 194,86 148,172 48,168"
HEX4="8,86 48,8 148,8 190,86 148,164 48,164"
INNERHEX="0,43 12,22 88,22 99,43 88,66 12,66"
SMALLHEX="21,68 29,54 71,54 79,68 71,82 29,82"

COLORS=("${(@f)$(strip-json-comments ../gameinfos.jsonc | jq '.["player_colors"].[]')}" bcb7a8)

# tile back
# addCanvas "-stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}'"

# hex highlight
magick -size ${SIZE} -gravity center canvas:none -stroke yellow -strokewidth 10 -fill none -draw "polygon ${HEX2}" +append hex_highlight.png

# hand piece highlight
magick -size ${SIZE} -gravity center canvas:none -stroke yellow -strokewidth 10 -fill none -draw 'circle 100,86 100,168' +append hand_highlight.png

# empty hand position alpha mask
# remember this technique -- can specify alpha channel directly w/ 4-byte hex colors
magick -size ${SIZE} -gravity center canvas:none -background none -stroke \#00000040 -strokewidth 2 -fill \#00000020 -draw 'circle 100,86 100,168' +append empty_hand.png

# hex scoring
magick -size ${SIZE} -gravity center canvas:none -stroke \#FF2222 -strokewidth 18 -fill none -draw "polygon ${HEX4}" +append hex_scoring.png

I=1
for COLOR in ${COLORS[*]}
do
    C=${COLOR//\"/}

    magick -size ${SIZE} -gravity center canvas:none -stroke black -fill \#${C} -draw 'circle 100,86 100,168' +append P-${I}-hidden.png

    #    magick -size ${SIZE} -gravity center canvas:none -stroke black -fill \#${C} -draw 'circle 19,86 37,86' -draw 'circle 59,86 77,86' -draw 'circle 99,86 117,86' -draw 'circle 139,86 157,86' -draw 'circle 179,86 197,86'  +append P-${I}-hand.png
    magick -size 500x173 -gravity center canvas:none -stroke black -strokewidth 3 -fill \#${C} -draw 'circle 55,86 100,86' -draw 'circle 150,86 195,86' -draw 'circle 245,86 290,86' -draw 'circle 340,86 385,86' -draw 'circle 435,86 480,86'  +append P-${I}-hand.png

    # the player board "pool" icon
    magick -size ${SIZE} -gravity center canvas:none -stroke black -strokewidth 3 -fill \#${C} -draw 'circle 62,70 102,96' -draw 'circle 100,120 140,146' -draw 'circle 138,50 178,76' -transparent \#000001 +append P-${I}-pool.png
    I=$((I+1))
done
