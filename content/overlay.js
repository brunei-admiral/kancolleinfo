// derived from http://vcraft.jp/soft/kancolle.html 0.2 by c.mos
//
// original code: https://github.com/kageroh/cond_checker
// references:
//  http://d.hatena.ne.jp/teramako/20120215/p1
//  http://www.softwareishard.com/blog/firebug/nsitraceablechannel-intercept-http-traffic/
//  http://fartersoft.com/blog/2011/03/07/using-localstorage-in-firefox-extensions-for-persistent-data-storage/

function log() {
  Services.console.logStringMessage("[kcif]: " + Array.join(arguments, " "));
}

function select_tab() {
  var elems = kcif.info_div.querySelectorAll(".tab-header");
  for (var i = 0; i < elems.length; i++) {
    elems[i].style.color = "inherit";
    elems[i].style.backgroundColor = "inherit";
  }
  elems = kcif.info_div.querySelectorAll(".tab")
  for (var i = 0; i < elems.length; i++) {
    elems[i].style.display = "none";
  }

  var tab = this.parentNode;
  tab.style.color = "white";
  tab.style.backgroundColor = "black";
  kcif.current_tab = tab.id.replace("-header", "");
  var elem = kcif.info_div.querySelector("#" + kcif.current_tab);
  if (elem) {
    elem.style.display = "block";
  }
}

function select_fleet() {
  var elems = kcif.info_div.querySelectorAll("#tab-main .fleet table");
  for (var i = 0; i < elems.length; i++) {
    elems[i].style.display = "none";
  }

  var fleet = this.parentNode.parentNode;
  var elem = kcif.info_div.querySelector("#" + fleet.id + " table");
  if (elem) {
    elem.style.display = "block";
  }

  kcif.current_fleet = fleet.id;
}

function saveConfig() {
  var str = CCIN("@mozilla.org/supports-string;1", "nsISupportsString");

  var elem = kcif.info_div.querySelector("#capture-save-dir");
  if (elem) {
    str.data = elem.value;
    myPref().setComplexValue("capture.directory", Ci.nsISupportsString, str);
  }

  elem = kcif.info_div.querySelector("#capture-save-base");
  if (elem) {
    str.data = elem.value;
    myPref().setComplexValue("capture.basename", Ci.nsISupportsString, str);
  }

  elem = kcif.info_div.querySelector("#beep-url");
  if (elem) {
    str.data = elem.value;
    myPref().setComplexValue("beep.url", Ci.nsISupportsString, str);
  }

  elem = kcif.info_div.querySelector("#beep-volume");
  if (elem) {
    myPref().setIntPref("beep.volume", elem.value);
  }

  elem = kcif.info_div.querySelector("#beep-expedition");
  if (elem) {
    myPref().setBoolPref("beep.expedition", elem.checked);
  }

  elem = kcif.info_div.querySelector("#beep-dock");
  if (elem) {
    myPref().setBoolPref("beep.dock", elem.checked);
  }

  elem = kcif.info_div.querySelector("#beep-built");
  if (elem) {
    myPref().setBoolPref("beep.built", elem.checked);
  }

  restoreCheckboxes(saveCheckboxes());
  beepOnOff();
}

function resetConfig() {
  var elem = kcif.info_div.querySelector("#capture-save-dir");
  if (elem) {
    elem.value = getCaptureSaveDir();
  }

  elem = kcif.info_div.querySelector("#capture-save-base");
  if (elem) {
    elem.value = getCaptureSaveBase();
  }

  elem = kcif.info_div.querySelector("#beep-url");
  if (elem) {
    elem.value = getBeepUrl();
  }

  elem = kcif.info_div.querySelector("#beep-volume");
  if (elem) {
    elem.value = getBeepVolume();
  }

  elem = kcif.info_div.querySelector("#beep-expedition");
  if (elem) {
    elem.checked = getBeepExpedition();
  }

  elem = kcif.info_div.querySelector("#beep-dock");
  if (elem) {
    elem.checked = getBeepDock();
  }

  elem = kcif.info_div.querySelector("#beep-built");
  if (elem) {
    elem.checked = getBeepBuilt();
  }
}

function checkConfigChanged() {
  var changed = false;

  var elem = kcif.info_div.querySelector("#capture-save-dir");
  if (elem) {
    if (elem.value != getCaptureSaveDir()) {
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#capture-save-base");
  if (elem) {
    if (elem.value != getCaptureSaveBase()) {
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#beep-url");
  if (elem) {
    if (elem.value != getBeepUrl()) {
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#beep-volume");
  if (elem) {
    if (elem.value != getBeepVolume()) {
      log("checkConfigChaned: beep-volume: [" + elem.value + "] <- [" + getBeepVolume() + "] : " + elem.value != getBeepVolume());
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#beep-expedition");
  if (elem) {
    if (elem.checked != getBeepExpedition()) {
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#beep-dock");
  if (elem) {
    if (elem.checked != getBeepDock()) {
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#beep-built");
  if (elem) {
    if (elem.checked != getBeepDock()) {
      changed = true;
    }
  }

  return changed;
}

function myPref() {
  return Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch).getBranch("extensions.kancolleinfo.");
}

function getCaptureSaveDir() {
  return myPref().getComplexValue("capture.directory", Ci.nsISupportsString).data || Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("TmpD", Ci.nsIFile).path;
}

function getCaptureSaveBase() {
  return myPref().getComplexValue("capture.basename", Ci.nsISupportsString).data || "kancolle-";
}

function getBeepUrl() {
  return myPref().getComplexValue("beep.url", Ci.nsISupportsString).data || "file:///C:/Windows/Media/ringout.wav";
}

function getBeepVolume() {
  return myPref().getIntPref("beep.volume");
}

function getBeepExpedition() {
  return myPref().getBoolPref("beep.expedition");
}

function getBeepDock() {
  return myPref().getBoolPref("beep.dock");
}

function getBeepBuilt() {
  return myPref().getBoolPref("beep.built");
}

function saveCheckboxes() {
  var checks = {};
  var elems = kcif.info_div.querySelectorAll("#tab-main input.check-timer");
  for (var i = 0; i < elems.length; i++) {
    checks[elems[i].id] = elems[i].checked;
  }
  return checks;
}

function restoreCheckboxes(checks) {
  var elems = kcif.info_div.querySelectorAll("#tab-main input.check-timer");
  for (var i = 0; i < elems.length; i++) {
    if (elems[i].className.indexOf("check-expedition") >= 0) {
      elems[i].checked = getBeepExpedition() && checks[elems[i].id] == null || checks[elems[i].id];
    }
    else if (elems[i].className.indexOf("check-dock") >= 0) {
      elems[i].checked = getBeepDock() && checks[elems[i].id] == null || checks[elems[i].id];
    }
    else if (elems[i].className.indexOf("check-built") >= 0) {
      elems[i].checked = getBeepBuilt() && checks[elems[i].id] == null || checks[elems[i].id];
    }
  }
}

function beepOnOff() {
  var url = getBeepUrl();
  if (kcif.beep && kcif.beep.src != url) {
    kcif.beep.pause();
    kcif.beep = null;
  }
  if (!kcif.beep) {
    kcif.beep = new Audio(url);
    kcif.beep.loop = true;
    kcif.load();
  }
  kcif.beep.volume = getBeepVolume() / 100.0;

  var found = false;
  var elems = kcif.info_div.querySelectorAll("#tab-main input.check-timer");
  for (var i = 0; i < elems.length; i++) {
    if (elems[i].checked) {
      var parent = elems[i].parentNode.parentNode;
      if (parent.className.indexOf("color-orange") >= 0 || parent.className.indexOf("color-red") >= 0) {
        found = true;
        break;
      }
    }
  }

  if (found) {
    kcif.beep.play();
  }
  else {
    kcif.beep.pause();
  }
}

function capture(elem, parent, scale) {
  log("capture start");
  var rect = elem.getBoundingClientRect();
  var rect2 = parent.getBoundingClientRect();
  var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
  scale = scale || 1.0;
  canvas.mozOpaque = true;
  canvas.width = rect.width;
  canvas.height = rect.height;
  var context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.drawWindow(window.content, rect.left + rect2.left + window.content.scrollX + 1, rect.top + rect2.top + window.content.scrollY, rect.width, rect.height, "white");
  return canvas.mozGetAsFile("imagedata", "image/png");
}

function saveFile(dataFile, path) {
  log("saveFile start: data=" + dataFile + ", path=" + path);
  var reader = new FileReader();
  reader.onloadend = function() {
    var file = CCIN("@mozilla.org/file/local;1", "nsILocalFile");
    file.initWithPath(path);
    file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0644);
    var stream = CCIN("@mozilla.org/network/safe-file-output-stream;1", "nsIFileOutputStream");
    stream.init(file, 0x04 | 0x08 | 0x20, 0644, 0);
    var binary = reader.result;
    log("saveFile size=" + binary.length + ", [" + binary.substr(1, 3) + "]");
    stream.write(binary, binary.length);
    if (stream instanceof Ci.nsISafeOutputStream) {
      stream.finish();
    }
    else {
      stream.close();
    }
  }
  reader.readAsBinaryString(dataFile);
}

function getPathSeparator() {
  var profD = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
  profD.append("dummy");
  profD.append("dummy");
  return profD.path.substr(profD.path.length - ("dummy".length) - 1, 1);
}

function captureAndSave() {
  log("captureAndSave start");
  var png = capture(kcif.flash, kcif.game_frame, 1.0);

  var dir = getCaptureSaveDir();
  var base = getCaptureSaveBase();
  var s = new Date().toLocaleFormat("%Y%m%d%H%M%S");
  var filename = dir + getPathSeparator() + base + s + ".png";
  saveFile(png, filename);
  log("captureAndSave finish");
}

function time2str(dt) {
  var week = "SunMonTueWedThuFriSat";
  var s = dt.toLocaleFormat("%H:%M");
  if (dt.getDate() != new Date().getDate()) {
    s = week.substr(dt.getDay() * 3, 3) + "&nbsp;" + s;
  }
  return s;
}

function getTimeColor(dt) {
  var now = new Date().getTime();
  var col = "color-default";
  if (dt.getTime() <= now) {
    col = "color-red";
  }
  else if (dt.getTime() - 60000 <= now) {
    col = "color-orange";
  }
  else if (dt.getTime() - 5 * 60000 <= now) {
    col = "color-yellow";
  }
  return col;
}

function hash2str(obj) {
  var s = "";
  for (var prop in obj) {
    if (s.length > 0) {
      s += "&";
    }
    s += prop + "=" + obj[prop];
  }
  return s;
}

function ship2str(ship) {
  if (!ship || !ship.ship_id) {
    return "";
  }
  return ship.name || "(" + ship.ship_id + ")";
}

function ship_type(ship) {
  if (!ship || !ship.ship_id) {
    return "";
  }
  switch (ship.type) {
    case 1:
      return "海防";
    case 2:
      return "駆逐";
    case 3:
      return "軽巡";
    case 4:
      return "雷巡";
    case 5:
      return "重巡";
    case 6:
      return "航巡";
    case 7:
      return "軽空";
    case 8:
      return "巡戦";
    case 9:
      return "戦艦";
    case 10:
      return "航戦";
    case 11:
      return "正空";
    case 12:
      return "超戦";
    case 13:
      return "潜水";
    case 14:
      return "潜空";
    case 15:
      return "輸送";
    case 16:
      return "水母";
    case 17:
      return "揚陸";
    case 18:
      return "装空";
    case 19:
      return "工作";
    case 20:
      return "潜母";
    default:
      return "(" + ship.type + ")";
  }
}

function ship_level(ship) {
  var col = "color-default";
  if (ship.afterlv > 0 && ship.level >= ship.afterlv) {
    col = "color-green";
  }
  if (ship.level != ship.p_level) {
    col += " blink";
  }
  return '<td class="ship-level ' + col + '">' + ship.level + '</td>';
}

function ship_hp(ship) {
  var col = "color-default";
  if (ship.hp <= ship.hp_max / 4) {
    col = "color-red";
  }
  else if (ship.hp <= ship.hp_max / 2) {
    col = "color-orange";
  }
  else if (ship.hp <= ship.hp_max * 3 / 4) {
    col = "color-yellow";
  }
  else if (ship.hp >= ship.hp_max) {
    col = "color-green";
  }
  if (ship.p_hp != ship.hp) {
    col += " blink";
  }
  return '<td class="ship-hp ' + col + '">' + ship.hp + '/' + ship.hp_max + '</td>';
}

function ship_cond(ship) {
  var col = "color-default";
  if (ship.cond < 20) {
    col = "color-red";
  }
  else if (ship.cond < 30) {
    col = "color-orange";
  }
  else if (ship.cond < 40) {
    col = "color-yellow";
  }
  else if (ship.cond >= 50) {
    col = "color-green";
  }
  var diff = ship.cond - ship.p_cond;
  if (ship.cond != ship.p_cond) {
    col += " blink";
  }
  return '<td class="ship-cond ' + col + '">' + ship.cond + '</td>';
}

function ship_fuel(ship) {
  var col = "color-default";
  if (ship.fuel == 0) {
    col = "color-red";
  }
  else if (ship.fuel < ship.fuel_max / 2.0) {
    col = "color-orange";
  }
  else if (ship.fuel < ship.fuel_max) {
    col = "color-yellow";
  }
  else {
    col = "color-green";
  }
  if (ship.fuel != ship.p_fuel) {
    col += " blink";
  }
  return '<td class="ship-fuel ' + col + '">' + Math.floor(ship.fuel * 100 / ship.fuel_max) + '%</td>';
}

function ship_bull(ship) {
  var col = "color-default";
  if (ship.bull == 0) {
    col = "color-red";
  }
  else if (ship.bull < ship.bull_max / 2.0) {
    col = "color-orange";
  }
  else if (ship.bull < ship.bull_max) {
    col = "color-yellow";
  }
  else {
    col = "color-green";
  }
  if (ship.bull != ship.p_bull) {
    col += " blink";
  }
  return '<td class="ship-bull ' + col + '">' + Math.floor(ship.bull * 100 / ship.bull_max) + '%</td>';
}

function map2str(map) {
  var cell = "-";
  if (map.api_no == map.api_bosscell_no) {
    cell = "*";
  }
  else if (map.api_enemy) {
    cell = "+";
  }
  return cell + " " + map.api_maparea_id + "-" + map.api_mapinfo_no + "-" + map.api_no;
}

function kouku_damage(deck, enemies, kouku) {
  if (kouku) {
    var damage_list = kouku.api_fdam;
    var id_list = deck.api_ship;
    for (var i = 0, id; (id = id_list[i]) && id != -1; i++) {
      if (damage_list[i + 1] >= 0 && (kouku.api_frai_flag[i + 1] > 0 || kouku.api_fbak_flag[i + 1] > 0)) {
        var damage = Math.floor(damage_list[i + 1]);
        log("    ship " + (i + 1) + "(" + String(id) + ") damaged " + damage);
        var ship = kcif.ship_list[String(id)];
        ship.hp -= damage;
      }
    }

    damage_list = kouku.api_edam;
    for (var i = 0; i < 6; i++) {
      if (enemies[i]) {
        if (damage_list[i + 1] >= 0 && (kouku.api_erai_flag[i + 1] > 0 || kouku.api_ebak_flag[i + 1] > 0)) {
          var damage = Math.floor(damage_list[i + 1]);
          enemies[i].hp -= damage;
        }
      }
    }
  }
}

function raigeki_damage(deck, enemies, raigeki) {
  var damage_list = raigeki.api_fdam;
  var id_list = deck.api_ship;
  for (var i = 0, id; (id = id_list[i]) && id != -1; i++) {
    if (damage_list[i + 1] >= 0 && raigeki.api_erai.indexOf(i + 1) != -1) {
      var damage = Math.floor(damage_list[i + 1]);
      log("    ship " + (i + 1) + "(" + String(id) + ") damaged " + damage);
      var ship = kcif.ship_list[String(id)];
      ship.hp -= damage;
    }
  }

  damage_list = raigeki.api_edam;
  for (var i = 0; i < 6; i++) {
    if (enemies[i]) {
      if (damage_list[i + 1] >= 0 && raigeki.api_frai.indexOf(i + 1) != -1) {
        var damage = Math.floor(damage_list[i + 1]);
        enemies[i].hp -= damage;
      }
    }
  }
}

function hougeki_damage(deck, enemies, hougeki) {
  for (var i = 1, t_list; t_list = hougeki.api_df_list[i]; i++) {
    for (var j = 0, target; target = t_list[j]; j++) {
      var damage = Math.floor(hougeki.api_damage[i][j]);
      if (target >= 1 && target <= 6) {
        var id = deck.api_ship[target - 1];
        log("    ship " + target + "(" + String(id) + ") damaged " + damage);
        var ship = kcif.ship_list[String(id)];
        ship.hp -= damage;
      }
      else if (target >= 7 && target <= 12) {
        if (enemies[target - 7]) {
          enemies[target - 7].hp -= damage;
        }
      }
    }
  }
}

function battle(url, json) {
  try {
    var deck_id = json.api_data.api_dock_id || json.api_data.api_deck_id;
    if (url.indexOf("combined") != -1 && url.indexOf("midnight") != -1) {
      // if it's combined fleet and midnight battle, it must be 2nd fleet.
      deck_id = 2;
    }
    if (json.api_data.api_formation) {
      var s = "";
      switch (json.api_data.api_formation[2]) {
        case 1:
          s = "同航戦";
          break;
        case 2:
          s = "反航戦";
          break;
        case 3:
          s = "T字有利";
          break;
        case 4:
          s = "T字不利";
          break;
      }
      kcif.mission[deck_id - 1] += " " + s;
    }

    // enemies
    var enemies = [];
    if (json.api_data.api_nowhps && json.api_data.api_maxhps) {
      for (var i = 0; i < 6; i++) {
        enemies[i] = {
          hp: json.api_data.api_nowhps[i + 7],
          hp_max: json.api_data.api_maxhps[i + 7]
        };
      }
    }

    for (var i = 0, deck; deck = kcif.deck_list[i]; i++) {
      if (deck.api_id == deck_id) {
        if (json.api_data.api_kouku) {
          log("  kouku");
          kouku_damage(deck, enemies, json.api_data.api_kouku.api_stage3);
          if (url.indexOf("combined") != -1 && json.api_data.api_kouku.api_stage3_combined) {
            // must be 2nd fleet
            log("  kouku (2nd)");
            kouku_damage(kcif.deck_list[1], json.api_data.api_kouku.api_stage3_combined);
          }
        }
        if (json.api_data.api_kouku2) { // combined air battle
          log("  kouku2");
          kouku_damage(deck, enemies, json.api_data.api_kouku2.api_stage3);
          if (url.indexOf("combined") != -1 && json.api_data.api_kouku2.api_stage3_combined) {
            // must be 2nd fleet
            log("  kouku2 (2nd)");
            kouku_damage(kcif.deck_list[1], json.api_data.api_kouku2.api_stage3_combined);
          }
        }
        if (json.api_data.api_support_info) {
          var support = json.api_data.api_support_info;
          if (support.api_support_airatack) {
            log("  support (airatack)");
            var damage = support.api_support_airatack.api_damage;
            for (var i = 0; i < 6; i++) {
              if (damage[i + 1] > 0 && enemies[i]) {
                enemies[i].hp -= Math.floor(damage[i + 1]);
              }
            }
          }
          else if (support.api_support_hourai) {
            log("  support (hourai)");
            var damage = support.api_support_hourai.api_damage;
            for (var i = 0; i < 6; i++) {
              if (damage[i + 1] > 0 && enemies[i]) {
                enemies[i].hp -= Math.floor(damage[i + 1]);
              }
            }
          }
        }
        if (json.api_data.api_opening_atack) {
          log("  opening");
          if (url.indexOf("combined") != -1) {
            // must be 2nd fleet
            raigeki_damage(kcif.deck_list[1], enemies, json.api_data.api_opening_atack);
          }
          else {
            raigeki_damage(deck, enemies, json.api_data.api_opening_atack);
          }
        }
        if (json.api_data.api_hougeki) { // midnight battle
          log("  hougeki (midnight)");
          hougeki_damage(deck, enemies, json.api_data.api_hougeki);
        }
        if (json.api_data.api_hougeki1) {
          log("  hougeki1");
          if (url.indexOf("combined") != -1) {
            // must be 2nd fleet
            hougeki_damage(kcif.deck_list[1], enemies, json.api_data.api_hougeki1);
          }
          else {
            hougeki_damage(deck, enemies, json.api_data.api_hougeki1);
          }
        }
        if (json.api_data.api_hougeki2) {
          log("  hougeki2");
          hougeki_damage(deck, enemies, json.api_data.api_hougeki2);
        }
        if (json.api_data.api_raigeki) {
          log("  raigeki");
          if (url.indexOf("combined") != -1) {
            // must be 2nd fleet
            raigeki_damage(kcif.deck_list[1], enemies, json.api_data.api_raigeki);
          }
          else {
            raigeki_damage(deck, enemies, json.api_data.api_raigeki);
          }
        }
        if (json.api_data.api_hougeki3) { // combined battle
          log("  hougeki3");
          hougeki_damage(deck, enemies, json.api_data.api_hougeki3);
        }
        break;
      }
    }

    var s = "";
    for (var i = 0; i < 6; i++) {
      if (enemies[i] && enemies[i].hp_max > 0) {
        if (enemies[i].hp > enemies[i].hp_max * 3 / 4) {
          s += "<span class='color-green'>◎</span>";
        }
        else if (enemies[i].hp > enemies[i].hp_max / 2) {
          s += "<span class='color-yellow'>◎</span>";
        }
        else if (enemies[i].hp > enemies[i].hp_max / 4) {
          s += "<span class='color-orange'>○</span>";
        }
        else if (enemies[i].hp > 0) {
          s += "<span class='color-red'>△</span>";
        }
        else if (enemies[i].hp <= 0) {
          s += "<span class='color-gray'>×</span>";
        }
      }
    }
    var n = kcif.mission[deck_id - 1].indexOf(" <span style=");
    if (n != -1) {
      kcif.mission[deck_id - 1] = kcif.mission[deck_id - 1].substring(0, n);
    }
    kcif.mission[deck_id - 1] += " <span style='letter-spacing: -2px;'>" + s + "</span>";
  }
  catch (exc) {
    log("  failed: " + String(exc));
  }
}

function kcifCallback(request, content, query) {
  if (kcif.timer) {
    window.clearTimeout(kcif.timer);
    kcif.timer = null;
  }

  var url = request ? request.name : "";
  var n = content ? content.indexOf("=") : -1;
  var json = n >= 0 ? JSON.parse(content.substring(n + 1)) : null;
  if (url.indexOf("/deck_port") != -1 || url.indexOf("/deck") != -1) {
    var deck_list = json.api_data;
    for (var i = 0, deck; deck = deck_list[i]; i++) {
      if (deck.api_mission[2] > 0) {
        kcif.mission[i] = deck.api_mission[2];
      }
      else if (!isNaN(Number(kcif.mission[i]))) {
        kcif.mission[i] = null;
      }
      log("deck mission: " + i + ": " + kcif.mission[i]);
    }
  }
  else if (url.indexOf("/kdock") != -1 || url.indexOf("/getship") != -1) {
    var dock_list = url.indexOf("/kdock") != -1 ? json.api_data : json.api_data.api_kdock;
    for (var i = 0, dock; dock = dock_list[i]; i++) {
      kcif.build[i] = dock;
      log("kdock: " + kcif.build[i].api_id + ": " + kcif.build[i].api_complete_time);
    }
    if (url.indexOf("/getship") != -1) {
      kcif.ship_num++;
      kcif.item_num += json.api_data.api_slotitem.length;
      log("getship: " + String(kcif.ship_num) + " ships, " + String(kcif.item_num) + " items");
    }
  }
  else if (url.indexOf("/ndock") != -1) {
    var dock_list = json.api_data;
    for (var i = 0, dock; dock = dock_list[i]; i++) {
      kcif.repair[i] = dock;
      log("ndock: " + kcif.repair[i].api_id + ": " + kcif.repair[i].api_complete_time);
    }
  }
  else if (url.indexOf("/destroyship") != -1) {
    kcif.ship_num--;
    kcif.item_num -= kcif.ship_list[String(query.api_ship_id)].slot.filter(function(e){return e >= 0;}).length;
    log("destroyship: " + String(kcif.ship_num) + " ships, " + String(kcif.item_num) + " items");
  }
  else if (url.indexOf("/createitem") != -1) {
    if (json.api_data.api_create_flag > 0) {
      kcif.item_num++;
    }
    log("createitem: " + String(kcif.item_num) + " items");
  }
  else if (url.indexOf("/destroyitem2") != -1) {
    kcif.item_num -= query.api_slotitem_ids.split(",").length;
    log("destroyitem2: " + String(kcif.item_num) + " items");
  }
  else if (url.indexOf("/powerup") != -1) {
    var id_list = query["api_id_items"].split(",");
    kcif.ship_num -= id_list.length;
    for (var i = 0, id; (id = id_list[i]) && i < id_list.length; i++) {
      kcif.item_num -= kcif.ship_list[String(id)].slot.filter(function(e){return e >= 0;}).length;
    }
    log("powerup: " + String(kcif.ship_num) + " ships, " + String(kcif.item_num) + " items");
  }
  else if (url.indexOf("/api_start2") != -1) {
    var mst_ship = json.api_data.api_mst_ship;
    var master = {};
    for (var i = 0, ship; ship = mst_ship[i]; i++) {
      master[ship.api_id] = {
        ship_id: ship.api_id,
        name: ship.api_name,
        type: ship.api_stype,
        afterlv: ship.api_afterlv,
        sort_no: ship.api_sortno,
        fuel_max: ship.api_fuel_max,
        bull_max: ship.api_bull_max
      };
    }
    kcif.ship_master = master;
    log("ship_master parsed");
    return;
  }
  else if (url.indexOf("/basic") != -1) {
    kcif.ship_max = Number(json.api_data.api_max_chara);
    kcif.item_max = Number(json.api_data.api_max_slotitem) + 3;
    log("basic: ship_max=" + String(kcif.ship_max) + ", item_max=" + String(kcif.item_max));
    return;
  }
  else if (url.indexOf("/record") != -1) {
    kcif.ship_num = Number(json.api_data.api_ship[0]);
    kcif.ship_max = Number(json.api_data.api_ship[1]);
    kcif.item_num = Number(json.api_data.api_slotitem[0]);
    kcif.item_max = Number(json.api_data.api_slotitem[1]) + 3;
    log("record: ship=" + String(kcif.ship_num) + "/" + String(kcif.ship_max) + ", item=" + String(kcif.item_num) + "/" + String(kcif.item_max));
  }
  else if (url.indexOf("/slot_item") != -1) {
    kcif.item_num = json.api_data.length;
    log("slot_item: " + String(kcif.item_num) + " items");
    return;
  }
  else if (url.indexOf("/charge") != -1) {
    for (var i = 0, data; data = json.api_data.api_ship[i]; i++) {
      var ship = kcif.ship_list[String(data.api_id)];
      if (ship) {
        ship.p_fuel = data.api_fuel;
        ship.fuel = data.api_fuel;
        ship.p_bull = data.api_bull;
        ship.bull = data.api_bull;
      }
    }
    log("charged");
  }
  else if (url.indexOf("battle") != -1) {
    log("battle: " + url);
    var deck_id = json.api_data.api_dock_id || json.api_data.api_deck_id;
    var deck = Number(deck_id);
    if (url.indexOf("practice") != -1 && (!kcif.mission[deck - 1] || kcif.mission[deck - 1].indexOf("演習") == -1)) {
      kcif.mission[deck - 1] = "演習";
    }
    battle(url, json);
  }
  else if (url.indexOf("_map/start") != -1) {
    var deck = Number(query["api_deck_id"]);
    if (deck > 0) {
      kcif.mission[deck - 1] = map2str(json.api_data);
    }
  }
  else if (url.indexOf("_map/next") != -1) {
    for (var i = 0, deck; deck = kcif.mission[i]; i++) {
      if (deck && isNaN(Number(deck))) {
        kcif.mission[i] = map2str(json.api_data);
        break;
      }
    }
  }
  else if (url.indexOf("/ship") != -1 || url.indexOf("/port") != -1) {
    var port = url.indexOf("/port") != -1;
    var ship2 = url.indexOf("/ship2") != -1;
    var data_list = port ? json.api_data.api_ship : ship2 ? json.api_data : json.api_data.api_ship_data;
    var deck_list = port ? json.api_data.api_deck_port : ship2 ? json.api_data_deck : json.api_data.api_deck_data;
    if (port) {
      for (var i = 0, deck; deck = deck_list[i]; i++) {
        kcif.mission[i] = deck.api_mission[2];
      }

      var dock_list = json.api_data.api_ndock;
      for (var i = 0, dock; dock = dock_list[i]; i++) {
        kcif.repair[i] = dock;
      }

      kcif.ship_max = Number(json.api_data.api_basic.api_max_chara);
      kcif.item_max = Number(json.api_data.api_basic.api_max_slotitem) + 3;
    }
    kcif.deck_list = deck_list;

    var i = 0;
    for (var data; data = data_list[i]; i++) {
      var api_id = String(data.api_id);
      var ship = kcif.ship_list[api_id];
      kcif.ship_list[api_id] = {
        api_id: api_id,
        ship_id: data.api_ship_id,
        p_level: ship ? ship.level : data.api_lv,
        level: data.api_lv,
        p_cond: ship ? ship.cond : data.api_cond,
        cond: data.api_cond,
        p_hp: ship ? ship.hp : data.api_nowhp,
        hp: data.api_nowhp,
        hp_max: data.api_maxhp,
        p_fuel: ship ? ship.fuel : data.api_fuel,
        fuel: data.api_fuel,
        p_bull: ship ? ship.bull : data.api_bull,
        bull: data.api_bull,
        slot: data.api_slot
      };
      if (kcif.ship_master[data.api_ship_id]) {
        kcif.ship_list[api_id].name = kcif.ship_master[data.api_ship_id].name;
        kcif.ship_list[api_id].type = kcif.ship_master[data.api_ship_id].type;
        kcif.ship_list[api_id].afterlv = kcif.ship_master[data.api_ship_id].afterlv;
        kcif.ship_list[api_id].sort_no = kcif.ship_master[data.api_ship_id].sort_no;
        kcif.ship_list[api_id].fuel_max = kcif.ship_master[data.api_ship_id].fuel_max;
        kcif.ship_list[api_id].bull_max = kcif.ship_master[data.api_ship_id].bull_max;
      }
    }
    if (port || ship2) {
      kcif.ship_num = i;
    }

    log("etc: " + String(kcif.ship_num) + " ships (" + (port ? "port" : ship2 ? "ship2" : "ship3") + ")");
  }
  else {
    //log("timer(?): " + url + " , query: " + hash2str(query));
  }

  kcif.render_info(url != "");

  if (kcif.timer) {
    window.clearTimeout(kcif.timer);
    kcif.timer = null;
  }
  kcif.timer = window.setTimeout(kcifCallback, 10 * 1000);
}

function parseQuery(query) {
  var vars = query.split("&");
  var result = {};
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=", 2);
    var key = pair[0].replace(/%([0-9A-F][0-9A-F])/gi, function(a, s){return String.fromCharCode(parseInt(s, 16));});
    var val = pair[1].replace(/%([0-9A-F][0-9A-F])/gi, function(a, s){return String.fromCharCode(parseInt(s, 16));});
    result[key] = val;
    //log("query: " + key + " = " + val);
  }
  return result;
}

// Helper function to read post text (derived from Firebug)
function readPostTextFromRequest(request, context) {
  try {
    var channel = request.QueryInterface(Ci.nsIUploadChannel);
    var stream = channel.uploadStream;
    var ss = stream.QueryInterface(Ci.nsISeekableStream);

    var offset = stream.tell();
    ss.seek(Ci.nsISeekableStream.NS_SEEK_SET, 0);

    var sis = CCIN("@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream");
    sis.init(stream);

    var segments = [];
    for (var count = stream.available(); count; count = stream.available()) {
        segments.push(sis.readBytes(count));
    }

    var text = segments.join("");

    ss.seek(Ci.nsISeekableStream.NS_SEEK_SET, offset);

    var index = text.indexOf("\r\n\r\n");
    if (index != -1) {
      text = text.substring(index + 4);
    }

    return text;
  }
  catch (exc) {
    log("readPostTextFromRequest failed: " + String(exc));
  }
  return null;
}

// Helper function for XPCOM instanciation (from Firebug)
function CCIN(cName, ifaceName) {
  return Cc[cName].createInstance(Ci[ifaceName]);
}

// Copy response listener implementation.
function TracingListener() {
  this.originalListener = null;
  this.receivedData = [];   // array for incoming data.
}

TracingListener.prototype = {
  onDataAvailable: function(request, context, inputStream, offset, count) {
    var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1", "nsIBinaryInputStream");
    var storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
    var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1", "nsIBinaryOutputStream");
    binaryInputStream.setInputStream(inputStream);
    storageStream.init(8192, count, null);
    binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

    // Copy received data as they come.
    var data = binaryInputStream.readBytes(count);
    this.receivedData.push(data);

    binaryOutputStream.writeBytes(data, count);

    this.originalListener.onDataAvailable(request, context,
        storageStream.newInputStream(0), offset, count);
  },

  onStartRequest: function(request, context) {
    this.originalListener.onStartRequest(request, context);
  },

  onStopRequest: function(request, context, statusCode) {
    var query = null;
    if (request.requestMethod.toLowerCase() == "post") {
      var postText = readPostTextFromRequest(request, context);
      if (postText) {
        query = parseQuery(String(postText));
      }
    }
    this.originalListener.onStopRequest(request, context, statusCode);
    // Get entire response
    var responseSource = this.receivedData.join("");

    kcifCallback(request, responseSource, query);
  },

  QueryInterface: function(aIID) {
    if (aIID.equals(Ci.nsIStreamListener) ||
        aIID.equals(Ci.nsISupports)) {
      return this;
    }
    throw Components.results.NS_NOINTERFACE;
  }
}

const TOPIC = "http-on-examine-response";

var kcifHttpObserver = {
  observe: function (aSubject, aTopic, aData) {
    if (aTopic !== TOPIC) return;

    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
    var path = httpChannel.URI.path;
    if (path.match(/\/kcsapi\/(api_start2|api_get_member\/(ship[23]|basic|record|deck|kdock|ndock|slot_item)|api_port\/port|api_req_kousyou\/(getship|destroyship|createitem|destroyitem2)|api_req_kaisou\/powerup|api_req_hokyu\/charge|api_req_sortie\/battle|api_req_battle_midnight\/(battle|sp_midnight)|api_req_combined_battle\/((air|midnight_)?battle|sp_midnight)|api_req_practice\/(midnight_)?battle|api_req_map\/(start|next))$/)) {
      log("create TracingListener: " + path);
      var newListener = new TracingListener();
      aSubject.QueryInterface(Ci.nsITraceableChannel);
      newListener.originalListener = aSubject.setNewListener(newListener);
    }
  },

  QueryInterface: XPCOMUtils.generateQI(["nsIObserver"])
};

var kcif = {
  game_frame: null,
  flash: null,
  info_div: null,
  current_tab: "tab-main",
  current_fleet: "fleet1",
  beep: null,
  storage: null,
  ship_master: {},
  ship_list: {},
  mission: [],
  repair: [],
  build: [],
  deck_list: [],
  ship_num: 0,
  ship_max: 0,
  item_num: 0,
  item_max: 0,
  timer: null,

  init: function(event) {
    log("init");
  
    var url = "http://www.dmm.com/netgame/social/-/gadgets/=/app_id=854854/";
    var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var ssm = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
    var dsm = Cc["@mozilla.org/dom/storagemanager;1"].getService(Ci.nsIDOMStorageManager);
    var uri = ios.newURI(url, "", null);
    var principal = ssm.getCodebasePrincipal(uri);
    kcif.storage = dsm.getLocalStorageForPrincipal(principal, "");

    Services.obs.addObserver(kcifHttpObserver, TOPIC, false);
  },
  
  destroy: function(event) {
    log("destroy");
    Services.obs.removeObserver(kcifHttpObserver, TOPIC);
  },
  
  putStorage: function(key, s) {
    kcif.storage.setItem(key, s);
  },

  getStorage: function(key) {
    return kcif.storage.getItem(key);
  },

  onLoad: function(event) {
    var doc = event.originalTarget;
    var url = doc.location.href;
    if (url.match(/osapi\.dmm\.com\//)) {
      log("DOMloaded:", url);

      var div = doc.createElement("div");
      var elem = doc.querySelector("#sectionWrap");
      if (elem) {
        elem.parentNode.insertBefore(div, elem);
      }
      else {
        doc.body.appendChild(div);
      }
      kcif.info_div = div;

      // スタイルシート
      var sheet = (function(){
        var style = doc.createElement("style");
        doc.head.appendChild(style);
        return style.sheet;
      })();
      sheet.insertRule('#kancolle-info { width: 800px; height: 310px; margin-left: auto; margin-right: auto; color: white; background-color: black; font-size: 10pt; font-family: Verdana, "游ゴシック", YuGothic, "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; text-align: left; }', sheet.length);
      sheet.insertRule('#kancolle-info * { font-family: Verdana, "游ゴシック", YuGothic, "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-headers { color: #ccc; background-color: #444; line-height: 1.5; font-weight: bold; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab-header { display: inline; border-top: gray solid 1px; border-left: gray solid 1px; border-right: gray solid 1px; padding: 1px 12px 2px 12px; }', sheet.length);
      sheet.insertRule('#kancolle-info #base-info { float: right; margin-right: 8px; color: white; font-weight: normal; }', sheet.length);
      sheet.insertRule('#kancolle-info #base-info button { height: 21px; position: relative; top: -1px; font-size: 10px; }', sheet.length);
      sheet.insertRule('#kancolle-info #updated { font-weight: bold; color: lightgreen; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab-header a { color: inherit; text-decoration: none; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab-header a:hover { color: yellow; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab { padding: 2px 8px 2px 8px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab h2 { font-size: 10pt; font-weight: normal; padding: 0; margin: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab a { color: skyblue; text-decoration: none; font-weight: bold; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab a:hover { color: yellow; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab h2 .fleet-name { float: right; color: #ccc; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab table { color: inherit; font-size: 10pt; padding: 0; margin: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab table tr { padding: 0; margin: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab table th, #kancolle-info .tab table td { padding: 0; margin: 0; line-height: 1.2; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-no { text-align: right; padding: 0 6px 0 4px; width: 1.8em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-type { width: 2.7em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-name { font-weight: bold; width: 120px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-level, #kancolle-info .tab .ship-cond { text-align: right; width: 2.7em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-hp { text-align: right; width: 4em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-at { text-align: right; width: 7em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-fuel, #kancolle-info .tab .ship-bull { text-align: right; width: 3.8em; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-main #ndock { width: 482px; float: left; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-main #kdock { width: 302px; float: left; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-main table { position: relative; top: -3px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-main input.check-timer { padding: 0; margin: 0 0 0 4px; position: relative; top: 2px;}', sheet.length);
      sheet.insertRule('#kancolle-info #tab-ships .table-outer { position: relative; padding-top: 20px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-ships .table-inner { height: 256px; overflow: auto; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-ships table thead { position: absolute; top: 0px; left: 0px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-ships th { text-align: left; font-weight: bold; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-ships a.sort-current { color: yellow; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-header { text-align: right; width: 12em; padding: 2px 16px 0 0; color: skyblue; text-decoration: none; font-weight: bold; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-label { text-align: right; width: 12em; padding-right: 16px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-input { text-align: left; width: 40em; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-input .input-text { width: 100%; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-input .input-number { width: 4em !important; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config div.config-buttons { text-align: center; }', sheet.length);
      sheet.insertRule('#kancolle-info .color-green { color: lightgreen; }', sheet.length);
      sheet.insertRule('#kancolle-info .color-yellow { color: yellow; }', sheet.length);
      sheet.insertRule('#kancolle-info .color-orange { color: orange; }', sheet.length);
      sheet.insertRule('#kancolle-info .color-red { color: red; }', sheet.length);
      sheet.insertRule('#kancolle-info .color-gray { color: silver; }', sheet.length);
      sheet.insertRule('#kancolle-info .color-default { color: inherit; }', sheet.length);
      sheet.insertRule('#kancolle-info .blink { -moz-animation: blink 1.0s ease-in-out infinite alternate; }', sheet.length);
      sheet.insertRule('@-moz-keyframes blink { 0% {background-color: rgba(240,208,0,0.5);} 60% {background-color: inherit;} 100% {background-color: inherit;} }', sheet.length);

      log("create div");
      kcif.flash = doc.querySelector("#flashWrap");

      kcif.render_frame();
    }
    else if (url.match(/\/app_id=854854\//)) {
      log("DOMloaded:", url);
      var area_game = doc.querySelector("#area-game");
      if (area_game) {
        area_game.style.height = '920px';
      }
      var game_frame = doc.querySelector("#game_frame");
      if (game_frame) {
        game_frame.style.height = '920px';
        kcif.game_frame = game_frame;
      }

      doc.body.setAttribute("onload", "if (DMM && DMM.netgame) DMM.netgame.reloadDialog = function(){};");
    }
  },
  
  timeStamp: function() {
    var dt = new Date();
    return dt.toLocaleFormat("%H:%M");
  },

  render_frame: function() {
    if (kcif.info_div) {
      var html = "";
      html += '<div id="kancolle-info">';
      html += '<div id="tab-headers">';
      html += '<div id="tab-header-main" class="tab-header"><a href="#">メイン</a></div>';
      html += '<div id="tab-header-ships" class="tab-header"><a href="#">艦娘</a></div>';
      html += '<div id="tab-header-items" class="tab-header"><a href="#">装備</a></div>';
      html += '<div id="tab-header-config" class="tab-header"><a href="#">設定</a></div>';
      html += '<div id="base-info"><button id="capture">画面キャプチャ</button></div>';
      html += '</div>';

      html += '<div id="tab-main" class="tab">';
      html += '<span class="color-yellow blink">Loading...</span>';
      html += '</div>';

      html += '<div id="tab-ships" class="tab">';
      html += '<span class="color-yellow blink">Loading...</span>';
      html += '</div>';

      html += '<div id="tab-items" class="tab">';
      html += '<span class="color-red">※未実装です。表示内容に意味はありません。</span>';
      html += '</div>';

      html += '<div id="tab-config" class="tab">';
      html += '<table>';
      html += '<tr><td class="config-header">画面キャプチャ</td><td></td></tr>';
      html += '<tr><td class="config-label">保存先</td><td class="config-input"><input id="capture-save-dir" class="input-text" value="' + getCaptureSaveDir() + '"></td></tr>';
      html += '<tr><td class="config-label">ベース名</td><td class="config-input"><input id="capture-save-base" class="input-text" value="' + getCaptureSaveBase() + '"></td></tr>';
      html += '<tr><td class="config-header">タイマーサウンド</td><td></td></tr>';
      html += '<tr><td class="config-label">サウンドファイルURL</td><td class="config-input"><input id="beep-url" class="input-text" value="' + getBeepUrl() + '"></td></tr>';
      html += '<tr><td class="config-label">ボリューム(0～100)</td><td class="config-input"><input id="beep-volume" class="input-text input-number" type="number" max="100" min="0" value="' + getBeepVolume() + '"> <button id="beep-test">テスト</button></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="beep-expedition" type="checkbox" class="input-checkbox"' + (getBeepExpedition() ? ' checked' : '') + '>遠征帰還時のサウンド再生を自動でONにする</label></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="beep-dock" type="checkbox" class="input-checkbox"' + (getBeepDock() ? ' checked' : '') + '>入渠終了時のサウンド再生を自動でONにする</label></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="beep-built" type="checkbox" class="input-checkbox"' + (getBeepBuilt() ? ' checked' : '') + '>建造終了時のサウンド再生を自動でONにする</label></td></tr>';
      html += '</table>';
      html += '<div class="config-buttons">';
      html += '<button id="config-save">保存</button>';
      html += '<button id="config-reset">クリア</button>';
      html += '</div>';
      html += '</div>';

      html += '</div>';

      kcif.info_div.innerHTML = html;

      // キャプチャボタン
      var elem = kcif.info_div.querySelector("#capture");
      if (elem) {
        elem.addEventListener("click", captureAndSave, false, true);
      }

      // タブ
      var elems = kcif.info_div.querySelectorAll(".tab-header a");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", select_tab, true);
      }
      var elem = kcif.info_div.querySelector("#" + kcif.current_tab.replace("-", "-header-") + " a");
      if (elem) {
        elem.click();
      }

      // 設定:テキスト
      var elems = kcif.info_div.querySelectorAll("#tab-config input.input-text");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("input", function() {
          kcif.info_div.querySelector("#config-save").disabled = !checkConfigChanged();
        }, false);
      }

      // 設定:チェックボックス
      var elems = kcif.info_div.querySelectorAll("#tab-config input.input-checkbox");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", function() {
          kcif.info_div.querySelector("#config-save").disabled = !checkConfigChanged();
        }, false);
      }

      // 設定:保存
      var elem = kcif.info_div.querySelector("#config-save");
      if (elem) {
        elem.addEventListener("click", saveConfig, true, true);
        elem.disabled = true;
      }

      // 設定:クリア
      var elem = kcif.info_div.querySelector("#config-reset");
      if (elem) {
        elem.addEventListener("click", resetConfig, true, true);
      }

      // 設定:タイマーサウンドテスト
      var elem = kcif.info_div.querySelector("#beep-test");
      if (elem) {
        var beeptest = null;
        elem.addEventListener("click", function() {
          var url = kcif.info_div.querySelector("#beep-url").value;
          if (beeptest && beeptest.src != url) {
            log("beeptest: url=[" + url + "], src=[" + beeptest.src + "]");
            beeptest.pause();
            beeptest = null;
          }
          if (!beeptest) {
            beeptest = new Audio(url);
            beeptest.loop = true;
            beeptest.volume = kcif.info_div.querySelector("#beep-volume").value / 100.0;
            beeptest.load();
          }
          if (beeptest.paused) {
             beeptest.play();
          }
          else {
             beeptest.pause();
          }
        }, true, true);
      }

      // タイマーサウンド設定
      kcif.beep = new Audio(getBeepUrl());
      if (kcif.beep) {
        kcif.beep.loop = true;
        kcif.beep.volume = getBeepVolume() / 100.0;
        kcif.beep.load();
      }
    }
  },

  render_info: function(all) {
    if (kcif.info_div) {
      kcif.game_frame.style.height = '920px'; // なぜかここでないとダメ
      var html = "";

      // ベース
      var base = kcif.info_div.querySelector("#base-info");
      var ship_col = 'color-default';
      if (kcif.ship_num >= kcif.ship_max) {
        ship_col = 'color-red';
      }
      else if (kcif.ship_num >= kcif.ship_max - 4) {
        ship_col = 'color-orange';
      }
      else if (kcif.ship_num >= kcif.ship_max - 8) {
        ship_col = 'color-yellow';
      }
      var item_col = 'color-default';
      if (kcif.item_num >= kcif.item_max - 3) {
        item_col = 'color-red';
      }
      else if (kcif.item_num >= kcif.item_max - 4 * 4 -3) {
        item_col = 'color-orange';
      }
      else if (kcif.item_num >= kcif.item_max - 8 * 4 - 3) {
        item_col = 'color-yellow';
      }
      html += '<span class="' + ship_col + '">' + kcif.ship_num + '</span>/' + kcif.ship_max + ' ships; <span class="' + item_col + '">' + kcif.item_num + '</span>/' + kcif.item_max + ' items <span id="updated">' + (new Date()).toLocaleFormat("%H:%M") + '更新</span> <button id="capture">画面キャプチャ</button>';
      base.innerHTML = html;

      // ベース:キャプチャボタン
      var elem = base.querySelector("#capture");
      if (elem) {
        elem.addEventListener("click", captureAndSave, false, true);
      }

      // メイン
      var maintab = kcif.info_div.querySelector("#tab-main");
      var checks = saveCheckboxes();
      html = "";
      for (var i = 0; i < 4; i++) {
        var deck = kcif.deck_list[i];
        html += '<div id="fleet' + (i + 1) + '" class="fleet">';
        var col = "color-default";
        var t = kcif.mission[i];
        var s = null;
        if (t && !isNaN(Number(t))) {
          var dt = new Date(t);
          s = "[遠征中 <label>" + time2str(dt) + "<input id='check-fleet" + (i + 1) + "' type='checkbox' class='check-timer check-expedition'></label>]";
          col = getTimeColor(dt);
        }
        else if (t) {
          s = "[出撃中 " + t + "]";
          col = "color-green";
        }
        if (s) {
          s = ' <span class="' + col + '">' + s + '</span>';
        }
        else if (deck) {
          s = "";
          for (var j = 0, id; id = deck.api_ship[j]; j++) {
            if (id === -1 || id == null) {
              break;
            }
            var ship = kcif.ship_list[String(id)];
            if (ship.fuel < ship.fuel_max || ship.bull < ship.bull_max) {
              s = ' <span class="color-orange blink">未補給艦あり</span>';
              break;
            }
          }
        }
        if (deck) {
          html += '<h2><a href="#">第' + (i + 1) + '艦隊</a>' + s + '<span class="fleet-name">「' + deck.api_name + '」</span></h2>';
        }
        else {
          html += '<h2><a href="#">第' + (i + 1) + '艦隊</a> <span class="color-gray">[未解放]</span></h2>';
        }

        html += '<table>';
        var id_list = deck ? deck.api_ship : [];
        for (var j = 0; j < 6; j++) {
          var id = id_list[j]
          if (id === -1 || id == null) {
            html += '<tr><td class="ship-no">' + (j + 1) + '</td><td colspan="7"></td></tr>';
          }
          else {
            var ship = kcif.ship_list[String(id)];
            if (ship != null) {
              html += '<tr><td class="ship-no">' + (j + 1) + '</td>';
              html += '<td class="ship-type">' + ship_type(ship) + '</td>';
              html += '<td class="ship-name">' + ship2str(ship) + '</td>';
              html += ship_level(ship);
              html += ship_hp(ship);
              html += ship_cond(ship);
              html += ship_fuel(ship);
              html += ship_bull(ship) + '</tr>';
            }
          }
        }
        html += '</table>';
        html += '</div>';
      }

      html += '<div id="ndock">';
      html += '<h2><a href="#">入渠</a></h2>';
      html += '<table>';
      for (var i = 0; kcif.repair[i]; i++) {
        if (kcif.repair[i].api_complete_time > 0) {
          html += '<tr><td class="ship-no">' + kcif.repair[i].api_id + '</td>';
          var ship = kcif.ship_list[kcif.repair[i].api_ship_id];
          html += '<td class="ship-type">' + ship_type(ship) + '</td>';
          html += '<td class="ship-name">' + ship2str(ship) + '</td>';
          html += ship_level(ship);
          html += ship_hp(ship);
          html += ship_cond(ship);
          var dt = new Date(kcif.repair[i].api_complete_time);
          html += '<td class="ship-at ' + getTimeColor(dt) + '"><label>' + time2str(dt) + '<input id="check-dock' + kcif.repair[i].api_id + '" type="checkbox" class="check-timer check-dock"></label></td>';
        }
        else {
          html += '<tr><td class="ship-no">' + kcif.repair[i].api_id + '</td><td colspan="6"></tr>';
        }
      }
      html += '</table>';
      html += '</div>';

      html += '<div id="kdock">';
      html += '<h2><a href="#">建造</a></h2>';
      html += '<table>';
      for (var i = 0; kcif.build[i]; i++) {
        if (kcif.build[i].api_complete_time > 0 || kcif.build[i].api_state == 3) {
          html += '<tr><td class="ship-no">' + kcif.build[i].api_id + '</td>';
          var ship = kcif.ship_master[kcif.build[i].api_created_ship_id];
          html += '<td class="ship-type">' + ship_type(ship) + '</td>';
          html += '<td class="ship-name">' + ship2str(ship) + '</td>';
          var col;
          var s;
          if (kcif.build[i].api_complete_time > 0) {
            var dt = new Date(kcif.build[i].api_complete_time);
            s = time2str(dt);
            col = getTimeColor(dt);
          }
          else {
            s = "--:--";
            col = "color-red";
          }
          html += '<td class="ship-at ' + col + '"><label>' + s + '<input id="check-built' + kcif.build[i].api_id + '" type="checkbox" class="check-timer check-built"></label></td>';
        }
        else {
          html += '<tr><td class="ship-no">' + kcif.build[i].api_id + '</td><td colspan="4"></tr>';
        }
      }
      html += '</table>';
      maintab.innerHTML = html;

      // メイン:艦隊
      elems = maintab.querySelectorAll(".fleet h2 a");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", select_fleet, true);
      }
      var elem = maintab.querySelector("#" + kcif.current_fleet + " h2 a");
      if (elem) {
        elem.click();
      }

      // メイン:タイマーチェックボックス
      elems = maintab.querySelectorAll("input.check-timer");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", beepOnOff, false);
      }

      // メイン:チェックボックス復元
      restoreCheckboxes(checks);
      beepOnOff();

      if (!all) {
        return;
      }

      // 艦娘
      var shipstab = kcif.info_div.querySelector("#tab-ships");
      html = "";
      html += '<div class="table-outer"><div class="table-inner"><table>';
      html += '<thead><tr><th class="ship-no"><a href="#">#</a></th><th class="ship-type"><a href="#">艦種</a></th><th class="ship-name"><a href="#">艦名</a></th><th class="ship-level"><a href="#" class="sort-current">LV</a></th><th class="ship-hp"><a href="#">耐久</a></th><th class="ship-cond">疲労</th><th class="ship-fuel">燃料</th><th class="ship-bull">弾薬</th></tr></thead>';
      html += '<tbody>';

      var ships = [];
      for (var ship in kcif.ship_list) {
        if (ship && kcif.ship_list[ship].type) {
          ships.push(kcif.ship_list[ship]);
        }
      }
      ships.sort(function(a,b){
        if (a.level != b.level) {
          return b.level - a.level;
        }
        if (a.sort_no != b.sort_no) {
          return a.sort_no - b.sort_no;
        }
        return a.api_id - b.api_id;
      });

      for (var i = 0, ship; ship = ships[i]; i++) {
        html += '<tr><td class="ship-no">' + (i + 1) + '</td>';
        html += '<td class="ship-type">' + ship_type(ship) + '</td>';
        html += '<td class="ship-name">' + ship2str(ship) + '</td>';
        html += ship_level(ship);
        html += ship_hp(ship);
        html += ship_cond(ship);
        html += ship_fuel(ship);
        html += ship_bull(ship) + '</tr>';
      }

      html += '</tbody>';
      html += '</table></div></div>';
      shipstab.innerHTML = html;
    }
  }
};

window.addEventListener("load", kcif.init, false);
window.addEventListener("unload", kcif.destroy, false);
document.addEventListener("DOMContentLoaded", kcif.onLoad, true);
