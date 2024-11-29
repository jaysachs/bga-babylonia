#
STATS=modules/php/Stats.php
GENSTATS=../bgautil/genstats/genstats.php
WORK=work
STUBS=$(WORK)/module/table/table.game.php
PSALM_CONFIG=psalm.xml

$(WORK):
	mkdir $(WORK)

$(STUBS): $(WORK) _ide_helper.php Makefile
	mkdir -p $(WORK)/module/table
	perl -p -e 's/  exit/\/\/ exit/;' -e 's/APP_GAMEMODULE_PATH = ""/APP_GAMEMODULE_PATH = "work\/"/' _ide_helper.php > $(STUBS)

$(STATS): $(GENSTATS) stats.json
	php $(GENSTATS) babylonia > modules/php/Stats.php

build: $(STATS)

test: build $(STUBS)
	phpunit --bootstrap misc/autoload.php misc --testdox --display-warnings --display-deprecations --display-notices

deploy: test
	./local/bgasync.sh

psalm: build $(STUBS) $(PSALM_CONFIG)
	psalm -c $(PSALM_CONFIG) modules/php

psalm-info: build $(STUBS) $(PSALM_CONFIG)
	psalm --show-info=true -c $(PSALM_CONFIG) modules/php

stubs: $(STUBS)

clean:
	rm -rf $(WORK)
