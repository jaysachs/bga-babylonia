#!/bin/bash

HOST=sftp://vagabond:@1.studio.boardgamearena.com:2022
SRC="$HOME/projects/bga/babylonia"
DEST=babylonia
REPEAT="repeat -d 1m -c 60"
REPEAT=

cd "${SRC}"
lftp "${HOST}" <<EOF
cd "${DEST}"
${REPEAT} mirror -R -vvv -X .git/* -X local/* -X*#* -X LICENSE_BGA -X _ide_helper.php
EOF
