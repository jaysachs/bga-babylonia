#!/bin/bash

LAST_SYNC=.last_sync
HOST=sftp://vagabond:@1.studio.boardgamearena.com:2022
SRC="$HOME/projects/bga/babylonia"
DEST=babylonia

REPEAT="repeat -d 1m -c 60"
REPEAT=
EXCLUDES=
function lftp_via_newer() {
    (
        echo "mput -O ${DEST} -d";
        find -X * -newer ${LAST_SYNC} -not -path local/\* -not -path .\* -not -path \*\#\* -not -path LICENSE_BGA -not -path _ide_helper.php -type f
    ) | xargs echo | lftp "${HOST}" && touch "${LAST_SYNC}"
}

function lftp_via_mirror() {
    lftp "${HOST}" <<EOF
cd "${DEST}"
${REPEAT} mirror -R -vvv -X .git/* -X .* -X .phpunit.cache/* -X local/* -X*#* -X LICENSE_BGA -X _ide_helper.php
EOF
}


MODE=newer
if [[ "$#" > 1 ]];
then
    echo "Arguments must be 'newer' or 'mirror'"
    exit 1
fi
if [[ "$#" > 0 ]];
then
    case "$1" in
        newer|mirror)
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
    mirror)
        lftp_via_mirror
        ;;
    newer)
        lftp_via_newer
        ;;
esac
