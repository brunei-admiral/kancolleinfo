phantom.injectJs("just.js");
phantom.injectJs("mock.js");
phantom.injectJs("../content/overlay.js");
getLogLevel = function(){
  return 0;
};
var meter = true;
getHpByMeter = function(){
  return meter;
};
getFuelByMeter = function(){
  return meter;
};

JUST.testCase({
  setup: function(){
    meter = true;
    kcif.item_list = {1: {"name": "アイテム1"}, 2: {"name": "アイテム2", type: [0, 0, 6]}, 3: {"name": "応急修理要員", item_id: 42}, 4: {"name": "応急修理女神", item_id: 43}};
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
      slot: [],
      equip: [0, 0, 0, 0],
      equip_max: [2, 2, 2, 2],
    };
    assertMatch(/^<td class="ship-name">テスト1<\/td>$/, shipName(ship));
    ship.slot = [1];
    assertMatch(/^<td class="ship-name" title="1: アイテム1">テスト1<\/td>$/, shipName(ship));
    ship.slot = [2, 1];
    assertMatch(/^<td class="ship-name" title="1: アイテム2 \[0\/2\]&#10;2: アイテム1">テスト1<\/td>$/, shipName(ship));
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
    assertMatch(/^<td class="ship-hp-meter color-green">10\/10</, shipHp(ship));
    assertMatch(/class="full"/, shipHp(ship));
    ship.hp = 9;
    assertMatch(/^<td class="ship-hp-meter(?: color-default)? blink" title="直前:10">9\/10</, shipHp(ship));
    assertMatch(/class="little"/, shipHp(ship));
    ship.p_hp = ship.hp;
    assertMatch(/^<td class="ship-hp-meter(?: color-default)?">9\/10</, shipHp(ship));
    assertMatch(/class="little"/, shipHp(ship));
    ship.hp = 8;
    assertMatch(/^<td class="ship-hp-meter(?: color-default)? blink" title="直前:9">8\/10</, shipHp(ship));
    assertMatch(/class="little"/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 7;
    assertMatch(/^<td class="ship-hp-meter color-yellow blink" title="直前:8">7\/10</, shipHp(ship));
    assertMatch(/class="slight"/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 6;
    assertMatch(/^<td class="ship-hp-meter color-yellow blink" title="直前:7">6\/10</, shipHp(ship));
    assertMatch(/class="slight"/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 5;
    assertMatch(/^<td class="ship-hp-meter color-orange blink" title="直前:6">5\/10</, shipHp(ship));
    assertMatch(/class="half"/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 3;
    assertMatch(/^<td class="ship-hp-meter color-orange blink" title="直前:5">3\/10</, shipHp(ship));
    assertMatch(/class="half"/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 2;
    assertMatch(/^<td class="ship-hp-meter color-red blink" title="直前:3">2\/10</, shipHp(ship));
    assertMatch(/class="serious"/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 0;
    assertMatch(/^<td class="ship-hp-meter color-gray blink" title="直前:2">0\/10</, shipHp(ship));
    assertMatch(/class="empty"/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = -1;
    assertMatch(/^<td class="ship-hp-meter color-gray">0\/10</, shipHp(ship));
    assertMatch(/class="empty"/, shipHp(ship));
  },

  testShipHpOld: function(){
    meter = false;
    var ship = {
      p_hp: 10,
      hp: 10,
      hp_max: 10,
    };
    assertMatch(/^<td class="ship-hp color-green">10\/10<\/td>$/, shipHp(ship));
    ship.hp = 9;
    assertMatch(/^<td class="ship-hp(?: color-default)? blink" title="直前:10">9\/10<\/td>$/, shipHp(ship));
    ship.p_hp = ship.hp;
    assertMatch(/^<td class="ship-hp(?: color-default)?">9\/10<\/td>$/, shipHp(ship));
    ship.hp = 8;
    assertMatch(/^<td class="ship-hp(?: color-default)? blink" title="直前:9">8\/10<\/td>$/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 7;
    assertMatch(/^<td class="ship-hp color-yellow blink" title="直前:8">7\/10<\/td>$/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 6;
    assertMatch(/^<td class="ship-hp color-yellow blink" title="直前:7">6\/10<\/td>$/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 5;
    assertMatch(/^<td class="ship-hp color-orange blink" title="直前:6">5\/10<\/td>$/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 3;
    assertMatch(/^<td class="ship-hp color-orange blink" title="直前:5">3\/10<\/td>$/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 2;
    assertMatch(/^<td class="ship-hp color-red blink" title="直前:3">2\/10<\/td>$/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 0;
    assertMatch(/^<td class="ship-hp color-gray blink" title="直前:2">0\/10<\/td>$/, shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = -1;
    assertMatch(/^<td class="ship-hp color-gray">0\/10<\/td>$/, shipHp(ship));
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

  testShipFuelBull: function(){
    var ship = {
      p_fuel: 100,
      fuel: 100,
      fuel_max: 100,
      p_bull: 100,
      bull: 100,
      bull_max: 100,
    };
    assertMatch(/"full"><\/meter><meter /, shipFuelBull(ship));
    ship.fuel = 99;
    assertMatch(/"slight"><\/meter><meter /, shipFuelBull(ship));
    ship.fuel = 51;
    assertMatch(/"slight"><\/meter><meter /, shipFuelBull(ship));
    ship.fuel = 50;
    assertMatch(/"half"><\/meter><meter /, shipFuelBull(ship));
    ship.fuel = 21;
    assertMatch(/"half"><\/meter><meter /, shipFuelBull(ship));
    ship.fuel = 20;
    assertMatch(/"serious"><\/meter><meter /, shipFuelBull(ship));
    ship.fuel = 1;
    assertMatch(/"serious"><\/meter><meter /, shipFuelBull(ship));
    ship.fuel = 0;
    assertMatch(/"empty"><\/meter><meter /, shipFuelBull(ship));
    ship.fuel = ship.p_fuel = 50;
    ship.fuel_max = 99;
    assertMatch(/"slight"><\/meter><meter /, shipFuelBull(ship));
    ship.fuel = ship.p_fuel = 49;
    assertMatch(/"half"><\/meter><meter /, shipFuelBull(ship));

    assertMatch(/"full"><\/meter><\/td>/, shipFuelBull(ship));
    ship.bull = 99;
    assertMatch(/"slight"><\/meter><\/td>/, shipFuelBull(ship));
    ship.bull = 51;
    assertMatch(/"slight"><\/meter><\/td>/, shipFuelBull(ship));
    ship.bull = 50;
    assertMatch(/"half"><\/meter><\/td>/, shipFuelBull(ship));
    ship.bull = 21;
    assertMatch(/"half"><\/meter><\/td>/, shipFuelBull(ship));
    ship.bull = 20;
    assertMatch(/"serious"><\/meter><\/td>/, shipFuelBull(ship));
    ship.bull = 1;
    assertMatch(/"serious"><\/meter><\/td>/, shipFuelBull(ship));
    ship.bull = 0;
    assertMatch(/"empty"><\/meter><\/td>/, shipFuelBull(ship));
    ship.bull = ship.p_bull = 50;
    ship.bull_max = 99;
    assertMatch(/"slight"><\/meter><\/td>/, shipFuelBull(ship));
    ship.bull = ship.p_bull = 49;
    assertMatch(/"half"><\/meter><\/td>/, shipFuelBull(ship));
  },

  testShipFuelBullOld: function(){
    meter = false;
    var ship = {
      p_fuel: 100,
      fuel: 100,
      fuel_max: 100,
      p_bull: 100,
      bull: 100,
      bull_max: 100,
    };
    assertMatch(/^<td class="ship-fuel color-green" title="100\/100">100%<\/td>/, shipFuelBull(ship));
    ship.fuel = 99;
    assertMatch(/^<td class="ship-fuel color-yellow blink" title="99\/100">99%<\/td>/, shipFuelBull(ship));
    ship.p_fuel = ship.fuel;
    assertMatch(/^<td class="ship-fuel color-yellow" title="99\/100">99%<\/td>/, shipFuelBull(ship));
    ship.fuel = 50;
    assertMatch(/^<td class="ship-fuel color-yellow blink" title="50\/100">50%<\/td>/, shipFuelBull(ship));
    ship.fuel = 49;
    assertMatch(/^<td class="ship-fuel color-orange blink" title="49\/100">49%<\/td>/, shipFuelBull(ship));
    ship.fuel = 1;
    assertMatch(/^<td class="ship-fuel color-orange blink" title="1\/100">1%<\/td>/, shipFuelBull(ship));
    ship.fuel = 0;
    assertMatch(/^<td class="ship-fuel color-red blink" title="0\/100">0%<\/td>/, shipFuelBull(ship));
    ship.fuel = ship.p_fuel = 50;
    ship.fuel_max = 99;
    assertMatch(/^<td class="ship-fuel color-yellow" title="50\/99">50%<\/td>/, shipFuelBull(ship));
    ship.fuel = ship.p_fuel = 49;
    ship.fuel_max = 99;
    assertMatch(/^<td class="ship-fuel color-orange" title="49\/99">49%<\/td>/, shipFuelBull(ship));

    assertMatch(/<td class="ship-bull color-green" title="100\/100">100%<\/td>$/, shipFuelBull(ship));
    ship.bull = 99;
    assertMatch(/<td class="ship-bull color-yellow blink" title="99\/100">99%<\/td>$/, shipFuelBull(ship));
    ship.p_bull = ship.bull;
    assertMatch(/<td class="ship-bull color-yellow" title="99\/100">99%<\/td>$/, shipFuelBull(ship));
    ship.bull = 50;
    assertMatch(/<td class="ship-bull color-yellow blink" title="50\/100">50%<\/td>$/, shipFuelBull(ship));
    ship.bull = 49;
    assertMatch(/<td class="ship-bull color-orange blink" title="49\/100">49%<\/td>$/, shipFuelBull(ship));
    ship.bull = 1;
    assertMatch(/<td class="ship-bull color-orange blink" title="1\/100">1%<\/td>$/, shipFuelBull(ship));
    ship.bull = 0;
    assertMatch(/<td class="ship-bull color-red blink" title="0\/100">0%<\/td>$/, shipFuelBull(ship));
    ship.bull = ship.p_bull = 50;
    ship.bull_max = 99;
    assertMatch(/<td class="ship-bull color-yellow" title="50\/99">50%<\/td>$/, shipFuelBull(ship));
    ship.bull = ship.p_bull = 49;
    ship.bull_max = 99;
    assertMatch(/<td class="ship-bull color-orange" title="49\/99">49%<\/td>$/, shipFuelBull(ship));
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
    buf = []
    reflectDamage(buf, 0, ship, 5);
    assertEqual(5, ship.hp);
    assertEqual(5, buf[0]);
    reflectDamage(buf, 0, ship, 3);
    assertEqual(2, ship.hp);
    assertEqual(8, buf[0]);
    reflectDamage(buf, 0, ship, 3);
    assertEqual(0, ship.hp);
    assertEqual(10, buf[0]);

    ship.hp = 2;
    ship.slot = [1, 3, 2, -1, -1]
    reflectDamage(buf, 1, ship, 3);
    assertEqual(4, ship.hp);
    assertEqual([1, 2, -1, -1, -1], ship.slot);
    assertEqual(2, buf[1]);

    ship.hp = 2;
    ship.slot = [1, 4, 2, -1, -1]
    reflectDamage(buf, 2, ship, 3);
    assertEqual(20, ship.hp);
    assertEqual([1, 2, -1, -1, -1], ship.slot);
    assertEqual(2, buf[2]);

    // enemy
    var ship = {
      hp: 10,
      hp_max: 20,
    };
    reflectDamage(null, 0, ship, 5);
    assertEqual(5, ship.hp);
  },

  testJudgeBattleResult: function(){
    assertEqual("SS", judgeBattleResult([{hp: 1}], [{hp: 0}], [0], [1]));
    assertEqual("S", judgeBattleResult([{hp: 1}], [{hp: 0}], [1], [1]));
    assertEqual("A", judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 0}], [1], [0, 1]));
    assertEqual("A", judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 0}, {hp: 0}], [1], [0, 1, 1]));
    assertEqual("A", judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}], [1], [0, 0, 1, 1]));
    assertEqual("A", judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}, {hp: 0}], [1], [0, 0, 1, 1, 1]));
    assertEqual("A", judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}], [1], [0, 0, 1, 1, 1, 1]));
    assertEqual("B", judgeBattleResult([{hp: 1}], [{hp: 0}, {hp: 1}, {hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}], [1], [1, 0, 0, 0, 1, 1]));
    assertEqual("B", judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}, {hp: 0}], [0], [0, 0, 0, 1, 1, 1]));
    assertEqual("C", judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}, {hp: 0}], [1], [0, 0, 0, 1, 1, 1]));
    assertEqual("D", judgeBattleResult([{hp: 1}], [{hp: 1}], [0], [0]));
    assertEqual("B", judgeBattleResult([{hp: 17}, {hp: 19}, {hp: 23}, {hp: 28}, {hp: 22}, {hp: 22}], [{hp: 79}, {hp: 59}, {hp: 27}, {hp: 0}, {hp: 0}, {hp: 0}], [0, 0, 0, 0, 0, 0], [11, 17, 49, 50, 43, 45]));
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

  testGetTimeColor: function(){
    var now = new Date();
    assertEqual("color-red", getTimeColor(now));
    assertEqual("color-red", getTimeColor(now, false));
    assertEqual("color-red", getTimeColor(now, true));

    assertEqual("color-orange", getTimeColor(new Date(now.getTime() + 59 * 1000)));
    assertEqual("color-orange", getTimeColor(new Date(now.getTime() + 59 * 1000), false));
    assertEqual("color-yellow", getTimeColor(new Date(now.getTime() + 59 * 1000), true));

    assertEqual("color-yellow", getTimeColor(new Date(now.getTime() + 61 * 1000)));
    assertEqual("color-yellow", getTimeColor(new Date(now.getTime() + 61 * 1000), false));
    assertEqual("color-yellow", getTimeColor(new Date(now.getTime() + 61 * 1000), true));

    assertEqual("color-yellow", getTimeColor(new Date(now.getTime() + 299 * 1000)));
    assertEqual("color-yellow", getTimeColor(new Date(now.getTime() + 299 * 1000), false));
    assertEqual("color-yellow", getTimeColor(new Date(now.getTime() + 299 * 1000), true));

    assertEqual("color-default", getTimeColor(new Date(now.getTime() + 301 * 1000)));
    assertEqual("color-default", getTimeColor(new Date(now.getTime() + 301 * 1000), false));
    assertEqual("color-default", getTimeColor(new Date(now.getTime() + 301 * 1000), true));
  },

  testMap2str: function(){
    var json = {
      api_maparea_id: 1,
      api_mapinfo_no: 2,
      api_no: 3,
      api_bosscell_no: 5,
      api_enemy: 1, // dummy
    };
    assertEqual("+ 1-2-3", map2str(json));
    json.api_no = 4;
    json.api_enemy = 0;
    assertEqual("- 1-2-4", map2str(json));
    json.api_no = 5;
    json.api_enemy = 1;
    assertEqual("* 1-2-5", map2str(json));
  },

  testFormatMaterial: function(){
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">0</td></tr>', formatMaterial("test", 0, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">999</td></tr>', formatMaterial("test", 999, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-yellow">1000</td></tr>', formatMaterial("test", 1000, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-yellow">299999</td></tr>', formatMaterial("test", 299999, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-red">300000</td></tr>', formatMaterial("test", 300000, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">1000</td></tr>', formatMaterial("test", 1000, 2));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">1249</td></tr>', formatMaterial("test", 1249, 2));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-yellow">1250</td></tr>', formatMaterial("test", 1250, 2));

    assertEqual('<tr><th class="res-name">test</th><td class="res-value">0</td></tr>', formatMaterial("test", 0));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">2999</td></tr>', formatMaterial("test", 2999));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-red">3000</td></tr>', formatMaterial("test", 3000));
  },

  testSeiku2str: function(){
    assertEqual("敵制空値:&#10; 0: 制空権確保&#10; 1～: 制空権喪失", seiku2str(0));
    assertEqual("敵制空値:&#10; 0: 制空権確保&#10; 1: 航空均衡&#10; 2～3: 航空劣勢&#10; 4～: 制空権喪失", seiku2str(1));
    assertEqual("敵制空値:&#10; 0: 制空権確保&#10; 1: 航空優勢&#10; 2～3: 航空均衡&#10; 4～6: 航空劣勢&#10; 7～: 制空権喪失", seiku2str(2));
    assertEqual("敵制空値:&#10; 0～1: 制空権確保&#10; 2: 航空優勢&#10; 3～4: 航空均衡&#10; 5～9: 航空劣勢&#10; 10～: 制空権喪失", seiku2str(3));
    assertEqual("敵制空値:&#10; 0～1: 制空権確保&#10; 2～3: 航空優勢&#10; 4～7: 航空均衡&#10; 8～15: 航空劣勢&#10; 16～: 制空権喪失", seiku2str(5));
  },
});
