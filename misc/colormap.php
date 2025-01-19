<?php

include 'gameinfos.inc.php';

function totranslate() { }

echo "const colorIndexMap: Record<string, number> = {\n";
foreach ($gameinfos["player_colors"] as $i => $color) {
    $j = $i + 1;
    echo "  \"{$color}\": {$j},\n";
}
echo "};\n";
?>
