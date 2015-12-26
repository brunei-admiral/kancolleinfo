phantom.injectJs("just.js");
phantom.injectJs("mock.js");
phantom.injectJs("../content/overlay.js");

// local stubs
kcif.myPref = function(){
  var obj = {
    getComplexValue: function(a, b){
      var obj = {
        data: a,
      };
      return obj;
    },
    getIntPref : function(a){
      return 2;
    },
    getBoolPref : function(a){
      return true;
    },
  };
  return obj;
}
kcif.getLogLevel = function(){
  return 0;
};
var meter = true;
kcif.getHpByMeter = function(){
  return meter;
};
kcif.getFuelByMeter = function(){
  return meter;
};

JUST.testCase({
  setup: function(){
    meter = true;
    kcif.item_list = {
      1: {
        "name": "アイテム1",
        type: [0, 0, 0]
      },
      2: {
        "name": "アイテム2",
        type: [0, 0, 6]
      },
      3: {
        "name": "応急修理要員",
        item_id: 42,
        type: [0, 0, 0]
      },
      4: {
        "name": "応急修理女神",
        item_id: 43,
        type: [0, 0, 0]
      },
    };
    kcif.ship_list = {
      100: {
        "name": "明石",
        type: 19,
        level: 1,
        exp: [10, 100],
        slot: [-1, -1, -1, -1, -1],
        hp: 39,
      },
      101: {
        "name": "香取",
        type: 21,
        level: 1,
        exp: [10, 100],
        slot: [-1, -1, -1, -1, -1],
        hp: 36,
      },
    };
    kcif.ship_master = {
      100: {"name": "テスト100", type: 2},
      101: {"name": "テスト101", type: 2},
    };
    kcif.info_div = document.body;
    kcif.renderFrame();
  },

  testTime2str: function(){
    var dt = new Date();
    assertEqual(dt.toLocaleFormat("%H:%M"), kcif.time2str(dt));
    dt.setDate(dt.getDate() + 1 > 29 ? 1 : dt.getDate() + 1);
    assertEqual(dt.toLocaleFormat("%m/%d %H:%M"), kcif.time2str(dt));
  },

  testGetTimeColor: function(){
    var dt = new Date(new Date().getTime() - 500);
    assertEqual("color-red", kcif.getTimeColor(dt));
    dt = new Date();
    assertEqual("color-red", kcif.getTimeColor(dt));
    dt = new Date(new Date().getTime() + 500);
    assertEqual("color-orange", kcif.getTimeColor(dt));
    dt = new Date(new Date().getTime() + 59500);
    assertEqual("color-orange", kcif.getTimeColor(dt));
    dt = new Date(new Date().getTime() + 60500);
    assertEqual("color-yellow", kcif.getTimeColor(dt));
    dt = new Date(new Date().getTime() + 5 * 60000 - 500);
    assertEqual("color-yellow", kcif.getTimeColor(dt));
    dt = new Date(new Date().getTime() + 5 * 60000 + 500);
    assertEqual("color-default", kcif.getTimeColor(dt));
    dt = new Date(0);
    assertEqual("color-red", kcif.getTimeColor(dt));
  },

  testHash2str: function(){
    var hash = {};
    assertEqual("", kcif.hash2str(hash));
    hash["a"] = 123;
    assertEqual("a=123", kcif.hash2str(hash));
    hash["b"] = "abc";
    assertMatch(/^(?:a=123&b=abc|b=abc&a=123)$/, kcif.hash2str(hash));
  },

  testShipType: function(){
    var ship = {
      type: 0
    };
    assertMatch(/^<td class="ship-type">.*?<\/td>$/, kcif.shipType(ship));
  },

  testShipName: function(){
    var ship = {
      ship_id: 1,
      name: "テスト1",
      slot: [],
      equip: [0, 0, 0, 0],
      equip_max: [2, 2, 2, 2],
    };
    assertMatch(/^<td class="ship-name">テスト1<\/td>$/, kcif.shipName(ship));
    ship.slot = [1];
    assertMatch(/^<td class="ship-name" title="1: アイテム1">テスト1<\/td>$/, kcif.shipName(ship));
    ship.slot = [2, 1];
    assertMatch(/^<td class="ship-name" title="1: アイテム2 \[0\/2\]&#10;2: アイテム1">テスト1<\/td>$/, kcif.shipName(ship));
  },

  testShipLevel: function(){
    var ship = {
      p_level: 1,
      level: 1,
      afterlv: 3,
      aftershipid: 100,
    };
    assertMatch(/^<td class="ship-level(?: color-default)?" title="LV3 .*?">1<\/td>$/, kcif.shipLevel(ship));
    ship.level = 2;
    assertMatch(/^<td class="ship-level(?: color-default)? blink" title="LV3 .*?">2<\/td>$/, kcif.shipLevel(ship));
    ship.p_level = 3;
    ship.level = 3;
    assertMatch(/^<td class="ship-level color-green" title="改造後 テスト100\(駆逐\)">3<\/td>$/, kcif.shipLevel(ship));
  },

  testShipHp: function(){
    var ship = {
      p_hp: 10,
      hp: 10,
      hp_max: 10,
    };
    assertMatch(/^<td class="ship-hp-meter color-green">10\/10</, kcif.shipHp(ship));
    assertMatch(/class="full"/, kcif.shipHp(ship));
    ship.hp = 9;
    assertMatch(/^<td class="ship-hp-meter(?: color-default)? blink" title="直前:10">9\/10</, kcif.shipHp(ship));
    assertMatch(/class="little"/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    assertMatch(/^<td class="ship-hp-meter(?: color-default)?">9\/10</, kcif.shipHp(ship));
    assertMatch(/class="little"/, kcif.shipHp(ship));
    ship.hp = 8;
    assertMatch(/^<td class="ship-hp-meter(?: color-default)? blink" title="直前:9">8\/10</, kcif.shipHp(ship));
    assertMatch(/class="little"/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 7;
    assertMatch(/^<td class="ship-hp-meter color-yellow blink" title="直前:8">7\/10</, kcif.shipHp(ship));
    assertMatch(/class="slight"/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 6;
    assertMatch(/^<td class="ship-hp-meter color-yellow blink" title="直前:7">6\/10</, kcif.shipHp(ship));
    assertMatch(/class="slight"/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 5;
    assertMatch(/^<td class="ship-hp-meter color-orange blink" title="直前:6">5\/10</, kcif.shipHp(ship));
    assertMatch(/class="half"/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 3;
    assertMatch(/^<td class="ship-hp-meter color-orange blink" title="直前:5">3\/10</, kcif.shipHp(ship));
    assertMatch(/class="half"/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 2;
    assertMatch(/^<td class="ship-hp-meter color-red blink" title="直前:3">2\/10</, kcif.shipHp(ship));
    assertMatch(/class="serious"/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 0;
    assertMatch(/^<td class="ship-hp-meter color-gray blink" title="直前:2">0\/10</, kcif.shipHp(ship));
    assertMatch(/class="empty"/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = -1;
    assertMatch(/^<td class="ship-hp-meter color-gray">0\/10</, kcif.shipHp(ship));
    assertMatch(/class="empty"/, kcif.shipHp(ship));
  },

  testShipHpOld: function(){
    meter = false;
    var ship = {
      p_hp: 10,
      hp: 10,
      hp_max: 10,
    };
    assertMatch(/^<td class="ship-hp color-green">10\/10<\/td>$/, kcif.shipHp(ship));
    ship.hp = 9;
    assertMatch(/^<td class="ship-hp(?: color-default)? blink" title="直前:10">9\/10<\/td>$/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    assertMatch(/^<td class="ship-hp(?: color-default)?">9\/10<\/td>$/, kcif.shipHp(ship));
    ship.hp = 8;
    assertMatch(/^<td class="ship-hp(?: color-default)? blink" title="直前:9">8\/10<\/td>$/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 7;
    assertMatch(/^<td class="ship-hp color-yellow blink" title="直前:8">7\/10<\/td>$/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 6;
    assertMatch(/^<td class="ship-hp color-yellow blink" title="直前:7">6\/10<\/td>$/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 5;
    assertMatch(/^<td class="ship-hp color-orange blink" title="直前:6">5\/10<\/td>$/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 3;
    assertMatch(/^<td class="ship-hp color-orange blink" title="直前:5">3\/10<\/td>$/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 2;
    assertMatch(/^<td class="ship-hp color-red blink" title="直前:3">2\/10<\/td>$/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = 0;
    assertMatch(/^<td class="ship-hp color-gray blink" title="直前:2">0\/10<\/td>$/, kcif.shipHp(ship));
    ship.p_hp = ship.hp;
    ship.hp = -1;
    assertMatch(/^<td class="ship-hp color-gray">0\/10<\/td>$/, kcif.shipHp(ship));
  },

  testShipCond: function(){
    var ship = {
      p_cond: 49,
      cond: 49,
    };
    assertMatch(/^<td class="ship-cond(?: color-default)?">49<\/td>$/, kcif.shipCond(ship));
    ship.cond = 50;
    assertMatch(/^<td class="ship-cond color-green blink">50<\/td>$/, kcif.shipCond(ship));
    ship.p_cond = ship.cond;
    assertMatch(/^<td class="ship-cond color-green">50<\/td>$/, kcif.shipCond(ship));
    ship.cond = 100;
    assertMatch(/^<td class="ship-cond color-green blink">100<\/td>$/, kcif.shipCond(ship));
    ship.cond = 40;
    assertMatch(/^<td class="ship-cond(?: color-default)? blink">40<\/td>$/, kcif.shipCond(ship));
    ship.cond = 39;
    assertMatch(/^<td class="ship-cond color-yellow blink">39<\/td>$/, kcif.shipCond(ship));
    ship.cond = 30;
    assertMatch(/^<td class="ship-cond color-yellow blink">30<\/td>$/, kcif.shipCond(ship));
    ship.cond = 29;
    assertMatch(/^<td class="ship-cond color-orange blink">29<\/td>$/, kcif.shipCond(ship));
    ship.cond = 20;
    assertMatch(/^<td class="ship-cond color-orange blink">20<\/td>$/, kcif.shipCond(ship));
    ship.cond = 19;
    assertMatch(/^<td class="ship-cond color-red blink">19<\/td>$/, kcif.shipCond(ship));
    ship.cond = 0;
    assertMatch(/^<td class="ship-cond color-red blink">0<\/td>$/, kcif.shipCond(ship));
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
    assertMatch(/"full"><\/meter><meter /, kcif.shipFuelBull(ship));
    ship.fuel = 99;
    assertMatch(/"slight"><\/meter><meter /, kcif.shipFuelBull(ship));
    ship.fuel = 51;
    assertMatch(/"slight"><\/meter><meter /, kcif.shipFuelBull(ship));
    ship.fuel = 50;
    assertMatch(/"half"><\/meter><meter /, kcif.shipFuelBull(ship));
    ship.fuel = 21;
    assertMatch(/"half"><\/meter><meter /, kcif.shipFuelBull(ship));
    ship.fuel = 20;
    assertMatch(/"serious"><\/meter><meter /, kcif.shipFuelBull(ship));
    ship.fuel = 1;
    assertMatch(/"serious"><\/meter><meter /, kcif.shipFuelBull(ship));
    ship.fuel = 0;
    assertMatch(/"empty"><\/meter><meter /, kcif.shipFuelBull(ship));
    ship.fuel = ship.p_fuel = 50;
    ship.fuel_max = 99;
    assertMatch(/"slight"><\/meter><meter /, kcif.shipFuelBull(ship));
    ship.fuel = ship.p_fuel = 49;
    assertMatch(/"half"><\/meter><meter /, kcif.shipFuelBull(ship));

    assertMatch(/"full"><\/meter><\/td>/, kcif.shipFuelBull(ship));
    ship.bull = 99;
    assertMatch(/"slight"><\/meter><\/td>/, kcif.shipFuelBull(ship));
    ship.bull = 51;
    assertMatch(/"slight"><\/meter><\/td>/, kcif.shipFuelBull(ship));
    ship.bull = 50;
    assertMatch(/"half"><\/meter><\/td>/, kcif.shipFuelBull(ship));
    ship.bull = 21;
    assertMatch(/"half"><\/meter><\/td>/, kcif.shipFuelBull(ship));
    ship.bull = 20;
    assertMatch(/"serious"><\/meter><\/td>/, kcif.shipFuelBull(ship));
    ship.bull = 1;
    assertMatch(/"serious"><\/meter><\/td>/, kcif.shipFuelBull(ship));
    ship.bull = 0;
    assertMatch(/"empty"><\/meter><\/td>/, kcif.shipFuelBull(ship));
    ship.bull = ship.p_bull = 50;
    ship.bull_max = 99;
    assertMatch(/"slight"><\/meter><\/td>/, kcif.shipFuelBull(ship));
    ship.bull = ship.p_bull = 49;
    assertMatch(/"half"><\/meter><\/td>/, kcif.shipFuelBull(ship));
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
    assertMatch(/^<td class="ship-fuel color-green" title="100\/100">100%<\/td>/, kcif.shipFuelBull(ship));
    ship.fuel = 99;
    assertMatch(/^<td class="ship-fuel color-yellow blink" title="99\/100">99%<\/td>/, kcif.shipFuelBull(ship));
    ship.p_fuel = ship.fuel;
    assertMatch(/^<td class="ship-fuel color-yellow" title="99\/100">99%<\/td>/, kcif.shipFuelBull(ship));
    ship.fuel = 50;
    assertMatch(/^<td class="ship-fuel color-yellow blink" title="50\/100">50%<\/td>/, kcif.shipFuelBull(ship));
    ship.fuel = 49;
    assertMatch(/^<td class="ship-fuel color-orange blink" title="49\/100">49%<\/td>/, kcif.shipFuelBull(ship));
    ship.fuel = 1;
    assertMatch(/^<td class="ship-fuel color-orange blink" title="1\/100">1%<\/td>/, kcif.shipFuelBull(ship));
    ship.fuel = 0;
    assertMatch(/^<td class="ship-fuel color-red blink" title="0\/100">0%<\/td>/, kcif.shipFuelBull(ship));
    ship.fuel = ship.p_fuel = 50;
    ship.fuel_max = 99;
    assertMatch(/^<td class="ship-fuel color-yellow" title="50\/99">50%<\/td>/, kcif.shipFuelBull(ship));
    ship.fuel = ship.p_fuel = 49;
    ship.fuel_max = 99;
    assertMatch(/^<td class="ship-fuel color-orange" title="49\/99">49%<\/td>/, kcif.shipFuelBull(ship));

    assertMatch(/<td class="ship-bull color-green" title="100\/100">100%<\/td>$/, kcif.shipFuelBull(ship));
    ship.bull = 99;
    assertMatch(/<td class="ship-bull color-yellow blink" title="99\/100">99%<\/td>$/, kcif.shipFuelBull(ship));
    ship.p_bull = ship.bull;
    assertMatch(/<td class="ship-bull color-yellow" title="99\/100">99%<\/td>$/, kcif.shipFuelBull(ship));
    ship.bull = 50;
    assertMatch(/<td class="ship-bull color-yellow blink" title="50\/100">50%<\/td>$/, kcif.shipFuelBull(ship));
    ship.bull = 49;
    assertMatch(/<td class="ship-bull color-orange blink" title="49\/100">49%<\/td>$/, kcif.shipFuelBull(ship));
    ship.bull = 1;
    assertMatch(/<td class="ship-bull color-orange blink" title="1\/100">1%<\/td>$/, kcif.shipFuelBull(ship));
    ship.bull = 0;
    assertMatch(/<td class="ship-bull color-red blink" title="0\/100">0%<\/td>$/, kcif.shipFuelBull(ship));
    ship.bull = ship.p_bull = 50;
    ship.bull_max = 99;
    assertMatch(/<td class="ship-bull color-yellow" title="50\/99">50%<\/td>$/, kcif.shipFuelBull(ship));
    ship.bull = ship.p_bull = 49;
    ship.bull_max = 99;
    assertMatch(/<td class="ship-bull color-orange" title="49\/99">49%<\/td>$/, kcif.shipFuelBull(ship));
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
    assert(kcif.compareShip(a, b) < 0);

    kcif.sort_ships = "no-";
    assert(kcif.compareShip(a, b) > 0);

    kcif.sort_ships = "type+";
    assert(kcif.compareShip(a, b) > 0);

    kcif.sort_ships = "type-";
    assert(kcif.compareShip(a, b) < 0);

    kcif.sort_ships = "name+";
    assert(kcif.compareShip(a, b) < 0);

    kcif.sort_ships = "name-";
    assert(kcif.compareShip(a, b) > 0);

    kcif.sort_ships = "level+";
    assert(kcif.compareShip(a, b) > 0);

    kcif.sort_ships = "level-";
    assert(kcif.compareShip(a, b) < 0);

    kcif.sort_ships = "hp+";
    assert(kcif.compareShip(a, b) > 0);

    kcif.sort_ships = "hp-";
    assert(kcif.compareShip(a, b) < 0);

    kcif.sort_ships = "cond+";
    assert(kcif.compareShip(a, b) < 0);

    kcif.sort_ships = "cond-";
    assert(kcif.compareShip(a, b) > 0);
  },

  testReflectDamage: function(){
    var ship = {
      hp: 10,
      hp_max: 20,
      slot: [-1, -1, -1, -1, -1],
      slot_ex: -1,
    };
    buf = []
    kcif.reflectDamage(buf, 0, ship, 5);
    assertEqual(5, ship.hp);
    assertEqual(5, buf[0]);
    kcif.reflectDamage(buf, 0, ship, 3);
    assertEqual(2, ship.hp);
    assertEqual(8, buf[0]);
    kcif.reflectDamage(buf, 0, ship, 3);
    assertEqual(0, ship.hp);
    assertEqual(10, buf[0]);

    ship.hp = 2;
    ship.slot = [1, 3, 2, -1, -1]
    kcif.reflectDamage(buf, 1, ship, 3);
    assertEqual(4, ship.hp);
    assertEqual([1, 2, -1, -1, -1, -1], ship.slot);
    assertEqual(2, buf[1]);

    ship.hp = 2;
    ship.slot = [1, 4, 2, -1, -1]
    kcif.reflectDamage(buf, 2, ship, 3);
    assertEqual(20, ship.hp);
    assertEqual([1, 2, -1, -1, -1, -1], ship.slot);
    assertEqual(2, buf[2]);

    // enemy
    var ship = {
      hp: 10,
      hp_max: 20,
    };
    kcif.reflectDamage(null, 0, ship, 5);
    assertEqual(5, ship.hp);
  },

  testJudgeBattleResult: function(){
    assertEqual("SS", kcif.judgeBattleResult([{hp: 1}], [{hp: 0}], [0], [1]));
    assertEqual("S", kcif.judgeBattleResult([{hp: 1}], [{hp: 0}], [1], [1]));
    assertEqual("A", kcif.judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 0}], [1], [0, 1]));
    assertEqual("A", kcif.judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 0}, {hp: 0}], [1], [0, 1, 1]));
    assertEqual("A", kcif.judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}], [1], [0, 0, 1, 1]));
    assertEqual("A", kcif.judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}, {hp: 0}], [1], [0, 0, 1, 1, 1]));
    assertEqual("A", kcif.judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}], [1], [0, 0, 1, 1, 1, 1]));
    assertEqual("B", kcif.judgeBattleResult([{hp: 1}], [{hp: 0}, {hp: 1}, {hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}], [1], [1, 0, 0, 0, 1, 1]));
    assertEqual("B", kcif.judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}, {hp: 0}], [0], [0, 0, 0, 1, 1, 1]));
    assertEqual("C", kcif.judgeBattleResult([{hp: 1}], [{hp: 1}, {hp: 1}, {hp: 1}, {hp: 0}, {hp: 0}, {hp: 0}], [1], [0, 0, 0, 1, 1, 1]));
    assertEqual("D", kcif.judgeBattleResult([{hp: 1}], [{hp: 1}], [0], [0]));
    assertEqual("B", kcif.judgeBattleResult([{hp: 17}, {hp: 19}, {hp: 23}, {hp: 28}, {hp: 22}, {hp: 22}], [{hp: 79}, {hp: 59}, {hp: 27}, {hp: 0}, {hp: 0}, {hp: 0}], [0, 0, 0, 0, 0, 0], [11, 17, 49, 50, 43, 45]));
  },

  testUpdateRepairStart: function(){
    kcif.repair_start = [null, null, null, null];
    kcif.deck_list[0] = {
      api_ship: [100, -1, -1, -1, -1, -1, -1],
    };
    refute(kcif.repair_start[0]);
    kcif.updateRepairStart(0);
    assert(true, !!kcif.repair_start[0]);
    kcif.deck_list[0].api_ship[0] = 101;
    kcif.updateRepairStart(0);
    refute(kcif.repair_start[0]);
    kcif.deck_list[0].api_ship[1] = 100;
    kcif.updateRepairStart(0);
    refute(kcif.repair_start[0]);
  },

  testGetTimeColor: function(){
    var now = new Date();
    assertEqual("color-red", kcif.getTimeColor(now));
    assertEqual("color-red", kcif.getTimeColor(now, false));
    assertEqual("color-red", kcif.getTimeColor(now, true));

    assertEqual("color-orange", kcif.getTimeColor(new Date(now.getTime() + 59 * 1000)));
    assertEqual("color-orange", kcif.getTimeColor(new Date(now.getTime() + 59 * 1000), false));
    assertEqual("color-yellow", kcif.getTimeColor(new Date(now.getTime() + 59 * 1000), true));

    assertEqual("color-yellow", kcif.getTimeColor(new Date(now.getTime() + 61 * 1000)));
    assertEqual("color-yellow", kcif.getTimeColor(new Date(now.getTime() + 61 * 1000), false));
    assertEqual("color-yellow", kcif.getTimeColor(new Date(now.getTime() + 61 * 1000), true));

    assertEqual("color-yellow", kcif.getTimeColor(new Date(now.getTime() + 299 * 1000)));
    assertEqual("color-yellow", kcif.getTimeColor(new Date(now.getTime() + 299 * 1000), false));
    assertEqual("color-yellow", kcif.getTimeColor(new Date(now.getTime() + 299 * 1000), true));

    assertEqual("color-default", kcif.getTimeColor(new Date(now.getTime() + 301 * 1000)));
    assertEqual("color-default", kcif.getTimeColor(new Date(now.getTime() + 301 * 1000), false));
    assertEqual("color-default", kcif.getTimeColor(new Date(now.getTime() + 301 * 1000), true));
  },

  testMap2str: function(){
    var json = {
      api_maparea_id: 1,
      api_mapinfo_no: 2,
      api_no: 3,
      api_bosscell_no: 5,
      api_event_id: 4,
      api_event_kind: 1,
    };
    assertEqual("+ 1-2-3", kcif.map2str(json));
    json.api_no = 4;
    json.api_event_id = 3;
    json.api_event_kind = 0;
    assertEqual("- 1-2-4", kcif.map2str(json));
    json.api_no = 5;
    json.api_event_id = 5;
    json.api_event_kind = 1;
    assertEqual("* 1-2-5", kcif.map2str(json));
  },

  testFormatMaterial: function(){
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">0</td></tr>', kcif.formatMaterial("test", 0, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">999</td></tr>', kcif.formatMaterial("test", 999, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-yellow">1000</td></tr>', kcif.formatMaterial("test", 1000, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-yellow">299999</td></tr>', kcif.formatMaterial("test", 299999, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-red">300000</td></tr>', kcif.formatMaterial("test", 300000, 1));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">1000</td></tr>', kcif.formatMaterial("test", 1000, 2));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">1249</td></tr>', kcif.formatMaterial("test", 1249, 2));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-yellow">1250</td></tr>', kcif.formatMaterial("test", 1250, 2));

    assertEqual('<tr><th class="res-name">test</th><td class="res-value">0</td></tr>', kcif.formatMaterial("test", 0));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">2999</td></tr>', kcif.formatMaterial("test", 2999));
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-red">3000</td></tr>', kcif.formatMaterial("test", 3000));
  },

  testSeiku2str: function(){
    assertEqual("敵制空値:&#10; 0: 制空権確保&#10; 1～: 制空権喪失", kcif.seiku2str(0));
    assertEqual("敵制空値:&#10; 0: 制空権確保&#10; 1: 航空均衡&#10; 2～3: 航空劣勢&#10; 4～: 制空権喪失", kcif.seiku2str(1));
    assertEqual("敵制空値:&#10; 0: 制空権確保&#10; 1: 航空優勢&#10; 2～3: 航空均衡&#10; 4～6: 航空劣勢&#10; 7～: 制空権喪失", kcif.seiku2str(2));
    assertEqual("敵制空値:&#10; 0～1: 制空権確保&#10; 2: 航空優勢&#10; 3～4: 航空均衡&#10; 5～9: 航空劣勢&#10; 10～: 制空権喪失", kcif.seiku2str(3));
    assertEqual("敵制空値:&#10; 0～1: 制空権確保&#10; 2～3: 航空優勢&#10; 4～7: 航空均衡&#10; 8～15: 航空劣勢&#10; 16～: 制空権喪失", kcif.seiku2str(5));
  },

  testCheckConfigChanged: function(){
    kcif.resetConfig();
    refute(kcif.checkConfigChanged(), "nothing is changed");

    var elem = kcif.info_div.querySelector("#capture-save-dir");
    elem.value = "hoge";
    assert(kcif.checkConfigChanged(), "capture-save-dir is changed");

    kcif.resetConfig();
    var elem = kcif.info_div.querySelector("#capture-save-base");
    elem.value = "hoge";
    assert(kcif.checkConfigChanged(), "capture-save-base is changed");

    kcif.resetConfig();
    var elem = kcif.info_div.querySelector("#beep-url");
    elem.value = "hoge";
    assert(kcif.checkConfigChanged(), "beep-url is changed");

    kcif.resetConfig();
    var elem = kcif.info_div.querySelector("#beep-volume");
    elem.value = 0;
    assert(kcif.checkConfigChanged(), "beep-volume is changed");

    kcif.resetConfig();
    elem = kcif.info_div.querySelector("#beep-expedition");
    elem.checked = false;
    assert(kcif.checkConfigChanged(), "beep-expedition is changed");

    kcif.resetConfig();
    elem = kcif.info_div.querySelector("#beep-dock");
    elem.checked = false;
    assert(kcif.checkConfigChanged(), "beep-dock is changed");

    kcif.resetConfig();
    elem = kcif.info_div.querySelector("#beep-built");
    elem.checked = false;
    assert(kcif.checkConfigChanged(), "beep-built is changed");

    kcif.resetConfig();
    elem = kcif.info_div.querySelector("#beep-repair");
    elem.checked = false;
    assert(kcif.checkConfigChanged(), "beep-repair is changed");

    kcif.resetConfig();
    elem = kcif.info_div.querySelector("#show-battle");
    elem.checked = false;
    assert(kcif.checkConfigChanged(), "show-battle is changed");

    kcif.resetConfig();
    elem = kcif.info_div.querySelector("#show-built");
    elem.checked = false;
    assert(kcif.checkConfigChanged(), "show-built is changed");

    kcif.resetConfig();
    elem = kcif.info_div.querySelector("#hp-by-meter");
    elem.checked = false;
    assert(kcif.checkConfigChanged(), "hp-by-meter is changed");

    kcif.resetConfig();
    elem = kcif.info_div.querySelector("#fuel-by-meter");
    elem.checked = false;
    assert(kcif.checkConfigChanged(), "fuel-by-meter is changed");

    kcif.resetConfig();
    elem = kcif.info_div.querySelector("#search-formula");
    elem.selectedIndex = 0;
    assert(kcif.checkConfigChanged(), "search-formula is changed");

    kcif.resetConfig();
    refute(kcif.checkConfigChanged(), "nothing is changed");
  },

  testSetupFleetStatus: function(){
    kcif.deck_list[0] = {
      api_ship: [100, 101, -1, -1, -1, -1, -1],
    };
    kcif.ship_list[100].hp = 0;
    kcif.battle_result = [[0], [0]];
    kcif.setupFleetStatus();
    assertEqual([], kcif.battle_result[0]);
    assertEqual([], kcif.battle_result[1]);
    assertEqual(101, kcif.deck_list[0].api_ship[0]);
    assertEqual(-1, kcif.deck_list[0].api_ship[1]);
  },

  testMain: function(){
    // TODO
    kcif.main(null, null, null);
  },

  testParseQuery: function(){
    var listener = new TracingListener();
    var result = listener.parseQuery("a=1&b=2&c=3");
    assertEqual(1, result["a"]);
    assertEqual(2, result["b"]);
    assertEqual(3, result["c"]);
    refute(result["d"], "no such parameter");
  },

  testRenderInfo: function(){
    // TODO
    kcif.renderInfo(false);

    kcif.renderInfo(true);
  },

  testOnLoad: function(){
    // TODO
    evt = {originalTarget: document};
    kcif.onLoad(evt);
  },
});
