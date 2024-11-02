#!/bin/bash

HEX="0,43 24,0 74,0 99,43 74,86 24,86"

# tile back
CMD="\( canvas:none -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' \) "

# cities
for P in M S P MS MP SP MSP ' '
do
    CMD+=" \( canvas:none -stroke none -fill \#D6C6B5 -draw 'polygon ${HEX}' -fill \#212575 -draw 'roundrectangle 16,22 83,64 5,5' -stroke white -strokewidth 2 -fill white -draw 'text 0,0 \""${P}"\"' \) "
done

#fields
for P in F5 F6 F7 FX
do
   CMD+=" \( canvas:none -stroke none -fill green -draw 'polygon ${HEX}' -stroke black -strokewidth 2 -fill blue -draw 'text 0,0 \""${P}"\"' \) "
done

# ziggurat
CMD+=" \( canvas:none -stroke none -fill red -draw 'polygon 20,43 32,43 32,33 44,33 44,23 56,23 56,33 68,33 68,43 80,43 80,53 92,53 92,63 8,63 8,53 20,53' \) "

echo magick -size 100x87 -pointsize 28 -gravity center "${CMD}" -append cities.png | bash -s
