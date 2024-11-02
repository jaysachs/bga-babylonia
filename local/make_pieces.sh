#!/bin/zsh

CMD=
for C in FFFFFF 88DDDD DD00DD EED8AE
do
    CMD+=" \( "
    for P in ' ' F M S P
    do
	CMD+=" \( canvas:none -stroke black -fill \#${C} -draw 'circle 50,50 50,99' -stroke black -strokewidth 2 -fill black -draw 'text 0,0 "${P}"' \) "
    done
    CMD+="-append \) "
done

# echo magick -size 100x100 -pointsize 36 -gravity center "${CMD}" +append pieces.png | bash -s

# now the stand

magick -size 800x100 -gravity center canvas:none -stroke none -background black \
       -fill \#924018 -draw 'roundrectangle 0,0,799,99 15,15' \
       -fill black -draw 'rectangle 15,23,784,37' \
       -fill black -draw 'rectangle 15,63,784,77' \
       -transparent black \
       +append stand.png
