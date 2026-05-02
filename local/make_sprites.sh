#!/bin/zsh
SIZE=100x87
HEX="0,43 24,0 74,0 99,43 74,86 24,86"
HEX2="2,43 24,2 74,2 97,43 74,84 24,84"
HEX4="4,43 24,4 74,4 95,43 74,82 24,82"
# INNERHEX="11,43 32,9 66,9 88,43 66,77 32,77"
# SMALLHEX="33,62 42,48 58,48 67,62 58,76 42,76"
INNERHEX="0,43 12,22 88,22 99,43 88,66 12,66"
SMALLHEX="18,62 26,48 74,48 82,62 74,76 26,76"

ZIG="20,43 32,43 32,33 44,33 44,23 56,23 56,33 68,33 68,43 80,43 80,53 92,53 92,63 8,63 8,53 20,53"
#
ZIG="16,61 20,45 24,45 28,29 32,29 34,21 66,21 68,29 72,29 76,45 80,45 84,61"

COLORS=(FFFFFF 76A89B F9C29A 9A9A9A)

M=𒈫
S=𒉼 # 𒄮 𒇽 𒃰 𒂵
P=𒆳
F=𒀖 # 𒀿

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
    for P in ' ' ${F} ${M} ${S} ${P}
    do
	addCanvas "-font 'Esagil-Regular' -pointsize 42 -stroke black -fill \#${C} -draw 'circle 50,43 50,81' -stroke black -strokewidth 1 -fill black -draw 'text 0,4 "${P}"'"
    done
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
for P in  ${M} ${S} ${P} "${M}  ${S}" "${M}  ${P}" "${S}  ${P}" "${M} ${S} ${P}"
do
    #    addCanvas "-pointsize 24 -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'roundrectangle 16,22 83,64 5,5' -stroke white -strokewidth 1 -fill white -draw 'text 0,0 \""${P}"\"'"
        addCanvas "-pointsize 32 -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'polygon ${INNERHEX}' -stroke white -strokewidth 1 -fill white -draw 'text 0,3 \""${P}"\"'"
done

#fields
for N in 5 6 7
do
   addCanvas "-pointsize 36 -stroke none -fill \#768323 -draw 'polygon ${HEX}' -stroke black -strokewidth 1 -fill blue -font Esagil-Regular -draw 'text 0,-10 \""${F}"\"' -font Arial -strokewidth 2 -draw 'text 0,20 \""${N}"\"'"
done

# city count field
addCanvas "-pointsize 36 -stroke none -fill \#768323 -draw 'polygon ${HEX}' -stroke black -strokewidth 1 -fill blue -font Esagil-Regular -draw 'text 0,-10 \""${F}"\"' -fill \#212575 -draw 'polygon ${SMALLHEX}'"

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
