#!/bin/bash

GAME=babylonia
USER=vagabond

LAST_SYNC=.last_sync
HOST=sftp://${USER}:@1.studio.boardgamearena.com:2022
SRC="$HOME/projects/bga/babylonia"
DEST=${GAME}

REPEAT="repeat -d 1m -c 60"
REPEAT=
EXCLUDES=

function lftp_via_newer() {
    (
        echo "mput -O ${DEST} -d";
        find -X * -newer ${LAST_SYNC} -not -path local/\* -not -path .\* -not -path \*\#\* -not -path LICENSE_BGA -not -path _ide_helper.php -type f
    ) | xargs echo | lftp "${HOST}" && touch "${LAST_SYNC}"
}

function lftp_mirror() {
    REPEAT=$1
    lftp "${HOST}" <<EOF
cd "${DEST}"
${REPEAT} mirror -R -vvv -X .git/* -X .* -X .phpunit.cache/* -X local/* -X*#* -X LICENSE_BGA -X _ide_helper.php
EOF
}

function lftp_via_periodic_mirror() {
    lftp_mirror "repeat -d 1m -c 60"
}

function lftp_via_mirror() {
    lftp_mirror ""
}


MODE=-sync
if [[ "$#" > 1 ]];
then
    echo "usage: $0 [ -mirror | -sync ]"
    exit 1
fi
if [[ "$#" > 0 ]];
then
    case "$1" in
        -mirror|-sync)
            MODE="$1"
            ;;
        *)
            echo "Unknown mode $1"
            exit 1
            ;;
    esac
fi


cd "${SRC}"

case "$MODE" in
    -mirror)
        lftp_via_mirror
        ;;
    -sync)
        lftp_via_sync
        ;;
esac
