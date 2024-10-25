#!/bin/zsh

CMD=
for C in 1 2 3 4 5 6 7 8 9
do
  CMD+=" \( canvas:none -stroke none -fill \#BBBBBB -draw 'rectangle 0,0 99,149' -stroke black -strokewidth 2 -fill black -draw 'text 0,0 "Zig_${C}"' \) "
done

CMD+=" \( canvas:none -stroke none -fill \#DDDDDD -draw 'rectangle 0,0 99,149' \) "

echo magick -size 100x150 -pointsize 24 -gravity center ${CMD} +append ziggurats.png
