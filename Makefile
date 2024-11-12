#
stats: modules/php/Stats.php
	php local/genstats.php babylonia > modules/php/Stats.php

test: stats
	phpunit --bootstrap misc/autoload.php misc --testdox --display-warnings --display-deprecations

deploy: test
	./local/bgasync.sh
