<?php
namespace PHPUnit\Framework {
    class TestCase {
        protected function expectException(mixed $e): void { }
        protected function assertNull(mixed $a): void { }
        protected function assertTrue(bool $t): void { }
        protected function assertFalse(bool $t): void { }
        protected function assertSame(mixed $a, mixed $b): void { }
        protected function assertEquals(mixed $a, mixed $b): void { }
        protected function assertEqualsCanonicalizing(mixed $a, mixed $b): void { }
    }
}
