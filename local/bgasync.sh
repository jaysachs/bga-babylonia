#!/usr/local/bin/bash

GAME=babylonia
USER=vagabond
SRC="$HOME/projects/bga/babylonia"
DEST=${GAME}


DRY_RUN=
#DRY_RUN=--dry-run

LAST_SYNC=.last_sync
HOST=sftp://${USER}:@1.studio.boardgamearena.com:2022

EXCLUDES='(((local/|\.|.*#).*)|LICENSE_BGA|_ide_helper.php)'

function lftp_via_sync() {
    COPY="lftp ${HOST}"
    TOUCH="touch ${LAST_SYNC}"
    if [ "${DRY_RUN}" == --dry-run ];
    then
        COPY=cat
        TOUCH=true
    fi
    declare -a files
    readarray -t files < \
              <(find -E -X . -newer ${LAST_SYNC} -not -regex ^./"${EXCLUDES}" -type f)
    echo mput -O "${DEST}" -d "${files[@]}" | ${COPY} && ${TOUCH}
}

function lftp_mirror() {
    REPEAT=$1
    lftp "${HOST}" <<EOF
cd ${DEST}
${REPEAT} mirror ${DRY_RUN} -R -vvv -x ^'${EXCLUDES}'
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
