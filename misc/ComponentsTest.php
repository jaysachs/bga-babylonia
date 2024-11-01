<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

use Bga\Games\babylonia\{
    Components,
    ZigguratCard,
    ZigguratCardType
};

final class ComponentsTest extends TestCase
{
    private function typesOf(array /* ZigguratCard */ $cards): array /* ZigguratCardType */ {
        return array_values(array_map(function ($z) { return $z->type; }, $cards));
    }

    private function filteredTypes(array /* ZigguratCardtype */ $types, array $to_remove): array /* ZigguratCardType */ {
        return array_values(array_diff($types, $to_remove));
    }

    public function testBasic(): void
    {
        $comp = Components::forNewGame(false);
        $this->assertEquals($comp->allZigguratCards(),
                            $comp->availableZigguratCards());
        $this->assertEquals(ZigguratCardType::sevenTypes(),
                            $this->typesOf($comp->allZigguratCards()));
        $this->assertEquals([],
                            $comp->zigguratCardsOwnedBy(1));
    }

    private function allTypesExcept(array $to_remove): array /* ZigguratCardType */ {
        $res = [];
        foreach (ZigguratCardType::sevenTypes() as $zt) {
            if (!in_array($zt, $to_remove)) {
                $res[] = $zt;
            }
        }
        return $res;
    }

    public function testOwnership(): void {
        $comp = Components::forNewGame(false);
        $this->assertEquals([], $comp->zigguratCardsOwnedBy(1));
        $c1 = $comp->takeCard(1, ZigguratCardType::EXTRA_TURN);
        $this->assertEquals(new ZigguratCard(ZigguratCardType::EXTRA_TURN, 1, false),
                            $c1);
        $this->assertEquals(
            $this->typesOf($comp->availableZigguratCards()),
            $this->allTypesExcept([ ZigguratCardType::EXTRA_TURN ]));
        $c2 = $comp->takeCard(2, ZigguratCardType::NOBLES_IN_FIELDS);
        $c3 = $comp->takeCard(1, ZigguratCardType::NOBLES_3_KINDS);
        $this->assertEquals(
            $this->allTypesExcept([ $c1->type, $c2->type, $c3->type ]),
            $this->typesOf($comp->availableZigguratCards()));
        $this->assertEqualsCanonicalizing(
            [ ZigguratCardType::EXTRA_TURN, ZigguratCardType::NOBLES_3_KINDS ],
            $this->typesOf($comp->zigguratCardsOwnedBy(1)));
    }
}
