phantom.injectJs("just.js");
phantom.injectJs("mock.js");
phantom.injectJs("../content/overlay.js");

JUST.testCase({
  setup: function(){
    kcif.item_list = {1: {"name": "アイテム1"}, 2: {"name": "アイテム2"}, 3: {"name": "応急修理要員", item_id: 42}, 4: {"name": "応急修理女神", item_id: 43}};
    kcif.ship_list = {100: {"name": "明石", type: 19}};
    kcif.ship_master = {100: {"name": "テスト100", type: 2}};
  },

  testTime2str: function(){
    var dt = new Date();
    assertEqual(dt.toLocaleFormat("%H:%M"), time2str(dt));
    dt.setDate(dt.getDate() + 1 > 29 ? 1 : dt.getDate() + 1);
    assertEqual(dt.toLocaleFormat("%m/%d %H:%M"), time2str(dt));
  },

  testGetTimeColor: function(){
    var dt = new Date(new Date().getTime() - 500);
    assertEqual("color-red", getTimeColor(dt));
    dt = new Date();
    assertEqual("color-red", getTimeColor(dt));
    dt = new Date(new Date().getTime() + 500);
    assertEqual("color-orange", getTimeColor(dt));
    dt = new Date(new Date().getTime() + 59500);
    assertEqual("color-orange", getTimeColor(dt));
    dt = new Date(new Date().getTime() + 60500);
    assertEqual("color-yellow", getTimeColor(dt));
    dt = new Date(new Date().getTime() + 5 * 60000 - 500);
    assertEqual("color-yellow", getTimeColor(dt));
    dt = new Date(new Date().getTime() + 5 * 60000 + 500);
    assertEqual("color-default", getTimeColor(dt));
    dt = new Date(0);
    assertEqual("color-red", getTimeColor(dt));
  },

  testHash2str: function(){
    var hash = {};
    assertEqual("", hash2str(hash));
    hash["a"] = 123;
    assertEqual("a=123", hash2str(hash));
    hash["b"] = "abc";
    assertMatch(/^(?:a=123&b=abc|b=abc&a=123)$/, hash2str(hash));
  },

  testShipType: function(){
    var ship = {
      type: 0
    };
    assertMatch(/^<td class="ship-type">.*?<\/td>$/, shipType(ship));
  },

  testShipName: function(){
    var ship = {
      ship_id: 1,
      name: "テスト1",
      slot: []
    };
    assertMatch(/^<td class="ship-name">テスト1<\/td>$/, shipName(ship));
    ship.slot = [1];
    assertMatch(/^<td class="ship-name" title="アイテム1">テスト1<\/td>$/, shipName(ship));
    ship.slot = [2, 1];
    assertMatch(/^<td class="ship-name" title="アイテム2, アイテム1">テスト1<\/td>$/, shipName(ship));
  },

  testShipLevel: function(){
    var ship = {
      p_level: 1,
      level: 1,
      afterlv: 3,
      aftershipid: 100,
    };
    assertMatch(/^<td class="ship-level(?: color-default)?" title="LV3 .*?">1<\/td>$/, shipLevel(ship));
    ship.level = 2;
    assertMatch(/^<td class="ship-level(?: color-default)? blink" title="LV3 .*?">2<\/td>$/, shipLevel(ship));
    ship.p_level = 3;
    ship.level = 3;
    assertMatch(/^<td class="ship-level color-green" title="改造後 テスト100\(駆逐\)">3<\/td>$/, shipLevel(ship));
  },

  testShipHp: function(){
    var ship = {
      p_hp: 10,
      hp: 10,
      hp_max: 10,
    };
    assertMatch(/^<td class="ship-hp color-green">10\/10<\/td>$/, shipHp(ship));
    ship.hp = 9;
    assertMatch(/^<td class="ship-hp(?: color-default)? blink">9\/10<\/td>$/, shipHp(ship));
    ship.p_hp = ship.hp;
    assertMatch(/^<td class="ship-hp(?: color-default)?">9\/10<\/td>$/, shipHp(ship));
    ship.hp = 8;
    assertMatch(/^<td class="ship-hp(?: color-default)? blink">8\/10<\/td>$/, shipHp(ship));
    ship.hp = 7;
    assertMatch(/^<td class="ship-hp color-yellow blink">7\/10<\/td>$/, shipHp(ship));
    ship.hp = 6;
    assertMatch(/^<td class="ship-hp color-yellow blink">6\/10<\/td>$/, shipHp(ship));
    ship.hp = 5;
    assertMatch(/^<td class="ship-hp color-orange blink">5\/10<\/td>$/, shipHp(ship));
    ship.hp = 3;
    assertMatch(/^<td class="ship-hp color-orange blink">3\/10<\/td>$/, shipHp(ship));
    ship.hp = 2;
    assertMatch(/^<td class="ship-hp color-red blink">2\/10<\/td>$/, shipHp(ship));
    ship.hp = 0;
    assertMatch(/^<td class="ship-hp color-gray blink">0\/10<\/td>$/, shipHp(ship));
    ship.hp = -1;
    assertMatch(/^<td class="ship-hp color-gray blink">0\/10<\/td>$/, shipHp(ship));
  },

  testShipCond: function(){
    var ship = {
      p_cond: 49,
      cond: 49,
    };
    assertMatch(/^<td class="ship-cond(?: color-default)?">49<\/td>$/, shipCond(ship));
    ship.cond = 50;
    assertMatch(/^<td class="ship-cond color-green blink">50<\/td>$/, shipCond(ship));
    ship.p_cond = ship.cond;
    assertMatch(/^<td class="ship-cond color-green">50<\/td>$/, shipCond(ship));
    ship.cond = 100;
    assertMatch(/^<td class="ship-cond color-green blink">100<\/td>$/, shipCond(ship));
    ship.cond = 40;
    assertMatch(/^<td class="ship-cond(?: color-default)? blink">40<\/td>$/, shipCond(ship));
    ship.cond = 39;
    assertMatch(/^<td class="ship-cond color-yellow blink">39<\/td>$/, shipCond(ship));
    ship.cond = 30;
    assertMatch(/^<td class="ship-cond color-yellow blink">30<\/td>$/, shipCond(ship));
    ship.cond = 29;
    assertMatch(/^<td class="ship-cond color-orange blink">29<\/td>$/, shipCond(ship));
    ship.cond = 20;
    assertMatch(/^<td class="ship-cond color-orange blink">20<\/td>$/, shipCond(ship));
    ship.cond = 19;
    assertMatch(/^<td class="ship-cond color-red blink">19<\/td>$/, shipCond(ship));
    ship.cond = 0;
    assertMatch(/^<td class="ship-cond color-red blink">0<\/td>$/, shipCond(ship));
  },

  testShipFuel: function(){
    var ship = {
      p_fuel: 100,
      fuel: 100,
      fuel_max: 100,
    };
    assertMatch(/^<td class="ship-fuel color-green" title="100\/100">100%<\/td>$/, shipFuel(ship));
    ship.fuel = 99;
    assertMatch(/^<td class="ship-fuel color-yellow blink" title="99\/100">99%<\/td>$/, shipFuel(ship));
    ship.p_fuel = ship.fuel;
    assertMatch(/^<td class="ship-fuel color-yellow" title="99\/100">99%<\/td>$/, shipFuel(ship));
    ship.fuel = 50;
    assertMatch(/^<td class="ship-fuel color-yellow blink" title="50\/100">50%<\/td>$/, shipFuel(ship));
    ship.fuel = 49;
    assertMatch(/^<td class="ship-fuel color-orange blink" title="49\/100">49%<\/td>$/, shipFuel(ship));
    ship.fuel = 1;
    assertMatch(/^<td class="ship-fuel color-orange blink" title="1\/100">1%<\/td>$/, shipFuel(ship));
    ship.fuel = 0;
    assertMatch(/^<td class="ship-fuel color-red blink" title="0\/100">0%<\/td>$/, shipFuel(ship));
    ship.fuel = ship.p_fuel = 50;
    ship.fuel_max = 99;
    assertMatch(/^<td class="ship-fuel color-yellow" title="50\/99">50%<\/td>$/, shipFuel(ship));
    ship.fuel = ship.p_fuel = 49;
    ship.fuel_max = 99;
    assertMatch(/^<td class="ship-fuel color-orange" title="49\/99">49%<\/td>$/, shipFuel(ship));
  },

  testShipBull: function(){
    var ship = {
      p_bull: 100,
      bull: 100,
      bull_max: 100,
    };
    assertMatch(/^<td class="ship-bull color-green" title="100\/100">100%<\/td>$/, shipBull(ship));
    ship.bull = 99;
    assertMatch(/^<td class="ship-bull color-yellow blink" title="99\/100">99%<\/td>$/, shipBull(ship));
    ship.p_bull = ship.bull;
    assertMatch(/^<td class="ship-bull color-yellow" title="99\/100">99%<\/td>$/, shipBull(ship));
    ship.bull = 50;
    assertMatch(/^<td class="ship-bull color-yellow blink" title="50\/100">50%<\/td>$/, shipBull(ship));
    ship.bull = 49;
    assertMatch(/^<td class="ship-bull color-orange blink" title="49\/100">49%<\/td>$/, shipBull(ship));
    ship.bull = 1;
    assertMatch(/^<td class="ship-bull color-orange blink" title="1\/100">1%<\/td>$/, shipBull(ship));
    ship.bull = 0;
    assertMatch(/^<td class="ship-bull color-red blink" title="0\/100">0%<\/td>$/, shipBull(ship));
    ship.bull = ship.p_bull = 50;
    ship.bull_max = 99;
    assertMatch(/^<td class="ship-bull color-yellow" title="50\/99">50%<\/td>$/, shipBull(ship));
    ship.bull = ship.p_bull = 49;
    ship.bull_max = 99;
    assertMatch(/^<td class="ship-bull color-orange" title="49\/99">49%<\/td>$/, shipBull(ship));
  },

  testCompareShip: function(){
    var a = {
      api_id: 1,
      type: 3,
      sort_no: 1,
      level: 2,
      hp: 10,
      hp_max: 10,
      cond: 49,
    };
    var b = {
      api_id: 2,
      type: 2,
      sort_no: 2,
      level: 1,
      hp: 9,
      hp_max: 10,
      cond: 50,
    };

    kcif.sort_ships = "no+";
    assert(compareShip(a, b) < 0);

    kcif.sort_ships = "no-";
    assert(compareShip(a, b) > 0);

    kcif.sort_ships = "type+";
    assert(compareShip(a, b) > 0);

    kcif.sort_ships = "type-";
    assert(compareShip(a, b) < 0);

    kcif.sort_ships = "name+";
    assert(compareShip(a, b) < 0);

    kcif.sort_ships = "name-";
    assert(compareShip(a, b) > 0);

    kcif.sort_ships = "level+";
    assert(compareShip(a, b) > 0);

    kcif.sort_ships = "level-";
    assert(compareShip(a, b) < 0);

    kcif.sort_ships = "hp+";
    assert(compareShip(a, b) > 0);

    kcif.sort_ships = "hp-";
    assert(compareShip(a, b) < 0);

    kcif.sort_ships = "cond+";
    assert(compareShip(a, b) < 0);

    kcif.sort_ships = "cond-";
    assert(compareShip(a, b) > 0);
  },

  testReflectDamage: function(){
    var ship = {
      hp: 10,
      hp_max: 20,
      slot: [-1, -1, -1, -1, -1],
    };
    reflectDamage(ship, 5);
    assertEqual(5, ship.hp);
    reflectDamage(ship, 3);
    assertEqual(2, ship.hp);
    reflectDamage(ship, 3);
    assertEqual(0, ship.hp);

    ship.hp = 2;
    ship.slot = [1, 3, 2, -1, -1]
    reflectDamage(ship, 3);
    assertEqual(4, ship.hp);
    assertEqual([1, 2, -1, -1, -1], ship.slot);

    ship.hp = 2;
    ship.slot = [1, 4, 2, -1, -1]
    reflectDamage(ship, 3);
    assertEqual(20, ship.hp);
    assertEqual([1, 2, -1, -1, -1], ship.slot);

    // enemy
    var ship = {
      hp: 10,
      hp_max: 20,
    };
    reflectDamage(ship, 5);
    assertEqual(5, ship.hp);
  },

  testUpdateRepairStart: function(){
    kcif.repair_start = [null, null, null, null];
    kcif.deck_list[0] = {
      api_ship: [100, -1, -1, -1, -1, -1, -1],
    };
    refute(kcif.repair_start[0]);
    updateRepairStart(0);
    assert(true, !!kcif.repair_start[0]);
    kcif.deck_list[0].api_ship[0] = 101;
    updateRepairStart(0);
    refute(kcif.repair_start[0]);
    kcif.deck_list[0].api_ship[1] = 100;
    updateRepairStart(0);
    refute(kcif.repair_start[0]);
  },
});
