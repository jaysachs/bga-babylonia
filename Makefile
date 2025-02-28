
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

build: $(STATS) $(COLORMAP)
	npm run build:ts

$(STATS): $(GENSTATS) stats.json
	php $(GENSTATS) babylonia > $(STATS)

$(COLORMAP): misc/colormap.php gameinfos.inc.php
	php misc/colormap.php > $(COLORMAP)

$(WORK):
	mkdir $(WORK)

$(STUBS): $(WORK) _ide_helper.php Makefile
	mkdir -p $(WORK)/module/table
	perl -p -e 's/  exit/\/\/ exit/;' -e 's/APP_GAMEMODULE_PATH = ""/APP_GAMEMODULE_PATH = "work\/"/' _ide_helper.php > $(STUBS)

test: build $(STUBS)
	phpunit --bootstrap misc/autoload.php misc --testdox --display-warnings --display-deprecations --display-notices

psalm: build $(STUBS) $(PSALM_CONFIG)
	psalm -c $(PSALM_CONFIG) modules/php

psalm-info: build $(STUBS) $(PSALM_CONFIG)
	psalm --show-info=true -c $(PSALM_CONFIG) modules/php

deploy: test
	$(SYNC) -u vagabond -g babylonia -s $(ROOT)/babylonia

stubs: $(STUBS)

colormap: $(COLORMAP)

stats: $(STATS)

# TODO: should this remove colormap and stats as well?
clean:
	rm -rf $(WORK)
