#
GAME=babylonia
SFTP=sftp://vagabond:@1.studio.boardgamearena.com:2022

STATS=modules/php/Stats.php
GENSTATS=../bgautil/genstats/genstats.php
WORK=work
STUBS=$(WORK)/module/table/table.game.php
TS_STUBS=src/bga-framework.d.ts
JS=modules/js/Game.js
COLORMAP=src/colormap.ts
PHPSTAN_LEVEL=10

.PHONY: build test phpstan deploy clean

build: $(JS) $(STUBS) $(STATS)

$(JS): $(COLORMAP) src/*.ts tsconfig.json $(TS_STUBS)
	npm run build:ts

$(STATS): $(GENSTATS) stats.json Makefile
	php $(GENSTATS) $(GAME)  > $(STATS)

$(COLORMAP): misc/colormap.php gameinfos.inc.php
	php misc/colormap.php > $(COLORMAP)

$(WORK):
	mkdir $(WORK)

$(TS_STUBS): bga-framework.d.ts
	cp bga-framework.d.ts $(TS_STUBS)

$(STUBS): $(WORK) _ide_helper.php Makefile
	mkdir -p $(WORK)/module/table
	perl -p -e 's/type_arg=null,/type_arg,/;' -e 's/  exit/\/\/ exit/;' -e 's/APP_GAMEMODULE_PATH = ""/APP_GAMEMODULE_PATH = "work\/"/;' -e 's/{}\(\)\;/{}\;/;' _ide_helper.php > $(STUBS)

test: build
	phpunit --bootstrap misc/autoload.php misc --testdox

phpstan: build $(STUBS)
	phpstan --autoload-file=$(STUBS) --level=$(PHPSTAN_LEVEL) --memory-limit=1G analyse modules/php modules/php/Utils modules/php/States misc/test/php

deploy: test
	lftp -e 'cd $(GAME); mirror -e -R --exclude .vscode/ --exclude .git/ --exclude work/ --exclude local/ --exclude bga-framework.d.ts --exclude .phpunit* --exclude node_modules*/ --exclude _ide_helper.php; exit' $(SFTP)

clean:
	rm -rf $(WORK) $(TS_STUBS) $(JS) $(COLORMAP) $(STATS)
