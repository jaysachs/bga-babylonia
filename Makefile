#
STATS=modules/php/Stats.php
GENSTATS=../bgautil/genstats/genstats.php

$(STATS): $(GENSTATS) stats.json
	php $(GENSTATS) babylonia > modules/php/Stats.php

test: $(STATS)
	phpunit --bootstrap misc/autoload.php misc --testdox --display-warnings --display-deprecations --display-notices

deploy: test
	./local/bgasync.sh
