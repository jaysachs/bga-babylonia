#!/bin/zsh
SIZE=100x87
HEX="0,43 24,0 74,0 99,43 74,86 24,86"
HEX2="2,43 24,2 74,2 97,43 74,84 24,84"
HEX4="4,43 24,4 74,4 95,43 74,82 24,82"
ZIG="20,43 32,43 32,33 44,33 44,23 56,23 56,33 68,33 68,43 80,43 80,53 92,53 92,63 8,63 8,53 20,53"
COLORS=(FFFFFF 76A89B F9C29A 9A9A9A)

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
addCanvas "-stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'roundrectangle 16,22 83,64 5,5'"

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
    for P in ' ' F M S P
    do
	addCanvas "-pointsize 36 -stroke black -fill \#${C} -draw 'circle 50,43 50,81' -stroke black -strokewidth 2 -fill black -draw 'text 0,0 "${P}"'"
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
for P in M S P MS MP SP MSP
do
    addCanvas "-pointsize 28 -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'roundrectangle 16,22 83,64 5,5' -stroke white -strokewidth 2 -fill white -draw 'text 0,0 \""${P}"\"'"
done

#fields
for P in F5 F6 F7 FX
do
   addCanvas "-pointsize 28 -stroke none -fill \#667313 -draw 'polygon ${HEX}' -stroke black -strokewidth 2 -fill blue -draw 'text 0,0 \""${P}"\"'"
done

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
