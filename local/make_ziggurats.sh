#!/bin/zsh

CMD=
for C in 10pts xturn hand7 3nobles 3farmers fields citypts land river
do
  CMD+=" \( canvas:none -stroke none -fill \#D6C6B5 -draw 'rectangle 0,0 99,149' -stroke black -strokewidth 2 -fill black -draw 'text 0,0 \""${C}"\"' \) "
done

CMD+=" \( canvas:none -stroke none -fill \#867665 -draw 'rectangle 0,0 99,149' \) "

echo magick -size 100x150 -pointsize 24 -gravity center ${CMD} +append ziggurats.png | bash -s
