#
GAME=babylonia
SFTP=sftp://vagabond:@1.studio.boardgamearena.com:2022

STATS=modules/php/Stats.php
GENSTATS=../bgautil/genstats/genstats.php
TS_STUBS=src/bgalibs/bga-framework.d.ts
JS=modules/js/Game.js
PHPSTAN_LEVEL=10

.PHONY: build test phpstan deploy clean pull-boilerplate sprites quick-deploy

$(JS): src/**/*.ts src/*.ts tsconfig.json $(TS_STUBS)
	NO_COLOR=true npm run build:ts

$(STATS): $(GENSTATS) stats.jsonc Makefile
	php $(GENSTATS) $(GAME)  > $(STATS)

$(TS_STUBS): bga-framework.d.ts
	cp bga-framework.d.ts $(TS_STUBS)

build: $(JS) $(STATS) sprites

test: build
	phpunit --bootstrap misc/autoload.php misc --testdox

phpstan: build
	phpstan --autoload-file=_ide_helper.php --level=$(PHPSTAN_LEVEL) --memory-limit=1G analyse modules/php modules/php/Utils modules/php/Model modules/php/States misc/test/php

deploy: test
	lftp -e 'cd $(GAME); mirror -e -R --exclude .vscode/ --exclude .git/ --exclude local/ --exclude bga-framework.d.ts --exclude .phpunit* --exclude node_modules*/ --exclude _ide_helper.php; exit' $(SFTP)

quick-deploy: test
	lftp -e 'cd $(GAME); put -O modules/js modules/js/Game.js; put babylonia.css; exit' $(SFTP)

pull-boilerplate:
	lftp -e 'cd $(GAME); set xfer:clobber true; get _ide_helper.php; get bga-framework.d.ts; exit' $(SFTP)

clean:
	rm -rf $(TS_STUBS) $(JS) $(STATS) img/pieces.png img/zcards.png

sprites: img/pieces.png img/zcards.png

IMGSRCDIR=misc/img
PIECEIMGSRCS=$(IMGSRCDIR)/P-*-*.png $(IMGSRCDIR)/Ziggurat-*.png $(IMGSRCDIR)/City-*.png $(IMGSRCDIR)/Crop-*.png
img/pieces.png: $(PIECEIMGSRCS)
	magick montage -background transparent -tile 6x7 -geometry 200x173+0+0 $(PIECEIMGSRCS) img/pieces.png

ZCARDIMGSRCS=$(IMGSRCDIR)/zcard-*.png
img/zcards.png: $(ZCARDIMGSRCS)
	magick montage -background transparent -tile 9x1 -geometry 330x530+0+0 $(ZCARDIMGSRCS) img/zcards.png
