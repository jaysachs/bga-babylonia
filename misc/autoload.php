<?php

require_once('work/module/table/table.game.php');

spl_autoload_register(function ($class) {
    if (str_starts_with($class, 'Bga\\Games\\babylonia\\')) {
        $file = 'modules/php/' . substr($class, 20) . '.php';
        if (file_exists($file)) {
            require $file;
            return true;
        }
    }
    return false;
});
