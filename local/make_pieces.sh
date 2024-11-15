#!/bin/zsh
SIZE=100x87
HEX="0,43 24,0 74,0 99,43 74,86 24,86"
ZIG="20,43 32,43 32,33 44,33 44,23 56,23 56,33 68,33 68,43 80,43 80,53 92,53 92,63 8,63 8,53 20,53"
COLORS=(FFFFFF 76A89B F9C29A 9A9A9A)

CMD="\( \( canvas:none \) "

# tile back
CMD+="\( canvas:none -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' \) "

# cities
CMD+=" \( canvas:none -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'roundrectangle 16,22 83,64 5,5' \) "

# ziggurat cards
CMD+=" \( canvas:none -stroke none -fill \#924018 -draw 'polygon ${ZIG}' \) "

# hex highlight
CMD+=" \( canvas:none -stroke yellow -strokewidth 5 -fill none -draw 'polygon ${HEX}' \) "

# hand piece highlight
CMD+=" \( canvas:none -stroke yellow -strokewidth 5 -fill none -draw 'circle 50,43 50,84' \) "

# empty hand position alpha mask
# remember this technique -- can specify alpha channel directly w/ 4-byte hex colors
CMD+=" \( canvas:none -background none -stroke \#FFFFFF30 -strokewidth 2 -fill \#FFFFFF30 -draw 'circle 50,43,50,81' \) "

CMD+=" -append \) "

for C in ${COLORS[*]}
do
    CMD+=" \( "
    # the player pieces, including "hidden"
    for P in ' ' F M S P
    do
	CMD+=" \( canvas:none -stroke black -fill \#${C} -draw 'circle 50,43 50,81' -stroke black -strokewidth 2 -fill black -draw 'text 0,0 "${P}"' \) "
    done
    # the player board "hand" icon
    CMD+=" \( canvas:none -stroke none -background \#000001 \
       -fill \#924018 -draw 'roundrectangle 0,0,99,86 15,15' \
       -fill \#000001 -draw 'rectangle 10,20,89,30' \
       -fill \#000001 -draw 'rectangle 10,56,89,66' \
       -stroke black -fill \#${C} -draw 'circle 50,43 50,81' \
       -transparent \#000001 \) "
    # the player board "pool" icon
    CMD+=" \( canvas:none -stroke none -background \#000001 \
       -stroke black -fill \#${C} -draw 'circle 31,30 51,43' \
       -stroke black -fill \#${C} -draw 'circle 50,60 70,73' \
       -stroke black -fill \#${C} -draw 'circle 69,30 89,43' \
       -transparent \#000001 \) "
    CMD+="-append \) "
done

echo magick -size ${SIZE} -pointsize 36 -gravity center "${CMD}" +append img/pieces.png | bash -s

# cities
for P in M S P MS MP SP MSP
do
    CMD+=" \( canvas:none -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'roundrectangle 16,22 83,64 5,5' -stroke white -strokewidth 2 -fill white -draw 'text 0,0 \""${P}"\"' \) "
done

#fields
for P in F5 F6 F7 FX
do
   CMD+=" \( canvas:none -stroke none -fill \#667313 -draw 'polygon ${HEX}' -stroke black -strokewidth 2 -fill blue -draw 'text 0,0 \""${P}"\"' \) "
done

# ziggurat
CMD+=" \( canvas:none -stroke none -fill \#924018 -draw 'polygon ${ZIG}' \) "

# echo magick -size ${SIZE} -pointsize 28 -gravity center "${CMD}" -append img/cities.png | bash -s

# now the stand

echo magick -size 800x100 -gravity center canvas:none -stroke none -background black \
       -fill \#924018 -draw 'roundrectangle 0,0,799,99 15,15' \
       -fill black -draw 'rectangle 15,25,784,35' \
       -fill black -draw 'rectangle 15,65,784,75' \
       -transparent black \
       +append img/stand.png > /dev/null
