#!/bin/zsh
SIZE=100x87
HEX="0,43 24,0 74,0 99,43 74,86 24,86"
HEX2="2,43 24,2 74,2 97,43 74,84 24,84"
HEX4="4,43 24,4 74,4 95,43 74,82 24,82"
INNERHEX="0,43 12,22 88,22 99,43 88,66 12,66"
SMALLHEX="21,68 29,54 71,54 79,68 71,82 29,82"

ZIG="20,43 32,43 32,33 44,33 44,23 56,23 56,33 68,33 68,43 80,43 80,53 92,53 92,63 8,63 8,53 20,53"
#
ZIG="16,61 20,45 24,45 28,29 32,29 34,21 66,21 68,29 72,29 76,45 80,45 84,61"

COLORS=(FFFFFF 76A89B F9C29A 9A9A9A)

FONT=Noto-Sans-Cuneiform-Regular

# https://en.wikipedia.org/wiki/Dingir
P=𒀭

# https://en.wiktionary.org/wiki/%C4%93kallum
S=𒅄 # 𒉼 # 𒄮 𒇽 𒃰 𒂵

# https://en.wiktionary.org/wiki/mak%C4%81rum
# https://en.wiktionary.org/wiki/tamk%C4%81rum
M=𒆩 # 𒀖 # 𒀿 # 𒆕 🌾 𒆳

ARCANGLE=15,15
LEAFSPACING=10
LEAFSIZE=12
STEM=30
FARMER_SVG="  m 0,${LEAFSPACING} a ${ARCANGLE} 0 0,0 ${LEAFSIZE},-${LEAFSIZE}
              a ${ARCANGLE} 0 0,0 -${LEAFSIZE},${LEAFSIZE} Z
              m 0,${LEAFSPACING} a ${ARCANGLE} 0 0,0 ${LEAFSIZE},-${LEAFSIZE}
              a ${ARCANGLE} 0 0,0 -${LEAFSIZE},${LEAFSIZE} Z
              m 0,${LEAFSPACING} a ${ARCANGLE} 0 0,0 ${LEAFSIZE},-${LEAFSIZE}
              a ${ARCANGLE} 0 0,0 -${LEAFSIZE},${LEAFSIZE} Z
              m 0,-${STEM} l 0,0
              m 0,${LEAFSPACING} a ${ARCANGLE} 0 0,0 -${LEAFSIZE},-${LEAFSIZE}
              a ${ARCANGLE} 0 0,0 ${LEAFSIZE},${LEAFSIZE} Z
              m 0,${LEAFSPACING} a ${ARCANGLE} 0 0,0 -${LEAFSIZE},-${LEAFSIZE}
              a ${ARCANGLE} 0 0,0 ${LEAFSIZE},${LEAFSIZE} Z
              m 0,${LEAFSPACING} a ${ARCANGLE} 0 0,0 -${LEAFSIZE},-${LEAFSIZE}
              a ${ARCANGLE} 0 0,0 ${LEAFSIZE},${LEAFSIZE} Z
              m 0,-26 a 12,12 0 0,0 0,-16
              a 12,12 0 0,0 0,16 Z
              m 0,0 l 0,${STEM}"

FARMER_FARM="path \"
              M 50,15 l 0,0
              ${FARMER_SVG}
              \""

FARMER_PIECE="path \"
              M 50,30 l 0,0
              ${FARMER_SVG}
              \""


CMD="\( "
ROWS=0
function addCanvas {
    if [[ $ROWS == "0" ]];
    then
        CMD+=" \( "
    fi
    CMD+=" \( canvas:none $1 \) "
    ROWS=$((ROWS + 1))
    if [[ $ROWS == "7" ]];
    then
        CMD+=" -append \) "
        ROWS=0
    fi
}

addCanvas ""

# tile back
addCanvas "-stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}'"

# cities
# addCanvas "-stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'roundrectangle 16,22 83,64 5,5'"
addCanvas "-stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'polygon ${INNERHEX}'"

# ziggurat cards
addCanvas "-stroke none -fill \#924018 -draw 'polygon ${ZIG}'"

# hex highlight
addCanvas "-stroke yellow -strokewidth 5 -fill none -draw 'polygon ${HEX2}'"

# hand piece highlight
addCanvas "-stroke yellow -strokewidth 5 -fill none -draw 'circle 50,43 50,84'"

# empty hand position alpha mask
# remember this technique -- can specify alpha channel directly w/ 4-byte hex colors
addCanvas "-background none -stroke \#FFFFFF30 -strokewidth 2 -fill \#FFFFFF30 -draw 'circle 50,43,50,81'"

for C in ${COLORS[*]}
do
    # the player pieces, including "hidden"
    for P in ' ' ${M} ${S} ${P}
    do
	addCanvas "-font '${FONT}' -pointsize 36 -stroke black -fill \#${C} -draw 'circle 50,43 50,81' -stroke black -strokewidth 1 -fill black -draw 'text 0,-4 "${P}"'"
    done
    addCanvas "-fill \#${C} -draw 'circle 50,43 50,81' -stroke black -strokewidth 2 -draw '${FARMER_PIECE}'"
    # the player board "hand" icon
    addCanvas "-stroke none -background \#000001 \
       -fill \#924018 -draw 'roundrectangle 0,0,99,86 15,15' \
       -fill \#000001 -draw 'rectangle 10,20,89,30' \
       -fill \#000001 -draw 'rectangle 10,56,89,66' \
       -stroke black -fill \#${C} -draw 'circle 50,43 50,81' \
       -transparent \#000001 "
    # the player board "pool" icon
    addCanvas "-stroke none -background \#000001 \
       -stroke black -fill \#${C} -draw 'circle 31,30 51,43' \
       -stroke black -fill \#${C} -draw 'circle 50,60 70,73' \
       -stroke black -fill \#${C} -draw 'circle 69,30 89,43' \
       -transparent \#000001"
done

# cities
for P in  ${M} ${S} ${P} "${M}  ${S}" "${M} ${P}" "${S} ${P}" "${M} ${S} ${P}"
do
    #    addCanvas "-pointsize 24 -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'roundrectangle 16,22 83,64 5,5' -stroke white -strokewidth 1 -fill white -draw 'text 0,0 \""${P}"\"'"
        addCanvas "-pointsize 18 -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'polygon ${INNERHEX}' -stroke white -strokewidth 0 -fill white -draw 'text 0,0 \""${P}"\"'"
done

#fields
for N in 5 6 7
do
    addCanvas "-pointsize 30 -stroke none -fill \#768323 -draw 'polygon ${HEX}' -stroke black -strokewidth 1 -draw '${FARMER_FARM}' -font Arial -strokewidth 0 -fill black -draw 'text 0,25 \""${N}"\"'"
done

# city count field
addCanvas "-pointsize 30 -stroke none -fill \#768323 -draw 'polygon ${HEX}' -stroke black -strokewidth 1 -draw '${FARMER_FARM}' -stroke \#212575 -fill \#212575 -draw 'polygon ${SMALLHEX}'"

# ziggurat
addCanvas "-stroke none -fill \#924018 -draw 'polygon ${ZIG}'"

# hex scoring
addCanvas "-stroke \#FF2222 -strokewidth 9 -fill none -draw 'polygon ${HEX4}'"

while [[ "$ROWS" != 0 ]];
do
    addCanvas ""
done

CMD+=" \) "
echo magick -size ${SIZE} -gravity center "${CMD}" +append img/sprites.png | bash -s

# now the stand

echo magick -size 800x100 -gravity center canvas:none -stroke none -background black \
       -fill \#924018 -draw 'roundrectangle 0,0,799,99 15,15' \
       -fill black -draw 'rectangle 15,25,784,35' \
       -fill black -draw 'rectangle 15,65,784,75' \
       -transparent black \
       +append img/stand.png > /dev/null
