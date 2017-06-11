if (typeof(phantom) !== "undefined") {
  phantom.injectJs("just.js");
  phantom.injectJs("mock.js");
  phantom.injectJs("../content/overlay.js");
}
else {
  if (typeof(process.env["NODE_PATH"]) === "undefined") {
    process.env["NODE_PATH"] = "";
  }
  process.env["NODE_PATH"].concat("C:/Progra~1/node-v6.10.2-win-x64/node_modules");
  var document = require("html-element").document;
  document.URL = "http://example.com";
  const FS = require("fs");
  const Path = require("path");
  var geval = eval;
  ["./just.js", "./mock.js", "../content/overlay.js"].forEach(function(file){
    file = Path.resolve(__dirname, file);
    geval(FS.readFileSync(file, "utf-8"));
  });
}

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
kcif.document = document;
kcif.mainWindow = kcif.window = window;

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
        hp_max: 39,
        fuel: 55,
        fuel_max: 55,
        bull: 15,
        bull_max: 15,
      },
      101: {
        "name": "香取",
        type: 21,
        level: 1,
        exp: [10, 100],
        slot: [-1, -1, -1, -1, -1],
        hp: 36,
        hp_max: 36,
        fuel: 35,
        fuel_max: 35,
        bull: 25,
        bull_max: 25,
      },
    };
    kcif.ship_master = {
      100: {"name": "テスト100", type: 2},
      101: {"name": "テスト101", type: 2},
    };
    kcif.document = document;
    kcif.info_div = kcif.document.body;
    kcif.renderFrame();
  },

  testMakeElement: function(){
    var elem = makeElement("div");
    assertEqual("<div></div>", elem.outerHTML);

    elem = makeElement("div", "id");
    assertEqual('<div id="id"></div>', elem.outerHTML);

    elem = makeElement("div", "id", "class");
    assertMatch(/^<div [^>]+><\/div>$/, elem.outerHTML);
    assertMatch(/id="id"/, elem.outerHTML);
    assertMatch(/class="class"/, elem.outerHTML);

    elem = makeElement("div", "id", null, "text");
    assertEqual('<div id="id">text</div>', elem.outerHTML);

    elem = makeElement("div", "id", "class", "text");
    assertMatch(/^<div [^>]+>text<\/div>$/, elem.outerHTML);
    assertMatch(/id="id"/, elem.outerHTML);
    assertMatch(/class="class"/, elem.outerHTML);

    elem = makeElement("div", null, "class");
    assertEqual('<div class="class"></div>', elem.outerHTML);

    elem = makeElement("div", null, "class", "text");
    assertEqual('<div class="class">text</div>', elem.outerHTML);

    elem = makeElement("div", null, null, "text");
    assertEqual('<div>text</div>', elem.outerHTML);
  },

  testMakeText: function(){
    var elem = makeText("text");
    assertEqual("[object Text]", String(elem));
  },

  testClearChildElements: function(){
    var elem = makeElement("div", null, null, "text1");
    elem.appendChild(makeText("text2"));
    elem.appendChild(makeElement("span", null, null, "text3"));
    elem.appendChild(makeText("text4"));
    assertEqual("<div>text1text2<span>text3</span>text4</div>", elem.outerHTML);
    clearChildElements(elem);
    assertEqual("<div></div>", elem.outerHTML);

    elem = makeElement("div");
    clearChildElements(elem);
    assertEqual("<div></div>", elem.outerHTML);
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

    dt = new Date(new Date().getTime() - 500);
    assertEqual("color-red", kcif.getTimeColor(dt, true));
    dt = new Date();
    assertEqual("color-red", kcif.getTimeColor(dt, true));
    dt = new Date(new Date().getTime() + 500);
    assertEqual("color-yellow", kcif.getTimeColor(dt, true));
    dt = new Date(new Date().getTime() + 59500);
    assertEqual("color-yellow", kcif.getTimeColor(dt, true));
    dt = new Date(new Date().getTime() + 60500);
    assertEqual("color-yellow", kcif.getTimeColor(dt, true));
    dt = new Date(new Date().getTime() + 5 * 60000 - 500);
    assertEqual("color-yellow", kcif.getTimeColor(dt, true));
    dt = new Date(new Date().getTime() + 5 * 60000 + 500);
    assertEqual("color-default", kcif.getTimeColor(dt, true));
    dt = new Date(0);
    assertEqual("color-red", kcif.getTimeColor(dt, true));
  },

  testHash2str: function(){
    var hash = {};
    assertEqual("", kcif.hash2str(hash));
    hash["a"] = 123;
    assertEqual("a=123", kcif.hash2str(hash));
    hash["b"] = "abc";
    assertMatch(/^(?:a=123&b=abc|b=abc&a=123)$/, kcif.hash2str(hash));
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

  testType2str: function(){
    assertEqual("駆逐", kcif.type2str(2));
    // TODO
  },

  testSeiku2str: function(){
    assertEqual("敵制空値:\u000a 0: 制空権確保\u000a 1～: 制空権喪失", kcif.seiku2str(0));
    assertEqual("敵制空値:\u000a 0: 制空権確保\u000a 1: 航空均衡\u000a 2～3: 航空劣勢\u000a 4～: 制空権喪失", kcif.seiku2str(1));
    assertEqual("敵制空値:\u000a 0: 制空権確保\u000a 1: 航空優勢\u000a 2～3: 航空均衡\u000a 4～6: 航空劣勢\u000a 7～: 制空権喪失", kcif.seiku2str(2));
    assertEqual("敵制空値:\u000a 0～1: 制空権確保\u000a 2: 航空優勢\u000a 3～4: 航空均衡\u000a 5～9: 航空劣勢\u000a 10～: 制空権喪失", kcif.seiku2str(3));
    assertEqual("敵制空値:\u000a 0～1: 制空権確保\u000a 2～3: 航空優勢\u000a 4～7: 航空均衡\u000a 8～15: 航空劣勢\u000a 16～: 制空権喪失", kcif.seiku2str(5));
  },

  testShipType: function(){
    var ship = {
      type: 0
    };
    assertMatch(/^<td class="ship-type">.*?<\/td>$/, kcif.shipType(ship).outerHTML);
  },

  testShipName: function(){
    var ship = {
      ship_id: 1,
      name: "テスト1",
      type_name: "駆逐艦",
      slot: [],
      equip: [0, 0, 0, 0],
      equip_max: [2, 2, 2, 2],
    };
    assertMatch(/^<td class="ship-name" title="駆逐艦 テスト1">テスト1<\/td>$/, kcif.shipName(ship).outerHTML);
    ship.slot = [1];
    assertMatch(/^<td class="ship-name" title="駆逐艦 テスト1\u000a1: アイテム1">テスト1<\/td>$/, kcif.shipName(ship).outerHTML);
    ship.slot = [2, 1];
    assertMatch(/^<td class="ship-name" title="駆逐艦 テスト1\u000a1: アイテム2 \[0\/2\]\u000a2: アイテム1">テスト1<\/td>$/, kcif.shipName(ship).outerHTML);
  },

  testShipLevel: function(){
    var ship = {
      p_level: 1,
      level: 1,
    };
    assertMatch(/^<td class="ship-level(?: color-default)?">1<\/td>$/, kcif.shipLevel(ship).outerHTML);
    ship.afterlv = 3;
    ship.aftershipid = 100;
    assertMatch(/^<td class="ship-level color-yellow" title="LV3 .*?">1<\/td>$/, kcif.shipLevel(ship).outerHTML);
    ship.level = 2;
    assertMatch(/^<td class="ship-level color-yellow blink" title="LV3 .*?">2<\/td>$/, kcif.shipLevel(ship).outerHTML);
    ship.p_level = 3;
    ship.level = 3;
    assertMatch(/^<td class="ship-level color-green" title="改造後 テスト100\(駆逐\)">3<\/td>$/, kcif.shipLevel(ship).outerHTML);
  },

  testShipHp: function(){
    var ship = {
      p_hp: 10,
      hp: 10,
      hp_max: 10,
    };
    assertMatch(/^<td class="ship-hp-meter color-green">10\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="full"/, kcif.shipHp(ship).outerHTML);
    ship.hp = 9;
    assertMatch(/^<td class="ship-hp-meter(?: color-default)? blink" title="直前:10">9\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="little"/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    assertMatch(/^<td class="ship-hp-meter(?: color-default)?">9\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="little"/, kcif.shipHp(ship).outerHTML);
    ship.hp = 8;
    assertMatch(/^<td class="ship-hp-meter(?: color-default)? blink" title="直前:9">8\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="little"/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 7;
    assertMatch(/^<td class="ship-hp-meter color-yellow blink" title="直前:8">7\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="slight"/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 6;
    assertMatch(/^<td class="ship-hp-meter color-yellow blink" title="直前:7">6\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="slight"/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 5;
    assertMatch(/^<td class="ship-hp-meter color-orange blink" title="直前:6">5\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="half"/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 3;
    assertMatch(/^<td class="ship-hp-meter color-orange blink" title="直前:5">3\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="half"/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 2;
    assertMatch(/^<td class="ship-hp-meter color-red blink" title="直前:3">2\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="serious"/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 0;
    assertMatch(/^<td class="ship-hp-meter color-gray blink" title="直前:2">0\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="empty"/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = -1;
    assertMatch(/^<td class="ship-hp-meter color-gray">0\/10</, kcif.shipHp(ship).outerHTML);
    assertMatch(/class="empty"/, kcif.shipHp(ship).outerHTML);
  },

  testShipHpOld: function(){
    meter = false;
    var ship = {
      p_hp: 10,
      hp: 10,
      hp_max: 10,
    };
    assertMatch(/^<td class="ship-hp color-green">10\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.hp = 9;
    assertMatch(/^<td class="ship-hp(?: color-default)? blink" title="直前:10">9\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    assertMatch(/^<td class="ship-hp(?: color-default)?">9\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.hp = 8;
    assertMatch(/^<td class="ship-hp(?: color-default)? blink" title="直前:9">8\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 7;
    assertMatch(/^<td class="ship-hp color-yellow blink" title="直前:8">7\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 6;
    assertMatch(/^<td class="ship-hp color-yellow blink" title="直前:7">6\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 5;
    assertMatch(/^<td class="ship-hp color-orange blink" title="直前:6">5\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 3;
    assertMatch(/^<td class="ship-hp color-orange blink" title="直前:5">3\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 2;
    assertMatch(/^<td class="ship-hp color-red blink" title="直前:3">2\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = 0;
    assertMatch(/^<td class="ship-hp color-gray blink" title="直前:2">0\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
    ship.p_hp = ship.hp;
    ship.hp = -1;
    assertMatch(/^<td class="ship-hp color-gray">0\/10<\/td>$/, kcif.shipHp(ship).outerHTML);
  },

  testShipCond: function(){
    var ship = {
      p_cond: 49,
      cond: 49,
    };
    assertMatch(/^<td class="ship-cond(?: color-default)?">49<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.cond = 50;
    assertMatch(/^<td class="ship-cond color-green blink">50<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.p_cond = ship.cond;
    assertMatch(/^<td class="ship-cond color-green">50<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.cond = 100;
    assertMatch(/^<td class="ship-cond color-green blink">100<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.cond = 40;
    assertMatch(/^<td class="ship-cond(?: color-default)? blink">40<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.cond = 39;
    assertMatch(/^<td class="ship-cond color-yellow blink">39<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.cond = 30;
    assertMatch(/^<td class="ship-cond color-yellow blink">30<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.cond = 29;
    assertMatch(/^<td class="ship-cond color-orange blink">29<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.cond = 20;
    assertMatch(/^<td class="ship-cond color-orange blink">20<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.cond = 19;
    assertMatch(/^<td class="ship-cond color-red blink">19<\/td>$/, kcif.shipCond(ship).outerHTML);
    ship.cond = 0;
    assertMatch(/^<td class="ship-cond color-red blink">0<\/td>$/, kcif.shipCond(ship).outerHTML);
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
    assertMatch(/class="full"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 99;
    assertMatch(/class="slight"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 51;
    assertMatch(/class="slight"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 50;
    assertMatch(/class="half"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 21;
    assertMatch(/class="half"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 20;
    assertMatch(/class="serious"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 1;
    assertMatch(/class="serious"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 0;
    assertMatch(/class="empty"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);
    ship.fuel = ship.p_fuel = 50;
    ship.fuel_max = 99;
    assertMatch(/class="slight"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);
    ship.fuel = ship.p_fuel = 49;
    assertMatch(/class="half"[^>]*><\/meter><meter /, kcif.shipFuel(ship).outerHTML);

    assertMatch(/class="full"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.bull = 99;
    assertMatch(/class="slight"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.bull = 51;
    assertMatch(/class="slight"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.bull = 50;
    assertMatch(/class="half"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.bull = 21;
    assertMatch(/class="half"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.bull = 20;
    assertMatch(/class="serious"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.bull = 1;
    assertMatch(/class="serious"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.bull = 0;
    assertMatch(/class="empty"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.bull = ship.p_bull = 50;
    ship.bull_max = 99;
    assertMatch(/class="slight"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.bull = ship.p_bull = 49;
    assertMatch(/class="half"[^>]*><\/meter><\/td>/, kcif.shipFuel(ship).outerHTML);
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
    assertMatch(/^<td class="ship-fuel color-green" title="100\/100">100%<\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 99;
    assertMatch(/^<td class="ship-fuel color-yellow blink" title="99\/100">99%<\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.p_fuel = ship.fuel;
    assertMatch(/^<td class="ship-fuel color-yellow" title="99\/100">99%<\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 50;
    assertMatch(/^<td class="ship-fuel color-yellow blink" title="50\/100">50%<\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 49;
    assertMatch(/^<td class="ship-fuel color-orange blink" title="49\/100">49%<\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 1;
    assertMatch(/^<td class="ship-fuel color-orange blink" title="1\/100">1%<\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.fuel = 0;
    assertMatch(/^<td class="ship-fuel color-red blink" title="0\/100">0%<\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.fuel = ship.p_fuel = 50;
    ship.fuel_max = 99;
    assertMatch(/^<td class="ship-fuel color-yellow" title="50\/99">50%<\/td>/, kcif.shipFuel(ship).outerHTML);
    ship.fuel = ship.p_fuel = 49;
    ship.fuel_max = 99;
    assertMatch(/^<td class="ship-fuel color-orange" title="49\/99">49%<\/td>/, kcif.shipFuel(ship).outerHTML);

    assertMatch(/<td class="ship-bull color-green" title="100\/100">100%<\/td>$/, kcif.shipBull(ship).outerHTML);
    ship.bull = 99;
    assertMatch(/<td class="ship-bull color-yellow blink" title="99\/100">99%<\/td>$/, kcif.shipBull(ship).outerHTML);
    ship.p_bull = ship.bull;
    assertMatch(/<td class="ship-bull color-yellow" title="99\/100">99%<\/td>$/, kcif.shipBull(ship).outerHTML);
    ship.bull = 50;
    assertMatch(/<td class="ship-bull color-yellow blink" title="50\/100">50%<\/td>$/, kcif.shipBull(ship).outerHTML);
    ship.bull = 49;
    assertMatch(/<td class="ship-bull color-orange blink" title="49\/100">49%<\/td>$/, kcif.shipBull(ship).outerHTML);
    ship.bull = 1;
    assertMatch(/<td class="ship-bull color-orange blink" title="1\/100">1%<\/td>$/, kcif.shipBull(ship).outerHTML);
    ship.bull = 0;
    assertMatch(/<td class="ship-bull color-red blink" title="0\/100">0%<\/td>$/, kcif.shipBull(ship).outerHTML);
    ship.bull = ship.p_bull = 50;
    ship.bull_max = 99;
    assertMatch(/<td class="ship-bull color-yellow" title="50\/99">50%<\/td>$/, kcif.shipBull(ship).outerHTML);
    ship.bull = ship.p_bull = 49;
    ship.bull_max = 99;
    assertMatch(/<td class="ship-bull color-orange" title="49\/99">49%<\/td>$/, kcif.shipBull(ship).outerHTML);
  },

  testShipExp: function(){
    var ship = {
      exp: [456, 123],
    };
    var elem = kcif.shipExp(ship);
    assertMatch(/^<td [^>]+>123<\/td>$/, elem.outerHTML);
    assertEqual("ship-exp", elem.className);
    assertEqual("456/579", elem.getAttribute("title"));
  },

  testFormatMaterial: function(){
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">0</td></tr>', kcif.formatMaterial("test", 0, 1).outerHTML);
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">999</td></tr>', kcif.formatMaterial("test", 999, 1).outerHTML);
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-yellow">1000</td></tr>', kcif.formatMaterial("test", 1000, 1).outerHTML);
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-yellow">299999</td></tr>', kcif.formatMaterial("test", 299999, 1).outerHTML);
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-red">300000</td></tr>', kcif.formatMaterial("test", 300000, 1).outerHTML);
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">1000</td></tr>', kcif.formatMaterial("test", 1000, 2).outerHTML);
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">1249</td></tr>', kcif.formatMaterial("test", 1249, 2).outerHTML);
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-yellow">1250</td></tr>', kcif.formatMaterial("test", 1250, 2).outerHTML);

    assertEqual('<tr><th class="res-name">test</th><td class="res-value">0</td></tr>', kcif.formatMaterial("test", 0).outerHTML);
    assertEqual('<tr><th class="res-name">test</th><td class="res-value">2999</td></tr>', kcif.formatMaterial("test", 2999).outerHTML);
    assertEqual('<tr><th class="res-name">test</th><td class="res-value color-red">3000</td></tr>', kcif.formatMaterial("test", 3000).outerHTML);
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

  testRemoveFromDeck: function(){
    kcif.deck_list[0] = {
      api_ship: [100, 101, 102, -1, -1, -1, -1],
    };
    assert(kcif.removeFromDeck(101));
    assertEqual([100, 102, -1, -1, -1, -1, -1], kcif.deck_list[0].api_ship);
    refute(kcif.removeFromDeck(9999));
    assertEqual([100, 102, -1, -1, -1, -1, -1], kcif.deck_list[0].api_ship);
  },

  testMakeItem: function(){
    // TODO
  },

  testMakeShip: function(){
    // TODO
  },

  testHasSeiku: function(){
    for (var i = 1; i <= 5; i++) {
      refute(kcif.hasSeiku(i));
    }
    assert(kcif.hasSeiku(6));
    assert(kcif.hasSeiku(7));
    assert(kcif.hasSeiku(8));
    refute(kcif.hasSeiku(9));
    refute(kcif.hasSeiku(10));
    assert(kcif.hasSeiku(11));
    for (var i = 12; i <= 44; i++) {
      refute(kcif.hasSeiku(i));
    }
    assert(kcif.hasSeiku(45));
    for (var i = 46; i <= 55; i++) {
      refute(kcif.hasSeiku(i));
    }
    for (var i = 56; i <= 58; i++) {
      assert(kcif.hasSeiku(i));
    }
    for (var i = 59; i <= 199; i++) {
      refute(kcif.hasSeiku(i));
    }
  },

  testIsPlane: function(){
    for (var i = 1; i <= 5; i++) {
      refute(kcif.isPlane(i));
    }
    for (var i = 6; i <= 11; i++) {
      assert(kcif.isPlane(i));
    }
    for (var i = 12; i <= 24; i++) {
      refute(kcif.isPlane(i));
    }
    assert(kcif.isPlane(25));
    assert(kcif.isPlane(26));
    for (var i = 27; i <= 40; i++) {
      refute(kcif.isPlane(i));
    }
    assert(kcif.isPlane(41));
    for (var i = 42; i <= 44; i++) {
      refute(kcif.isPlane(i));
    }
    assert(kcif.isPlane(45));
    for (var i = 46; i <= 55; i++) {
      refute(kcif.isPlane(i));
    }
    for (var i = 56; i <= 59; i++) {
      assert(kcif.isPlane(i));
    }
    for (var i = 60; i <= 93; i++) {
      refute(kcif.isPlane(i));
    }
    assert(kcif.isPlane(94));
    for (var i = 95; i <= 199; i++) {
      refute(kcif.isPlane(i));
    }
  },

  testIsInDock: function(){
    var ship = {
      api_id: 100,
    };
    kcif.dock = [
      { api_ship_id: 100 },
      { api_ship_id: 101 },
      { api_ship_id: -1 },
      { api_ship_id: 102 },
    ];
    assert(kcif.isInDock(ship));
    ship.api_id = 101;
    assert(kcif.isInDock(ship));
    ship.api_id = 102;
    assert(kcif.isInDock(ship));
    ship.api_id = 103;
    refute(kcif.isInDock(ship));
  },

  testIsOnMission: function(){
    refute(kcif.isOnMission(null));
    refute(kcif.isOnMission(["+ 1-2-3"]));
    refute(kcif.isOnMission(["(連合艦隊)"]));
    refute(kcif.isOnMission(["演習"]));
    assert(kcif.isOnMission(["遠征中"]));
  },

  testIsOnPractice: function(){
    refute(kcif.isOnPractice(null));
    refute(kcif.isOnPractice(["+ 1-2-3"]));
    refute(kcif.isOnPractice(["(連合艦隊)"]));
    assert(kcif.isOnPractice(["演習"]));
    refute(kcif.isOnPractice(["遠征中"]));
  },

  testIsCombined: function(){
    refute(kcif.isCombined(null));
    refute(kcif.isCombined(["+ 1-2-3"]));
    assert(kcif.isCombined(["(連合艦隊)"]));
    refute(kcif.isCombined(["演習"]));
    refute(kcif.isCombined(["遠征中"]));
  },

  testCalcSakuteki: function(){
    // TODO
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

  testForm2str: function(){
    assertEqual("単縦陣", kcif.form2str(1));
    assertEqual("自:単縦陣", kcif.form2str(1, "自"));
    // TODO
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
    assertEqual("S", kcif.judgeBattleResult([{hp: 17}, {hp: 19}, {hp: 23}, {hp: 28}, {hp: 22}, {hp: 22}], [{hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}], [1, 0, 0, 0, 0, 0], [11, 17, 49, 50, 43, 45, 11, 17, 49, 50, 43, 45]));
    assertEqual("A", kcif.judgeBattleResult([{hp: 17}, {hp: 19}, {hp: 23}, {hp: 28}, {hp: 22}, {hp: 22}], [{hp: 79}, {hp: 59}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 79}, {hp: 59}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}], [0, 0, 0, 0, 0, 0], [11, 17, 49, 50, 43, 45, 11, 17, 49, 50, 43, 45]));
    assertEqual("B", kcif.judgeBattleResult([{hp: 17}, {hp: 19}, {hp: 23}, {hp: 28}, {hp: 22}, {hp: 22}], [{hp: 79}, {hp: 59}, {hp: 27}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 79}, {hp: 59}, {hp: 0}, {hp: 0}, {hp: 0}, {hp: 0}], [0, 0, 0, 0, 0, 0], [11, 17, 49, 50, 43, 45, 11, 17, 49, 50, 43, 45]));
  },

  testJudgeLdBattleResult: function(){
    assertEqual("SS", kcif.judgeLdBattleResult([{hp: 100}], [0]));
    assertEqual("A", kcif.judgeLdBattleResult([{hp: 91}], [9]));
    assertEqual("B", kcif.judgeLdBattleResult([{hp: 90}], [10]));
    assertEqual("B", kcif.judgeLdBattleResult([{hp: 81}], [19]));
    assertEqual("C", kcif.judgeLdBattleResult([{hp: 80}], [20]));
    assertEqual("C", kcif.judgeLdBattleResult([{hp: 51}], [49]));
    assertEqual("D", kcif.judgeLdBattleResult([{hp: 50}], [50]));
    assertEqual("D", kcif.judgeLdBattleResult([{hp: 21}], [79]));
    assertEqual("E", kcif.judgeLdBattleResult([{hp: 20}], [80]));
  },

  testBattle: function(){
    // TODO
  },

  testBasic: function(){
    // TODO
  },

  testSlot_item: function(){
    // TODO
  },

  testKdock: function(){
    // TODO
    kcif.kdock([{}, {}, {}, {}]);
  },

  testNdock: function(){
    // TODO
    kcif.ndock([{}, {}, {}, {}]);
  },

  testMain: function(){
    // TODO
    kcif.main(null, null, null);
  },
});
