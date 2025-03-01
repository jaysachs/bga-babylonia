
#
ROOT=$(HOME)/projects/bga
SYNC=$(ROOT)/bgautil/sync/bgasync.sh

STATS=modules/php/Stats.php
GENSTATS=../bgautil/genstats/genstats.php
WORK=work
STUBS=$(WORK)/module/table/table.game.php
PSALM_CONFIG=psalm.xml
JS=babylonia.js
COLORMAP=src/colormap.ts

$(WORK):
	mkdir $(WORK)

$(COLORMAP): misc/colormap.php gameinfos.inc.php
	php misc/colormap.php > $(COLORMAP)

$(STUBS): $(WORK) _ide_helper.php Makefile
	mkdir -p $(WORK)/module/table
	perl -p -e 's/  exit/\/\/ exit/;' -e 's/APP_GAMEMODULE_PATH = ""/APP_GAMEMODULE_PATH = "work\/"/' _ide_helper.php > $(STUBS)

$(STATS): $(GENSTATS) stats.json
	php $(GENSTATS) babylonia > modules/php/Stats.php

build: $(STATS) $(COLORMAP)
	npm run build:ts

test: build $(STUBS)
	phpunit --bootstrap misc/autoload.php misc --testdox --display-warnings --display-deprecations --display-notices

deploy: test
	$(SYNC) -u vagabond -g babylonia -s $(ROOT)/babylonia

psalm: build $(STUBS) $(PSALM_CONFIG)
	psalm -c $(PSALM_CONFIG) modules/php

psalm-info: build $(STUBS) $(PSALM_CONFIG)
	psalm --show-info=true -c $(PSALM_CONFIG) modules/php

stubs: $(STUBS)

clean:
	rm -rf $(WORK)
