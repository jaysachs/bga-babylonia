#!/bin/zsh

CMD=
for C in FFFFFF 88DDDD DD00DD EED8AE
do
    CMD+=" \( "
    for P in ' ' F M S P
    do
	CMD+=" \( canvas:none -stroke none -fill \#${C} -draw 'circle 50,50 50,99' -stroke black -strokewidth 2 -fill black -draw 'text 0,0 "${P}"' \) "
    done
    CMD+="-append \) "
done

echo magick -size 100x100 -pointsize 36 -gravity center ${CMD} +append pieces.png

