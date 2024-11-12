#
STATS=modules/php/Stats.php

$(STATS): local/genstats.php
	php local/genstats.php babylonia > modules/php/Stats.php

test: $(STATS)
	phpunit --bootstrap misc/autoload.php misc --testdox --display-warnings --display-deprecations

deploy: test
	./local/bgasync.sh
