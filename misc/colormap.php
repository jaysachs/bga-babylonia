<?php

$gs = file_get_contents('gameinfos.jsonc');
$gs = preg_replace('/\s\/\/.*\n/m','', $gs);
$gs = preg_replace('/\/\*.*\*\//ms', '', $gs);
$gs = preg_replace('/\'/','"', $gs);

$gameinfos = json_decode($gs);

echo "export const colorIndexMap: Record<string, number> = {\n";
foreach ($gameinfos->{"player_colors"} as $i => $color) {
    $j = $i + 1;
    echo "  \"{$color}\": {$j},\n";
}
echo "};\n";
?>
