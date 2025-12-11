<?php

require_once('work/test/module/table/table.game.php');

spl_autoload_register(function ($class) {
    $prefix = 'Bga\\Games\\babylonia\\';
    if (str_starts_with($class, $prefix)) {
        $file = 'modules/php/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (file_exists($file)) {
            require $file;
            return true;
        }
    }
    return false;
});
