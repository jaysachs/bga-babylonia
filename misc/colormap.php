<?php

include 'gameinfos.inc.php';

function totranslate() { }

echo "const colorIndexMap: Record<string, number> = {\n";
foreach ($gameinfos["player_colors"] as $i => $color) {
    echo "  \"{$color}\": {$i},\n";
}
echo "};\n";
?>
