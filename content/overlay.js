// "kancolleinfo" http://kancollegadgets.web.fc2.com/kancolleinfo/
//
// derived from http://vcraft.jp/soft/kancolle.html 0.2 by c.mos
//
// original code: https://github.com/kageroh/cond_checker
// references:
//  http://d.hatena.ne.jp/teramako/20120215/p1
//  http://www.softwareishard.com/blog/firebug/nsitraceablechannel-intercept-http-traffic/
//  http://fartersoft.com/blog/2011/03/07/using-localstorage-in-firefox-extensions-for-persistent-data-storage/

function logging(level, args) {
  if (level <= getLogLevel()) {
    Services.console.logStringMessage("[kcif]: " + Array.join(args, " "));
  }
}

function log() {
  logging(5, arguments); // Debug
}

function selectTab(evt) {
  evt.preventDefault();

  kcif.current_tab = this.parentNode.id.replace("-header", "");

  var elems = kcif.info_div.querySelectorAll(".tab-header");
  for (var i = 0; i < elems.length; i++) {
    elems[i].style.color = elems[i] == this.parentNode ? "white" : "inherit";
    elems[i].style.backgroundColor = elems[i] == this.parentNode ? "black" : "inherit";
  }
  elems = kcif.info_div.querySelectorAll(".tab")
  for (var i = 0; i < elems.length; i++) {
    elems[i].style.display = elems[i].id == kcif.current_tab ? "block" : "none";
  }
}

function selectFleet(evt) {
  evt.preventDefault();

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

function saveConfig(evt) {
  evt.preventDefault();

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

  elem = kcif.info_div.querySelector("#show-battle");
  if (elem) {
    myPref().setBoolPref("show.battle", elem.checked);
  }

  elem = kcif.info_div.querySelector("#show-built");
  if (elem) {
    myPref().setBoolPref("show.built", elem.checked);
  }

  elem = kcif.info_div.querySelector("#hp-by-meter");
  if (elem) {
    myPref().setBoolPref("meter.hp", elem.checked);
  }

  elem = kcif.info_div.querySelector("#fuel-by-meter");
  if (elem) {
    myPref().setBoolPref("meter.fuel", elem.checked);
  }

  elem = kcif.info_div.querySelector("#search-formula");
  if (elem) {
    myPref().setIntPref("search.formula", elem.options[elem.selectedIndex].value);
  }

  restoreCheckboxes(saveCheckboxes());
  beepOnOff();

  var elems = kcif.info_div.querySelectorAll("#tab-config div.config-buttons button");
  for (var i = 0; i < elems.length; i++) {
    elems[i].disabled = true;
  }

  kcif.renderInfo(true);
}

function resetConfig(evt) {
  evt.preventDefault();

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

  elem = kcif.info_div.querySelector("#show-battle");
  if (elem) {
    elem.checked = getShowBattle();
  }

  elem = kcif.info_div.querySelector("#show-built");
  if (elem) {
    elem.checked = getShowBuilt();
  }

  elem = kcif.info_div.querySelector("#hp-by-meter");
  if (elem) {
    elem.checked = getHpByMeter();
  }

  elem = kcif.info_div.querySelector("#fuel-by-meter");
  if (elem) {
    elem.checked = getFuelByMeter();
  }

  elem = kcif.info_div.querySelector("#search-formula");
  if (elem) {
    for (var i = 0; elem.options.length; i++) {
      if (Number(elem.options[i].value) == getSearchFormula()) {
        elem.selectedIndex = i;
        break;
      }
    }
  }

  var elems = kcif.info_div.querySelectorAll("#tab-config div.config-buttons button");
  for (var i = 0; i < elems.length; i++) {
    elems[i].disabled = true;
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
    if (elem.checked != getBeepBuilt()) {
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#show-battle");
  if (elem) {
    if (elem.checked != getShowBattle()) {
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#show-built");
  if (elem) {
    if (elem.checked != getShowBuilt()) {
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#hp-by-meter");
  if (elem) {
    if (elem.checked != getHpByMeter()) {
      changed = true;
    }
  }

  var elem = kcif.info_div.querySelector("#fuel-by-meter");
  if (elem) {
    if (elem.checked != getFuelByMeter()) {
      changed = true;
    }
  }

  elem = kcif.info_div.querySelector("#search-formula");
  if (elem) {
    if (elem.options[elem.selectedIndex].value != getSearchFormula()) {
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

function getShowBattle() {
  return myPref().getBoolPref("show.battle");
}

function getShowBuilt() {
  return myPref().getBoolPref("show.built");
}

function getHpByMeter() {
  return myPref().getBoolPref("meter.hp");
}

function getFuelByMeter() {
  return myPref().getBoolPref("meter.fuel");
}

function getSearchFormula() {
  return myPref().getIntPref("search.formula");
}

function getLogLevel() {
  return myPref().getIntPref("debug.loglevel");
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
  if (!/^[a-z]+:\/\//.test(url)) {
    return;
  }
  if (!kcif.beep) {
    kcif.beep = new Audio(url);
    kcif.beep.loop = true;
    kcif.beep.load();
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

function saveFile(blob, path) {
  log("saveFile start: data=" + blob + ", path=" + path);
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
  reader.readAsBinaryString(blob);
}

function getPathSeparator() {
  var profD = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
  profD.append("dummy");
  profD.append("dummy");
  return profD.path.substr(profD.path.length - ("dummy".length) - 1, 1);
}

function captureAndSave(evt) {
  evt.preventDefault();

  var rect = kcif.flash.getBoundingClientRect();
  var rect2 = kcif.game_frame.getBoundingClientRect();
  var canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
  scale = 1.0;
  canvas.mozOpaque = true;
  canvas.width = rect.width;
  canvas.height = rect.height;
  var context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.drawWindow(window.content, rect.left + rect2.left + window.content.scrollX + 1, rect.top + rect2.top + window.content.scrollY, rect.width, rect.height, "white");

  canvas.toBlob(function(blob){
    var dir = getCaptureSaveDir();
    var base = getCaptureSaveBase();
    var s = new Date().toLocaleFormat("%Y%m%d%H%M%S");
    var filename = dir + getPathSeparator() + base + s + ".png";
    saveFile(blob, filename);
  }, "image/png");
}

function loadEnemyFleetsFromStorage() {
  var s = kcif.getStorage("enemy_fleets");
  if (s) {
    try {
      kcif.enemy_fleets = JSON.parse(s);
    }
    catch (exc) {
      log("  JSON.parse failed: " + String(exc));
      kcif.enemy_fleets = null;
    }
  }
  if (!kcif.enemy_fleets) {
    kcif.enemy_fleets = {};
  }
}

function saveEnemyFleetsToStorage() {
  kcif.putStorage("enemy_fleets", JSON.stringify(kcif.enemy_fleets));
}

const CSV_HEADER = "敵編成ID,敵艦隊名,陣形,敵1番艦,敵2番艦,敵3番艦,敵4番艦,敵5番艦,敵6番艦";

function loadEnemyFleetsFromFile(evt) {
  log("loadEnemyFleetsFromFile");
  if (evt) evt.preventDefault();

  var picker = CCIN("@mozilla.org/filepicker;1", "nsIFilePicker");
  picker.init(window, "", Ci.nsIFilePicker.modeOpen);
  picker.defaultExtension = "csv";
  picker.appendFilter("CSVファイル", "*.csv");
  picker.appendFilters(Ci.nsIFilePicker.filterAll);
  var ret = picker.show();
  if (ret == Ci.nsIFilePicker.returnOK) {
    try {
      var stream = CCIN("@mozilla.org/network/file-input-stream;1", "nsIFileInputStream");
      stream.init(picker.file, 0x01, 0x0444, 0);
      var conv = CCIN("@mozilla.org/intl/scriptableunicodeconverter", "nsIScriptableUnicodeConverter");
      conv.charset = "Windows-31J";
      stream.QueryInterface(Ci.nsILineInputStream);
      var line = {};
      var hasmore = stream.readLine(line);
      var needToConvert = false;
      if (line.value == CSV_HEADER) {
        log("UTF-8");
      }
      else if (line.value == "\xEF\xBB\xBF" + CSV_HEADER) {
        log("UTF-8(BOM)");
      }
      else if (line.value == conv.ConvertFromUnicode(CSV_HEADER) + conv.Finish()) {
        log("Windows-31J");
        needToConvert = true;
      }
      else {
        log("unknown: [" + line.value + "]");
        throw "ファイルの形式が異なります。";
      }

      kcif.enemy_fleets = {};
      var pos = 2;
      while (hasmore) {
        hasmore = stream.readLine(line);
        var read = line.value;
        if (needToConvert) {
          read = conv.ConvertToUnicode(read);
        }
        data = read.split(",");
        var ef = {};
        if (data.length != 9) {
          throw String(pos) + "行目が正しくありません。";
        }
        if (Number(data[0]) <= 0) {
          throw String(pos) + "行目のIDが正しくありません。";
        }
        ef.enemy_id = Number(data[0]);
        ef.name = data[1];
        if (form2str(Number(data[2])) == "") {
          throw String(pos) + "行目の陣形が正しくありません。";
        }
        ef.formation = Number(data[2]);
        ef.id_list = [];
        for (var i = 0; i < 6; i++) {
          if (!Number(data[i + 3])) {
            throw String(pos) + "行目の敵" + (i + 1) + "番艦が正しくありません。";
          }
          ef.id_list[i] = Number(data[i + 3]);
        }
        kcif.enemy_fleets[ef.enemy_id] = ef;
        pos++;
      }
      stream.close();
      saveEnemyFleetsToStorage();
      alert("ファイルを読み込みました。");
    }
    catch (exc) {
      log("cannot read: " + String(exc));
      loadEnemyFleetsFromStorage(); // 復元
      alert("ファイルを読み込めませんでした。\n" + String(exc));
    }
  }
}

function saveEnemyFleetsToFile() {
  log("saveEnemyFleetsToFile");
  if (evt) evt.preventDefault();

  var picker = CCIN("@mozilla.org/filepicker;1", "nsIFilePicker");
  picker.init(window, "", Ci.nsIFilePicker.modeSave);
  picker.defaultExtension = "csv";
  picker.defaultString = "EnemyFleetRecord.csv";
  var ret = picker.show();
  if (ret == Ci.nsIFilePicker.returnOK || ret == Ci.nsIFilePicker.returnReplace) {
    try {
      var stream = CCIN("@mozilla.org/network/safe-file-output-stream;1", "nsIFileOutputStream");
      stream.init(picker.file, 0x04 | 0x08 | 0x20, 0644, 0);
      var conv = CCIN("@mozilla.org/intl/scriptableunicodeconverter", "nsIScriptableUnicodeConverter");
      conv.charset = "Windows-31J";
      var data = conv.ConvertFromUnicode(CSV_HEADER + "\r\n");
      if (kcif.enemy_fleets) {
        for (var k in kcif.enemy_fleets) {
          var v = kcif.enemy_fleets[k];
          data += conv.ConvertFromUnicode(String(k) + "," + v.name + "," + v.formation + "," + v.id_list.join(",") + "\r\n");
        }
      }
      data += conv.Finish();
      stream.write(data, data.length);
      if (stream instanceof Ci.nsISafeOutputStream) {
        stream.finish();
      }
      else {
        stream.close();
      }
      log("OK, file saved");
      alert("ファイルを保存しました。");
    }
    catch (exc) {
      log("cannot save: " + String(exc));
      alert("ファイルを保存できませんでした。\n" + String(exc));
    }
  }
}

function time2str(dt) {
  return dt.toLocaleFormat(dt.getDate() != new Date().getDate() ? "%m/%d %H:%M" : "%H:%M");
}

function getTimeColor(dt, strict) {
  var now = new Date().getTime();
  var col = "color-default";
  if (dt.getTime() <= now) {
    col = "color-red";
  }
  else if (!strict && dt.getTime() - 60000 <= now) {
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

function map2str(map) {
  var cell;
  if (map.api_enemy) {
    if (map.api_no == map.api_bosscell_no || map.api_event_id == 5) {
      cell = "*";
    }
    else {
      cell = "+";
    }
    kcif.enemy_id = map.api_enemy.api_enemy_id;
  }
  else {
    cell = "-";
    kcif.enemy_id = null;
  }
  return cell + " " + map.api_maparea_id + "-" + map.api_mapinfo_no + "-" + map.api_no;
}

function type2str(type) {
  var s = "";
  switch (type) {
    case 1:
      s = "海防";
      break;
    case 2:
      s = "駆逐";
      break;
    case 3:
      s = "軽巡";
      break;
    case 4:
      s = "雷巡";
      break;
    case 5:
      s = "重巡";
      break;
    case 6:
      s = "航巡";
      break;
    case 7:
      s = "軽空";
      break;
    case 8:
      s = "巡戦";
      break;
    case 9:
      s = "戦艦";
      break;
    case 10:
      s = "航戦";
      break;
    case 11:
      s = "正空";
      break;
    case 12:
      s = "超戦";
      break;
    case 13:
      s = "潜水";
      break;
    case 14:
      s = "潜空";
      break;
    case 15:
      s = "輸送";
      break;
    case 16:
      s = "水母";
      break;
    case 17:
      s = "揚陸";
      break;
    case 18:
      s = "装空";
      break;
    case 19:
      s = "工作";
      break;
    case 20:
      s = "潜母";
      break;
    case 21:
      s = "練巡";
      break;
    default:
      log("艦種不明: " + type);
      s = "不明";
      break;
  }
  return s;
}

function seiku2str(seiku) {
  var seikuText = "敵制空値:&#10; ";
  var tmp = Math.floor(seiku / 3);
  if (tmp < 1) {
    seikuText += "0: ";
  }
  else {
    seikuText += "0～" + tmp + ": ";
  }
  seikuText += "制空権確保&#10; ";
  tmp++;
  var tmp2 = Math.floor(seiku / 1.5);
  if (tmp <= tmp2) {
    seikuText += tmp;
    if (tmp < tmp2) {
      seikuText += "～" + tmp2;
    }
    seikuText += ": 航空優勢&#10; ";
    tmp = tmp2 + 1;
  }
  tmp2 = Math.floor(seiku * 1.5);
  if (tmp <= tmp2) {
    seikuText += tmp;
    if (tmp < tmp2) {
      seikuText += "～" + tmp2;
    }
    seikuText += ": 航空均衡&#10; ";
    tmp = tmp2 + 1;
  }
  tmp2 = Math.floor(seiku * 3);
  if (tmp <= tmp2) {
    seikuText += tmp;
    if (tmp < tmp2) {
      seikuText += "～" + tmp2;
    }
    seikuText += ": 航空劣勢&#10; ";
    tmp = tmp2 + 1;
  }
  seikuText += tmp + "～: 制空権喪失";

  return seikuText;
}

function shipType(ship) {
  var s = "";
  if (ship && ship.type) {
    s = type2str(ship.type);
  }
  return '<td class="ship-type">' + s + '</td>';
}

function shipName(ship) {
  var s;
  var items = [];
  if (!ship || !ship.ship_id) {
    s = "";
  }
  else {
    s = ship.name || "(" + ship.ship_id + ")";
    for (var i = 0; ship.slot && i < 5; i++) {
      if (ship.slot[i] >= 0 && kcif.item_list[ship.slot[i]]) {
        var item = kcif.item_list[ship.slot[i]]
        var name = String(i + 1) + ": " + item.name;
        if (item.type && isPlane(item.type[2])) {
          name += " [" + String(ship.equip[i]) + "/" + String(ship.equip_max[i]) + "]";
        }
        items.push(name);
      }
    }
  }
  if (items.length > 0) {
    items = ' title="' + items.join("&#10;") + '"';
  }
  else {
    items = "";
  }
  return '<td class="ship-name"' + items + '>' + s + '</td>';
}

function shipLevel(ship) {
  var col = "color-default";
  var title = "";
  if (ship) {
    if (ship.afterlv > 0) {
      if (ship.level >= ship.afterlv) {
        col = "color-green";
        title = ' title="改造後 ' + kcif.ship_master[ship.aftershipid].name + '(' + type2str(kcif.ship_master[ship.aftershipid].type) + ')"';
      }
      else {
        title = ' title="LV' + ship.afterlv + ' ' + kcif.ship_master[ship.aftershipid].name + '(' + type2str(kcif.ship_master[ship.aftershipid].type) + ')"';
      }
    }
    if (ship.level != ship.p_level) {
      col += " blink";
    }
  }
  return '<td class="ship-level ' + col + '"' + title + '>' + (ship ? ship.level : "") + '</td>';
}

function hp2meter(cur, max) {
  var status = "";
  if (cur >= max) {
    status = "full";
  }
  else if (cur > max * 0.75) {
    status = "little";
  }
  else if (cur > max * 0.5) {
    status = "slight";
  }
  else if (cur > max * 0.25) {
    status = "half";
  }
  else if (cur > 0) {
    status = "serious";
  }
  else {
    status = "empty";
  }
  return '<meter value="' + cur + '" min="0" max="' + max + '" title="' + Math.floor(cur * 100 / max) + '" class="' + status + '"></meter>';
}

function shipHp(ship) {
  var col = "color-default";
  var hp = ship.hp;
  if (hp <= 0 || ship.taihi) {
    col = "color-gray";
    hp = 0;
  }
  else if (hp <= ship.hp_max / 4) {
    col = "color-red";
  }
  else if (hp <= ship.hp_max / 2) {
    col = "color-orange";
  }
  else if (hp <= ship.hp_max * 3 / 4) {
    col = "color-yellow";
  }
  else if (hp >= ship.hp_max) {
    col = "color-green";
  }
  if (ship.p_hp != hp) {
    col += " blink";
  }
  return '<td class="ship-hp' + (getHpByMeter() ? '-meter ' : ' ') + col + '"' + (ship.p_hp != hp ? ' title="直前:' + ship.p_hp + '"': '') + '>' + (ship.taihi ? '退避' : (hp + '/' + ship.hp_max)) + (getHpByMeter() ? hp2meter(ship.hp, ship.hp_max) : '') + '</td>';
}

function shipCond(ship) {
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

function fuelBullColor(cur, max) {
  if (cur >= max) {
    return "color-green";
  }
  else if (cur > max * 0.5) {
    return "color-yellow";
  }
  else if (cur > 0) {
    return "color-orange";
  }
  else {
    return "color-red";
  }
}

function fuel2meter(cur, max) {
  var status = "";
  if (cur >= max) {
    status = "full";
  }
  else if (cur > max * 0.5) {
    status = "slight";
  }
  else if (cur > max * 0.2) {
    status = "half";
  }
  else if (cur > 0) {
    status = "serious";
  }
  else {
    status = "empty";
  }
  return '<meter value="' + cur + '" min="0" max="' + max + '" class="' + status + '"></meter>';
}

function shipFuelBull(ship) {
  if (getFuelByMeter()) {
    return '<td class="ship-fuel-bull" title="燃料: ' + ship.fuel + '/' + ship.fuel_max + ' (' + Math.floor(ship.fuel * 100 / ship.fuel_max) + '%)&#10;弾薬: ' + ship.bull + '/' + ship.bull_max + ' (' + Math.floor(ship.bull * 100 / ship.bull_max) + '%)">' + fuel2meter(ship.fuel, ship.fuel_max) + fuel2meter(ship.bull, ship.bull_max) + '</td>';
  }
  else {
    var f = "";
    var col = fuelBullColor(ship.fuel, ship.fuel_max);
    if (ship.fuel != ship.p_fuel) {
      col += " blink";
    }
    f = '<td class="ship-fuel ' + col + '" title="' + ship.fuel + '/' + ship.fuel_max + '">' + Math.floor(ship.fuel * 100 / ship.fuel_max) + '%</td>';

    col = fuelBullColor(ship.bull, ship.bull_max);
    if (ship.bull != ship.p_bull) {
      col += " blink";
    }
    return f + '<td class="ship-bull ' + col + '" title="' + ship.bull + '/' + ship.bull_max + '">' + Math.floor(ship.bull * 100 / ship.bull_max) + '%</td>';
  }
}

function shipExp(ship) {
  var total = (ship.level == 99 || ship.level == 150) ? '' : ship.exp[0] + '/' + (ship.exp[0] + ship.exp[1]);
  var need = (ship.level == 99 || ship.level == 150) ? '' : ship.exp[1];
  return '<td class="ship-exp" title="' + total + '">' + need + '</td>';
}

function formatMaterial(name, value, level) {
  var col;
  if (level) {
    var max = (level + 3) * 250;
    col = value >= 300000 ? " color-red" : value >= max ? " color-yellow" : "";
  }
  else {
    col = value >= 3000 ? " color-red" : "";
  }
  return '<tr><th class="res-name">' + name + '</th><td class="res-value' + col + '">' + value + '</td></tr>';
}

function form2str(form, prefix) {
  var s = "";
  if (prefix) {
    s = prefix + ":";
  }
  switch (Number(form)) {
    case 1:
      s += "単縦陣";
      break;
    case 2:
      s += "複縦陣";
      break;
    case 3:
      s += "輪形陣";
      break;
    case 4:
      s += "梯形陣";
      break;
    case 5:
      s += "単横陣";
      break;
    case 11:
      s += "第一(対潜警戒)";
      break;
    case 12:
      s += "第二(前方警戒)";
      break;
    case 13:
      s += "第三(輪形陣)";
      break;
    case 14:
      s += "第四(戦闘隊形)";
      break;
  }
  return s;
}

function reflectDamage(buf, idx, ship, damage) {
  if (buf) {
    var d = damage;
    if (ship.hp < d) {
      d = ship.hp;
    }
    if (!buf[idx]) {
      buf[idx] = d;
    }
    else {
      buf[idx] += d;
    }
  }

  ship.hp -= damage;
  if (ship.hp <= 0) {
    var found = false;
    if (ship.slot) {
      for (var i = 0; i < ship.slot.length && ship.slot[i] >= 0 && !found; i++) {
        var item = kcif.item_list[ship.slot[i]];
        if (item) {
          if (item.item_id == 42) {      // 応急修理要員
            ship.hp = Math.floor(ship.hp_max / 5);
            found = true;
          }
          else if (item.item_id == 43) { // 応急修理女神
            ship.hp = ship.hp_max;
            found = true;
          }
          if (found) {
            for (var j = i + 1; j < ship.slot.length - 1; j++) {
              ship.slot[j - 1] = ship.slot[j];
            }
            ship.slot[ship.slot.length - 1] = -1;
          }
        }
      }
    }
    if (!found) {
      ship.hp = 0;
    }
  }
}

function damageKouku(deck, enemies, kouku, offset) {
  if (!offset) {
    offset = 0;
  }

  if (kouku) {
    if (kouku.api_fdam) {
      var damage_list = kouku.api_fdam;
      var id_list = deck.api_ship;
      for (var i = 0, id; (id = id_list[i]) && id != -1; i++) {
        if (damage_list[i + 1] >= 0 && (kouku.api_frai_flag[i + 1] > 0 || kouku.api_fbak_flag[i + 1] > 0)) {
          var damage = Math.floor(damage_list[i + 1]);
          log("    fleet " + deck.api_id + " ship " + (i + 1) + "(" + String(id) + ") damaged " + damage);
          var ship = kcif.ship_list[id];
          reflectDamage(kcif.battle_result[0], i + offset, ship, damage);
        }
      }
    }

    if (kouku.api_edam) {
      var damage_list = kouku.api_edam;
      for (var i = 0; i < 6; i++) {
        if (enemies[i]) {
          if (damage_list[i + 1] >= 0 && (kouku.api_erai_flag[i + 1] > 0 || kouku.api_ebak_flag[i + 1] > 0)) {
            var damage = Math.floor(damage_list[i + 1]);
            log("    enemy " + (i + 1) + " damaged " + damage);
            reflectDamage(kcif.battle_result[1], i, enemies[i], damage);
          }
        }
      }
    }
  }
}

function damageRaigeki(deck, enemies, raigeki, offset) {
  if (!offset) {
    offset = 0;
  }

  var damage_list = raigeki.api_fdam;
  var id_list = deck.api_ship;
  for (var i = 0, id; (id = id_list[i]) && id != -1; i++) {
    if (damage_list[i + 1] >= 0 && raigeki.api_erai.indexOf(i + 1) != -1) {
      var damage = Math.floor(damage_list[i + 1]);
      log("    fleet " + deck.api_id + " ship " + (i + 1) + "(" + String(id) + ") damaged " + damage);
      var ship = kcif.ship_list[id];
      reflectDamage(kcif.battle_result[0], i + offset, ship, damage);
    }
  }

  damage_list = raigeki.api_edam;
  for (var i = 0; i < 6; i++) {
    if (enemies[i]) {
      if (damage_list[i + 1] >= 0 && raigeki.api_frai.indexOf(i + 1) != -1) {
        var damage = Math.floor(damage_list[i + 1]);
        log("    enemy " + (i + 1) + " damaged " + damage);
        reflectDamage(kcif.battle_result[1], i, enemies[i], damage);
      }
    }
  }
}

function damageHougeki(deck, enemies, hougeki, offset) {
  if (!offset) {
    offset = 0;
  }

  for (var i = 1, t_list; t_list = hougeki.api_df_list[i]; i++) {
    for (var j = 0, target; target = t_list[j]; j++) {
      var damage = Math.floor(hougeki.api_damage[i][j]);
      if (target >= 1 && target <= 6) {
        var id = deck.api_ship[target - 1];
        log("    fleet " + deck.api_id + " ship " + target + "(" + String(id) + ") damaged " + damage);
        var ship = kcif.ship_list[id];
        reflectDamage(kcif.battle_result[0], target - 1 + offset, ship, damage);
      }
      else if (target >= 7 && target <= 12) {
        if (enemies[target - 7]) {
          log("    enemy " + (target - 6) + " damaged " + damage);
          reflectDamage(kcif.battle_result[1], target - 7, enemies[target - 7], damage);
        }
      }
    }
  }
}

function judgeBattleResult(friends, enemies, myresult, eresult) {
  var fcount = 0;
  var fsunks = 0;
  var fall = 0;
  var fdmg = 0;
  for (var i = 0; i < 12; i++) {
    if (!friends[i] || friends[i].taihi) {
      continue;
    }
    if (!myresult[i]) myresult[i] = 0;
    if (friends[i].hp <= 0 && myresult[i] > 0) {
      fsunks++;
    }
    fcount++;
    log("friend " + i + ": hp=" + friends[i].hp + ", damage=" + myresult[i]);
    fall += friends[i].hp + myresult[i];
    fdmg += myresult[i];
  }
  var ecount = 0;
  var esunks = 0;
  var eall = 0;
  var edmg = 0;
  for (var i = 0; enemies[i]; i++) {
    if (!eresult[i]) eresult[i] = 0;
    if (enemies[i].hp <= 0 && eresult[i] > 0) {
      esunks++;
    }
    else if (enemies[i].hp <= 0 && eresult[i] <= 0) {
      break;
    }
    ecount++;
    log("enemy " + i + ": hp=" + enemies[i].hp + ", damage=" + eresult[i]);
    eall += enemies[i].hp + eresult[i];
    edmg += eresult[i];
  }
  var frate = fdmg / fall;
  var erate = edmg / eall;
  log("fcount=" + fcount + ", fsunks=" + fsunks + ", fdmg=" + fdmg + ", fall=" + fall + ", frate=" + frate);
  log("ecount=" + ecount + ", esunks=" + esunks + ", edmg=" + edmg + ", eall=" + eall + ", erate=" + erate);

  if (fsunks == 0) { // 自軍沈没なし
    if (erate >= 1) { // 敵軍殲滅
      if (frate <= 0) { // 自軍ノーダメ
        return "SS";
      }
      else {
        return "S";
      }
    }
    else if (esunks >= Math.round(ecount * 0.6)) { // 半数以上沈めた
      return "A";
    }
    else if (enemies[0].hp <= 0 || // 旗艦沈めた または
             frate * 2.5 < erate) { // 敵損害率が自損害率の2.5倍以上
      return "B";
    }
  }
  else { // 自軍沈没あり
    if (erate >= 1 || // 敵軍殲滅 または
        (enemies[0].hp <= 0 && fsunks < esunks) || // 旗艦沈めかつ撃沈数が上 または
        frate * 2.5 < erate) { // 敵損害率が自損害率の2.5倍以上
      return "B";
    }
    else if (enemies[0].hp <= 0) { // 旗艦沈め(て、撃沈数が同じまたは負け)
      return "C"; // Dになることもあるらしいが条件不詳
    }
  }
  if (frate * 0.9 < erate) { // 敵損害率が自損害率の0.9倍以上
    return "C";
  }
  else if (fsunks > 0 && fcount - fsunks <= 1) { // 撃沈により残存数1
    return "E";
  }

  return "D";
}

function deck2ships(deck, deck2) {
  var ships = [];
  var id_list = deck.api_ship;
  for (var i = 0, id; (id = id_list[i]) && id != -1; i++) {
    var ship = kcif.ship_list[id];
    ships[i] = ship;
  }
  if (deck2) {
    id_list = deck2.api_ship;
    for (var i = 0, id; (id = id_list[i]) && id != -1; i++) {
      var ship = kcif.ship_list[id];
      ships[i + 6] = ship;
    }
  }
  return ships;
}

function battle(url, json) {
  try {
    var deck_id = json.api_data.api_dock_id || json.api_data.api_deck_id || 1;
    if (json.api_data.api_formation) {
      kcif.enemy_formation = json.api_data.api_formation[1];
      var s = "<span title='" + form2str(json.api_data.api_formation[0], "自") + " " + form2str(json.api_data.api_formation[1], "敵");
      log("json.json.api_data.api_kouku = " + (json.api_data.api_kouku ? "exist" : "not exist"));
      if (json.api_data.api_kouku && json.api_data.api_kouku.api_stage1) {
        s += " ";
        switch (Number(json.api_data.api_kouku.api_stage1.api_disp_seiku)) {
          case 1:
            s += "制空権確保";
            break;
          case 2:
            s += "航空優勢";
            break;
          case 0:
            s += "航空均衡";
            break;
          case 3:
            s += "航空劣勢";
            break;
          case 4:
            s += "制空権喪失";
            break;
        }
      }
      s += "'>";
      switch (json.api_data.api_formation[2]) {
        case 1:
          s += "同航戦";
          break;
        case 2:
          s += "反航戦";
          break;
        case 3:
          s += "T字有利";
          break;
        case 4:
          s += "T字不利";
          break;
      }
      s += "</span>";
      kcif.mission[deck_id - 1] += " " + s;
    }
    if (url.indexOf("combined") != -1) {
      kcif.mission[1] = "(連合艦隊)";
      if (url.indexOf("midnight") != -1) {
        // if it's combined fleet and midnight battle, it must be 2nd fleet.
        deck_id = 2;
      }
    }

    // enemies
    var enemies = [];
    if (json.api_data.api_nowhps && json.api_data.api_maxhps) {
      for (var i = 0; i < 6; i++) {
        enemies[i] = {
          ship_id: json.api_data.api_ship_ke[i + 1],
          hp: json.api_data.api_nowhps[i + 7],
          hp_max: json.api_data.api_maxhps[i + 7]
        };
        var mst = kcif.ship_master[enemies[i].ship_id];
        if (mst) {
          enemies[i].name = mst.name;
          if (mst.sort_no == 0 && mst.yomi != "-") {
            enemies[i].name += mst.yomi;
          }
        }
      }
    }

    var rank = "";
    for (var i = 0, deck; deck = kcif.deck_list[i]; i++) {
      if (deck.api_id == deck_id) {
        if (json.api_data.api_kouku) {
          log("  kouku");
          damageKouku(deck, enemies, json.api_data.api_kouku.api_stage3);
          if (url.indexOf("combined") != -1 && json.api_data.api_kouku.api_stage3_combined) {
            // must be 2nd fleet
            log("  kouku (2nd)");
            damageKouku(kcif.deck_list[1], enemies, json.api_data.api_kouku.api_stage3_combined, 6);
          }
        }
        if (json.api_data.api_kouku2) { // air battle
          log("  kouku2");
          damageKouku(deck, enemies, json.api_data.api_kouku2.api_stage3);
          if (url.indexOf("combined") != -1 && json.api_data.api_kouku2.api_stage3_combined) {
            // must be 2nd fleet
            log("  kouku2 (2nd)");
            damageKouku(kcif.deck_list[1], json.api_data.api_kouku2.api_stage3_combined, 6);
          }
        }
        if (json.api_data.api_support_info) {
          var support = json.api_data.api_support_info;
          if (support.api_support_airatack) {
            log("  support (airatack)");
            var damage = support.api_support_airatack.api_damage;
            for (var i = 0; i < 6; i++) {
              if (damage[i + 1] > 0 && enemies[i]) {
                reflectDamage(kcif.battle_result[1], i, enemies[i], Math.floor(damage[i + 1]));
              }
            }
          }
          else if (support.api_support_hourai) {
            log("  support (hourai)");
            var damage = support.api_support_hourai.api_damage;
            for (var i = 0; i < 6; i++) {
              if (damage[i + 1] > 0 && enemies[i]) {
                reflectDamage(kcif.battle_result[1], i, enemies[i], Math.floor(damage[i + 1]));
              }
            }
          }
        }
        if (json.api_data.api_opening_atack) {
          log("  opening");
          if (url.indexOf("combined") != -1) {
            // must be 2nd fleet
            damageRaigeki(kcif.deck_list[1], enemies, json.api_data.api_opening_atack, 6);
          }
          else {
            damageRaigeki(deck, enemies, json.api_data.api_opening_atack);
          }
        }
        if (json.api_data.api_hougeki) { // midnight battle
          log("  hougeki (midnight)");
          if (url.indexOf("combined") != -1) {
            damageHougeki(deck, enemies, json.api_data.api_hougeki, 6);
          }
          else {
            damageHougeki(deck, enemies, json.api_data.api_hougeki);
          }
        }
        if (json.api_data.api_hougeki1) {
          log("  hougeki1");
          if (url.indexOf("combined") != -1 && url.indexOf("water") == -1) {
            // must be 2nd fleet
            damageHougeki(kcif.deck_list[1], enemies, json.api_data.api_hougeki1, 6);
          }
          else {
            damageHougeki(deck, enemies, json.api_data.api_hougeki1);
          }
        }
        if (json.api_data.api_raigeki && url.indexOf("combined") != -1 && url.indexOf("water") == -1) {
          log("  raigeki");
          // must be 2nd fleet
          damageRaigeki(kcif.deck_list[1], enemies, json.api_data.api_raigeki, 6);
        }
        if (json.api_data.api_hougeki2) {
          log("  hougeki2");
          damageHougeki(deck, enemies, json.api_data.api_hougeki2);
        }
        if (json.api_data.api_hougeki3) { // combined battle
          log("  hougeki3");
          if (url.indexOf("water") != -1) {
            // must be 2nd fleet
            damageHougeki(kcif.deck_list[1], enemies, json.api_data.api_hougeki3, 6);
          }
          else {
            damageHougeki(deck, enemies, json.api_data.api_hougeki3);
          }
        }
        if (json.api_data.api_raigeki && (url.indexOf("combined") == -1 || url.indexOf("water") != -1)) {
          log("  raigeki");
          if (url.indexOf("combined") == -1) {
            damageRaigeki(deck, enemies, json.api_data.api_raigeki);
          }
          else {
            // must be 2nd fleet
            damageRaigeki(kcif.deck_list[1], enemies, json.api_data.api_raigeki, 6);
          }
        }

        var ships;
        if (url.indexOf("combined") != -1) {
          ships = deck2ships(kcif.deck_list[0], kcif.deck_list[1]);
        }
        else {
          ships = deck2ships(deck);
        }
        rank = judgeBattleResult(ships, enemies, kcif.battle_result[0], kcif.battle_result[1]);
        break;
      }
    }
    if (rank == "C" || rank == "D" || rank == "E") {
      rank = "<span class='color-red'>" + rank + "</span> ";
    }
    else if (rank == "SS" || rank == "S") {
      rank = "<span class='color-green'>" + rank + "</span> ";
    }
    else if (rank) {
      rank = "<span class='color-gray'>" + rank + "</span> ";
    }

    var s = "";
    for (var i = 0; i < 6; i++) {
      if (enemies[i] && enemies[i].hp_max > 0) {
        var t = "";
        if (enemies[i].name) {
          t += enemies[i].name + " ";
        }
        t += String(enemies[i].hp) + "/" + String(enemies[i].hp_max);
        if (enemies[i].hp > enemies[i].hp_max * 3 / 4) {
          s += "<span class='color-green' title='" + t + "'>◎</span>";
        }
        else if (enemies[i].hp > enemies[i].hp_max / 2) {
          s += "<span class='color-yellow' title='" + t + "'>◎</span>";
        }
        else if (enemies[i].hp > enemies[i].hp_max / 4) {
          s += "<span class='color-orange' title='" + t + "'>○</span>";
        }
        else if (enemies[i].hp > 0) {
          s += "<span class='color-red' title='" + t + "'>△</span>";
        }
        else if (enemies[i].hp <= 0) {
          s += "<span class='color-gray' title='" + t + "'>×</span>";
        }
      }
    }

    if (url.indexOf("combined") != -1 && url.indexOf("midnight") != -1) {
      deck_id = 1;
    }
    var n = kcif.mission[deck_id - 1].indexOf(' <span class="battle-result"');
    if (n != -1) {
      kcif.mission[deck_id - 1] = kcif.mission[deck_id - 1].substring(0, n);
    }
    kcif.mission[deck_id - 1] += ' <span class="battle-result">' + rank + '<span style="letter-spacing: -2px;">' + s + '</span>';
  }
  catch (exc) {
    log("  failed: " + String(deck_id) + ": " + String(exc));
  }
}

function updateRepairStart(idx) {
  var deck = kcif.deck_list[idx];
  if (deck && deck.api_ship[0] >= 0) {
    var ship = kcif.ship_list[deck.api_ship[0]];
    if (ship && ship.type == 19) { // 工作艦
      kcif.repair_start[idx] = new Date().getTime();
    }
    else {
      kcif.repair_start[idx] = null;
    }
  }
}

function removeFromDeck(ship_id) {
  var found = false;
  for (var i = 0, deck; (deck = kcif.deck_list[i]) && !found; i++) {
    if (!deck.api_ship) {
      continue;
    }
    for (var j = 0; j < 6; j++) {
      if (deck.api_ship[j] === -1) {
        break;
      }
      if (deck.api_ship[j] == ship_id) {
        for (var k = j + 1; k < 6; k++) {
          deck.api_ship[k - 1] = deck.api_ship[k];
        }
        deck.api_ship[5] = -1;
        updateRepairStart(i);
        found = true;
        break;
      }
    }
  }
  return found;
}

function makeItem(data, ship_id) {
  var item = {
    api_id: data.api_id,
    item_id: data.api_slotitem_id,
    level: typeof data.api_level != "undefined" ? data.api_level : 0,
    name: kcif.item_master[data.api_slotitem_id].name,
    type: kcif.item_master[data.api_slotitem_id].type,
    sort_no: kcif.item_master[data.api_slotitem_id].sort_no,
    taiku: kcif.item_master[data.api_slotitem_id].taiku,
    sakuteki: kcif.item_master[data.api_slotitem_id].sakuteki,
    type_name: kcif.item_master[data.api_slotitem_id].type_name,
    ship_id: ship_id
  };
  kcif.item_list[data.api_id] = item;
  return item;
}

function makeShip(data, taihi) {
  var prev = kcif.ship_list[data.api_id];
  var ship = {
    api_id: data.api_id,
    ship_id: data.api_ship_id,
    p_level: prev ? prev.level : data.api_lv,
    level: data.api_lv,
    p_cond: prev ? prev.cond : data.api_cond,
    cond: data.api_cond,
    p_hp: prev ? prev.hp : data.api_nowhp,
    hp: data.api_nowhp,
    hp_max: data.api_maxhp,
    p_fuel: prev ? prev.fuel : data.api_fuel,
    fuel: data.api_fuel,
    p_bull: prev ? prev.bull : data.api_bull,
    bull: data.api_bull,
    slot: data.api_slot,
    equip: data.api_onslot,
    ndock_item: data.api_ndock_item,
    sakuteki: data.api_sakuteki[0],
    exp: data.api_exp,
    taihi: taihi && prev ? prev.taihi : false,
  };
  if (kcif.ship_master[data.api_ship_id]) {
    ship.name = kcif.ship_master[data.api_ship_id].name;
    ship.type = kcif.ship_master[data.api_ship_id].type;
    ship.afterlv = kcif.ship_master[data.api_ship_id].afterlv;
    ship.aftershipid = kcif.ship_master[data.api_ship_id].aftershipid;
    ship.sort_no = kcif.ship_master[data.api_ship_id].sort_no;
    ship.fuel_max = kcif.ship_master[data.api_ship_id].fuel_max;
    ship.bull_max = kcif.ship_master[data.api_ship_id].bull_max;
    ship.equip_max = kcif.ship_master[data.api_ship_id].equip_max;
  }
  kcif.ship_list[data.api_id] = ship;
  return ship;
}

function hasSeiku(type) {
  return (type >= 6 && type <= 8) || type == 11;
}

function isPlane(type) {
  return (type >= 6 && type <= 11 || type == 41);
}

function calcSakuteki(item, type) {
  var co = 0;
  if (type == 1) { // 旧2-5式
    switch (item.type[2]) {
      case 9: // 艦偵
      case 10:// 水偵
      case 11:// 水爆
      case 41:// 大艇
        co = 2.0;
        break;
      default:// その他
        co = 1.0;
        break;
    }
  }
  else if (type == 2) { // 2-5秋式
    switch (item.type[2]) {
      case 7: // 艦爆
        co = 1.0376255;
        break;
      case 8: // 艦攻
        co = 1.3677954;
        break;
      case 9: // 艦偵
        co = 1.6592780;
        break;
      case 10:// 水偵
      case 41:// 大艇
        co = 2.0000000;
        break;
      case 11:// 水爆
        co = 1.7787282;
        break;
      case 12:// 小型電探
        co = 1.0045358;
        break;
      case 13:// 大型電探
        co = 0.9906638;
        break;
      default:// その他
        co = 0.9067950;
        break;
    }
  }
  else { // 2-5秋簡易式
    switch (item.type[2]) {
      case 7: // 艦爆
        co = 0.6;
        break;
      case 8: // 艦攻
        co = 0.8;
        break;
      case 9: // 艦偵
        co = 1.0;
        break;
      case 10:// 水偵
      case 41:// 大艇
        co = 1.2;
        break;
      case 11:// 水爆
        co = 1.0;
        break;
      case 12:// 小型電探
      case 13:// 大型電探
        co = 0.6;
        break;
      default:// その他
        co = 0.5;
        break;
    }
  }
  return co * item.sakuteki;
}

function compareShip(a, b) {
  var result = 0;
  if (kcif.sort_ships.startsWith("no")) {
    result = a.api_id - b.api_id;
  }
  else if (kcif.sort_ships.startsWith("type")) {
    result = a.type - b.type;
  }
  else if (kcif.sort_ships.startsWith("name")) {
    result = a.sort_no - b.sort_no;
  }
  else if (kcif.sort_ships.startsWith("level")) {
    result = a.level - b.level;
  }
  else if (kcif.sort_ships.startsWith("hp")) {
    result = (a.hp / a.hp_max) - (b.hp / b.hp_max);
  }
  else if (kcif.sort_ships.startsWith("cond")) {
    result = a.cond - b.cond;
  }

  if (kcif.sort_ships.endsWith("-")) {
    result = -result;
  }
  if (result == 0) {
    result = a.sort_no - b.sort_no;
  }
  if (result == 0) {
    result = a.api_id - b.api_id;
  }
  return result;
}

function kcifCallback(request, content, query) {
  if (kcif.timer) {
    window.clearTimeout(kcif.timer);
    kcif.timer = null;
  }

  var url = request ? request.name : "";
  var update_all = url != "";
  var n = content ? content.indexOf("=") : -1;
  var json = n >= 0 ? JSON.parse(content.substring(n + 1)) : null;
  if (url.indexOf("/deck_port") != -1 || url.indexOf("/deck") != -1) {
    var deck_list = json.api_data;
    for (var i = 0, deck; deck = deck_list[i]; i++) {
      if (deck.api_mission[2] > 0) {
        var master = kcif.mission_master[deck.api_mission[1]];
        kcif.mission[i] = [deck.api_mission[0], master ? master.name : "", deck.api_mission[2]];
      }
      else if (Array.isArray(kcif.mission[i])) {
        kcif.mission[i] = null;
      }
      log("deck mission: " + i + ": " + kcif.mission[i]);
    }
    update_all = false;
  }
  else if (url.indexOf("/kdock") != -1 || url.indexOf("/getship") != -1) {
    var dock_list = url.indexOf("/kdock") != -1 ? json.api_data : json.api_data.api_kdock;
    for (var i = 0, dock; dock = dock_list[i]; i++) {
      kcif.build[i] = dock;
      log("kdock: " + kcif.build[i].api_id + ": " + kcif.build[i].api_complete_time);
    }
    if (url.indexOf("/getship") != -1) {
      makeShip(json.api_data.api_ship);
      kcif.ship_num++;
      for (var i = 0, slot; slot = json.api_data.api_slotitem[i]; i++) {
        makeItem(slot, json.api_data.api_ship.api_id);
      }
      kcif.item_num += json.api_data.api_slotitem.length;
      log("getship: " + String(kcif.ship_num) + " ships, " + String(kcif.item_num) + " items");
    }
    else {
      update_all = false;
    }
  }
  else if (url.indexOf("/ndock") != -1) {
    var dock_list = json.api_data;
    for (var i = 0, dock; dock = dock_list[i]; i++) {
      kcif.repair[i] = dock;
      log("ndock: " + kcif.repair[i].api_id + ": " + kcif.repair[i].api_complete_time);
    }
    update_all = false;
  }
  else if (url.indexOf("/createship_speedchange") != -1) {
    dock = kcif.build[Number(query["api_kdock_id"]) - 1];
    if (dock) {
      dock.api_state = 3;
      dock.api_complete_time = 0;
      if (dock.api_item1 >= 1000) {
        kcif.material[4] -= 10;
      }
      else {
        kcif.material[4] -= 1;
      }
    }
    update_all = false;
  }
  else if (url.indexOf("/createship") != -1) {
    for (var i = 0; i < kcif.material.length; i++) {
      if (query["api_item" + (i + 1)]) {
        kcif.material[i] -= Number(query["api_item" + (i + 1)]);
      }
    }
    if (Number(query["api_highspeed"]) > 0) {
      kcif.material[4] -= Number(query["api_large_flag"]) > 0 ? 10 : 1;
    }
    update_all = false;
  }
  else if (url.indexOf("/destroyship") != -1) {
    var id = query.api_ship_id;
    var ship = kcif.ship_list[id];
    if (ship) {
      var slots = ship.slot;
      for (var i = 0, slot; (slot = slots[i]) && slot >= 0; i++) {
        delete kcif.item_list[slot];
      }
      kcif.item_num -= slots.filter(function(e){return e >= 0;}).length;
      removeFromDeck(Number(id));
      delete kcif.ship_list[id];
    }
    kcif.ship_num--;
    for (var i = 0; i < json.api_data.api_material.length; i++) {
      kcif.material[i] = json.api_data.api_material[i];
    }
    log("destroyship: " + String(kcif.ship_num) + " ships, " + String(kcif.item_num) + " items");
  }
  else if (url.indexOf("/createitem") != -1) {
    if (json.api_data.api_create_flag > 0) {
      makeItem(json.api_data.api_slot_item, null);
      kcif.item_num++;
    }
    for (var i = 0; i < json.api_data.api_material.length; i++) {
      kcif.material[i] = json.api_data.api_material[i];
    }
    log("createitem: " + String(kcif.item_num) + " items");
  }
  else if (url.indexOf("/destroyitem2") != -1) {
    var ids = query.api_slotitem_ids.split(",");
    for (var i = 0; id = ids[i]; i++) {
      id = Number(id);
      delete kcif.item_list[id];
    }
    kcif.item_num -= ids.length;
    for (var i = 0; i < json.api_data.api_get_material.length; i++) {
      kcif.material[i] += json.api_data.api_get_material[i];
    }
    log("destroyitem2: " + String(kcif.item_num) + " items");
  }
  else if (url.indexOf("/remodel_slot") != -1) {
    if (json.api_data.api_after_material) {
      for (var i = 0; i < json.api_data.api_after_material.length; i++) {
        kcif.material[i] = json.api_data.api_after_material[i];
      }
    }
    if (json.api_data.api_after_slot) {
      var item = kcif.item_list[json.api_data.api_after_slot.api_id];
      if (item) {
        item.item_id = json.api_data.api_after_slot.api_slotitem_id;
        item.level = json.api_data.api_after_slot.api_level;
        if (kcif.item_master[item.item_id]) {
          item.name = kcif.item_master[item.item_id].name;
          item.type = kcif.item_master[item.item_id].type;
          item.sort_no = kcif.item_master[item.item_id].sort_no;
          item.taiku = kcif.item_master[item.item_id].taiku;
          item.sakuteki = kcif.item_master[item.item_id].sakuteki;
          item.type_name = kcif.item_master[item.item_id].type_name;
        }
      }
    }
    log("remodel_slot");
  }
  else if (url.indexOf("nyukyo/start") != -1) {
    var ship = kcif.ship_list[Number(query["api_ship_id"])];
    if (ship && Number(query["api_highspeed"])) {
      ship.p_hp = ship.hp;
      ship.hp = ship.hp_max;
      if (ship.cond < 40) {
        ship.p_cond = ship.cond;
        ship.cond = 40;
      }
      kcif.material[5]--;
    }
    if (ship.ndock_item) {
      kcif.material[0] -= ship.ndock_item[0];
      kcif.material[2] -= ship.ndock_item[1];
    }
    log("nyukyo");
  }
  else if (url.indexOf("/speedchange") != -1) {
    var dock_id = Number(query["api_ndock_id"]);
    if (dock_id > 0 && kcif.repair[dock_id - 1]) {
      var ship = kcif.ship_list[kcif.repair[dock_id - 1].api_ship_id];
      if (ship) {
        ship.p_hp = ship.hp;
        ship.hp = ship.hp_max;
        if (ship.cond < 40) {
          ship.p_cond = ship.cond;
          ship.cond = 40;
        }
      }
      kcif.material[5]--;
      kcif.repair[dock_id - 1].api_ship_id = 0;
      kcif.repair[dock_id - 1].api_complete_time = 0;
      log("nyukyo speedchange");
    }
  }
  else if (url.indexOf("/powerup") != -1) {
    var id_list = query["api_id_items"].split(",");
    for (var i = 0, id; (id = id_list[i]) && i < id_list.length; i++) {
      id = Number(id);
      var ship = kcif.ship_list[id];
      if (ship) {
        var slots = ship.slot;
        for (var j = 0, slot; (slot = slots[j]) && slot >= 0; j++) {
          delete kcif.item_list[slot];
        }
        kcif.item_num -= slots.filter(function(e){return e >= 0;}).length;
        removeFromDeck(id);
        delete kcif.ship_list[id];
      }
    }
    kcif.ship_num -= id_list.length;
    log("powerup: " + String(kcif.ship_num) + " ships, " + String(kcif.item_num) + " items");
  }
  else if (url.indexOf("slotset") != -1) {
    var ship = kcif.ship_list[Number(query["api_id"])];
    if (ship) {
      var item_id = Number(query["api_item_id"]);
      var idx = Number(query["api_slot_idx"]);
      if (ship.slot[idx] >= 0 && kcif.item_list[ship.slot[idx]]) {
        kcif.item_list[ship.slot[idx]].ship_id = null;
      }
      ship.slot[idx] = item_id;
      if (item_id >= 0 && kcif.item_list[ship.slot[item_id]]) {
        kcif.item_list[ship.slot[item_id]].ship_id = ship.api_id;
      }
      else if (item_id < 0) {
        for (var i = idx + 1; i < 5; i++) {
          ship.slot[i - 1] = ship.slot[i];
        }
        ship.slot[4] = -1;
      }
    }
  }
  else if (url.indexOf("unsetslot_all") != -1) {
    var ship = kcif.ship_list[Number(query["api_id"])];
    if (ship) {
      for (var i = 0; i < 5; i++) {
        var item_id = ship.slot[i];
        if (item_id >= 0 && kcif.item_list[item_id]) {
          kcif.item_list[item_id].ship_id = -1;
        }
      }
    }
  }
  else if (url.indexOf("/api_start2") != -1) {
    var mst_ship = json.api_data.api_mst_ship;
    var master = {};
    for (var i = 0, ship; ship = mst_ship[i]; i++) {
      master[ship.api_id] = {
        ship_id: ship.api_id,
        name: ship.api_name,
        yomi: ship.api_yomi,
        type: ship.api_stype,
        afterlv: ship.api_afterlv,
        aftershipid: ship.api_aftershipid,
        sort_no: ship.api_sortno,
        fuel_max: ship.api_fuel_max,
        bull_max: ship.api_bull_max,
        equip_max: ship.api_maxeq
      };
    }
    kcif.ship_master = master;

    var mst_item_type = json.api_data.api_mst_slotitem_equiptype;
    item_type = {};
    for (var i = 0, item; item = mst_item_type[i]; i++) {
      item_type[item.api_id] = {
        type_id: item.api_id,
        name: item.api_name
      };
    }

    var mst_item = json.api_data.api_mst_slotitem;
    master = {};
    for (var i = 0, item; item = mst_item[i]; i++) {
      master[item.api_id] = {
        name: item.api_name,
        type: item.api_type,
        sort_no: item.api_sortno,
        taiku: item.api_tyku,
        sakuteki: item.api_saku,
        type_name: item_type[item.api_type[2]].name
      };
    }
    kcif.item_master = master;

    var mst_mission = json.api_data.api_mst_mission;
    master = {};
    for (var i = 0, item; item = mst_mission[i]; i++) {
      master[item.api_id] = {
        name: item.api_name,
        time: item.api_time,
      };
    }
    kcif.mission_master = master;

    log("ship_master and item_master parsed");
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
    update_all = false;
  }
  else if (url.indexOf("/slot_item") != -1) {
    kcif.item_list = {};
    for (var i = 0, data; data = json.api_data[i]; i++) {
      makeItem(data, null);
    }
    kcif.item_num = json.api_data.length;
    log("slot_item: " + String(kcif.item_num) + " items");
    return;
  }
  else if (url.indexOf("/charge") != -1) {
    for (var i = 0, data; data = json.api_data.api_ship[i]; i++) {
      var ship = kcif.ship_list[data.api_id];
      if (ship) {
        ship.p_fuel = ship.fuel;
        ship.fuel = data.api_fuel;
        ship.p_bull = ship.bull;
        ship.bull = data.api_bull;
      }
    }
    for (var i = 0; i < json.api_data.api_material.length; i++) {
      kcif.material[i] = json.api_data.api_material[i];
    }
    log("charged");
  }
  else if (url.indexOf("/change") != -1) {
    var deck_id = Number(query["api_id"]);
    var deck = kcif.deck_list[deck_id - 1];
    var idx = Number(query["api_ship_idx"]);
    var ship_id = Number(query["api_ship_id"]);
    log("changed (deck:" + deck_id + ", idx:" + idx + ", ship:" + ship_id + ", prev:" + deck.api_ship[idx] + ")");
    if (ship_id == -2) {
      for (var i = 1; i < 6; i++) {
        deck.api_ship[i] = -1;
      }
      updateRepairStart(deck_id - 1);
    }
    else if (ship_id < 0) {
      removeFromDeck(deck.api_ship[idx]);
    }
    else {
      var tmp = deck.api_ship[idx];
      if (tmp < 0) {
        removeFromDeck(ship_id);
        if (idx > 0 && deck.api_ship[idx - 1] < 0) {
          deck.api_ship[idx - 1] = ship_id;
        }
        else {
          deck.api_ship[idx] = ship_id;
        }
      }
      else {
        var found = false;
        for (var i = 0, deck2; (deck2 = kcif.deck_list[i]) && !found; i++) {
          if (deck2 == null) {
            break;
          }
          for (var j = 0; deck2.api_ship[j] >= 0; j++) {
            if (deck2.api_ship[j] == ship_id) {
              deck2.api_ship[j] = tmp;
              found = true;
              break;
            }
          }
          if (found) {
            updateRepairStart(i);
          }
        }
        deck.api_ship[idx] = ship_id;
      }
      updateRepairStart(deck_id - 1);
    }
  }
  else if (url.indexOf("goback_port") != -1) {
    var ship1 = null, ship2 = null;
    for (var i = 0, deck; i < 2 && (deck = kcif.deck_list[i]); i++) {
      for (var j = 1, ship; j < 6 && (ship = kcif.ship_list[deck.api_ship[j]]); j++) {
        if (!ship1 && !ship.taihi && ship.hp <= ship.hp_max / 4) {
          ship1 = ship;
        }
        else if (!ship2 && !ship.taihi && ship.type == 2 && ship.hp > ship.hp_max * 3 / 4) {
          ship2 = ship;
        }
      }
    }
    if (ship1 && ship2) {
      ship1.taihi = true;
      ship2.taihi = true;
    }
  }
  else if (url.indexOf("battleresult") != -1) {
    if (kcif.enemy_id && kcif.enemy_fleets && json.api_data.api_ship_id) {
      var ef = {
        enemy_id: kcif.enemy_id,
        name: json.api_data.api_enemy_info.api_deck_name,
        formation: kcif.enemy_formation,
        id_list: [],
      };
      for (var i = 0; i < 6; i++) {
        ef.id_list[i] = json.api_data.api_ship_id[i + 1];
        if (!ef.id_list[i]) {
          ef.id_list[i] = -1;
        }
        log(" " + i + ": " + ef.id_list[i]);
      }
      kcif.enemy_fleets[kcif.enemy_id] = ef;
      saveEnemyFleetsToStorage();
      log("enemy: ID" + kcif.enemy_id + " saved (ef.id_list=" + (ef.id_list ? "exist" : "not exist") + ", fleets.id_list=" + (kcif.enemy_fleets[kcif.enemy_id].id_list ? "exist" : "not exist") + ")");
    }
    update_all = false;
  }
  else if (url.indexOf("battle") != -1) {
    if (getShowBattle()) {
      log("battle: " + url);
      var deck_id = Number(json.api_data.api_dock_id || json.api_data.api_deck_id);
      if (url.indexOf("practice") != -1 && (!kcif.mission[deck_id - 1] || kcif.mission[deck_id - 1].indexOf("演習") == -1)) {
        kcif.mission[deck_id - 1] = "演習";
        if (url.indexOf("midnight") == -1) {
          kcif.battle_result = [[], []];
        }
      }
      battle(url, json);
    }
  }
  else if (url.indexOf("_map/start") != -1) {
    kcif.battle_result = [[], []];
    var deck_id = Number(query["api_deck_id"]);
    if (deck_id > 0) {
      kcif.mission[deck_id - 1] = map2str(json.api_data);
      log("start: " + deck_id + ": " + kcif.mission[deck_id - 1]);
      if (kcif.enemy_id) {
        log("  enemy: ID" + kcif.enemy_id);
      }
    }
    update_all = false;
  }
  else if (url.indexOf("_map/next") != -1) {
    kcif.battle_result = [[], []];
    for (var i = 0; i < 4; i++) {
      var mission = kcif.mission[i]
      if (mission && !Array.isArray(mission)) {
        kcif.mission[i] = map2str(json.api_data);
        log("next: " + (i + 1) + ": " + kcif.mission[i]);
        if (kcif.enemy_id) {
          log("  enemy: ID" + kcif.enemy_id);
        }
        break;
      }
    }
    update_all = false;
  }
  else if (url.indexOf("/material") != -1) {
    for (var i = 0, data; data = json.api_data[i]; i++) {
      kcif.material[data.api_id - 1] = data.api_value;
    }
  }
  else if (url.indexOf("/ship") != -1 || url.indexOf("/port") != -1) {
    var port = url.indexOf("/port") != -1;
    var ship2 = url.indexOf("/ship2") != -1;
    var data_list = port ? json.api_data.api_ship : ship2 ? json.api_data : json.api_data.api_ship_data;
    var deck_list = port ? json.api_data.api_deck_port : ship2 ? json.api_data_deck : json.api_data.api_deck_data;
    if (port) {
      for (var i = 0, deck; deck = deck_list[i]; i++) {
        master = kcif.mission_master[deck.api_mission[1]];
        if (deck.api_mission[2] > 0) {
          kcif.mission[i] = [deck.api_mission[1], master ? master.name : "", deck.api_mission[2]];
        }
        else {
          kcif.mission[i] = null;
        }
      }

      kcif.admiral_level = Number(json.api_data.api_basic.api_level);
      kcif.ship_max = Number(json.api_data.api_basic.api_max_chara);
      kcif.item_max = Number(json.api_data.api_basic.api_max_slotitem) + 3;
      kcif.enemy_id = null;
    }
    kcif.deck_list = deck_list;

    for (var i = 0, data; data = data_list[i]; i++) {
      var ship = makeShip(data, !port);
      for (var j = 0, slot; slot = data.api_slot[j]; j++) {
        if (slot >= 0 && kcif.item_list[slot]) {
          kcif.item_list[slot].ship_id = ship.api_id;
        }
      }
    }
    if (port || ship2) {
      kcif.ship_num = i;
    }
    if (port) {
      for (var i = 0, data; data = json.api_data.api_material[i]; i++) {
        kcif.material[data.api_id - 1] = data.api_value;
      }

      var now = new Date().getTime();
      for (var i = 0, deck; deck = kcif.deck_list[i]; i++) {
        var leader = kcif.ship_list[deck.api_ship[0]];
        if (Array.isArray(kcif.mission[i]) || !leader || leader.type != 19) {
          continue;
        }
        var num = 1;
        if (leader.name.indexOf("改") != -1) {
          num++;
        }
        for (var j = 0, slot; j < 5 && (slot = leader.slot[j]) >= 0; j++) {
          var item = kcif.item_list[slot];
          if (item && item.type[2] == 31) { // 艦艇修理施設
            num++;
          }
        }

        var changed = false;
        for (var j = 0, ship; (ship = kcif.ship_list[deck.api_ship[j]]) && j < num; j++) {
          if (kcif.repair.filter(function(e){return e.api_ship_id == ship.api_id}).length != 0) {
            continue;
          }
          if (ship.hp != ship.p_hp) {
            changed = true;
            break;
          }
        }
        if (changed && ((kcif.repair_start[i] && kcif.repair_start[i] < now) || !kcif.repair_start[i])) {
          kcif.repair_start[i] = now;
        }
      }

      var dock_list = json.api_data.api_ndock;
      for (var i = 0, dock; dock = dock_list[i]; i++) {
        kcif.repair[i] = dock;
      }
    }

    log("etc: " + String(kcif.ship_num) + " ships (" + (port ? "port" : ship2 ? "ship2" : "ship3") + ")");
  }
  else {
    //log("timer(?): " + url + " , query: " + hash2str(query));
  }

  kcif.renderInfo(update_all);

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
    if (path.match(/\/kcsapi\/(api_start2|api_get_member\/(ship[23]|basic|record|deck|kdock|ndock|slot_item|material)|api_port\/port|api_req_kousyou\/(createship(_speedchange)|getship|destroyship|createitem|destroyitem2|remodel_slot)|api_req_nyukyo\/(start|speedchange)|api_req_kaisou\/(powerup|slotset|unsetslot_all)|api_req_hokyu\/charge|api_req_hensei\/change|api_req_sortie\/(air)?battle(result)?|api_req_battle_midnight\/(battle|sp_midnight)|api_req_combined_battle\/((air|midnight_)?battle(_water)?(result)?|sp_midnight|goback_port)|api_req_practice\/(midnight_)?battle|api_req_map\/(start|next))$/)) {
      log("create TracingListener: " + path);
      var newListener = new TracingListener();
      aSubject.QueryInterface(Ci.nsITraceableChannel);
      newListener.originalListener = aSubject.setNewListener(newListener);
    }
  },

  QueryInterface: XPCOMUtils.generateQI(["nsIObserver"])
};

var kcif = {
  area_game: null,
  game_frame: null,
  flash: null,
  info_div: null,
  current_tab: "tab-main",
  current_fleet: "fleet1",
  beep: null,
  sort_ships: "level-",
  sort_items: "type+",
  repair_start: [null, null, null, null],
  storage: null,
  ship_master: {},
  item_master: {},
  mission_master: {},
  ship_list: {},
  item_list: {},
  mission: [],
  repair: [],
  build: [],
  deck_list: [],
  ship_num: 0,
  ship_max: 0,
  item_num: 0,
  item_max: 0,
  admiral_revel: 1,
  material: [0, 0, 0, 0, 0, 0, 0, 0],
  battle_result: [[], []],
  enemy_fleets: null,
  enemy_id: null,
  enemy_formation: null,
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
    if (kcif.beep) {
      kcif.beep.pause();
    }
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
    if (url.match(/osapi\.dmm\.com\//) && url.match(/aid=854854/)) {
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
      sheet.insertRule('#kancolle-info .tab meter { background: -moz-linear-gradient(top, #aaa, #eee 20%, #aaa 30%, #888 60%, #666); }', sheet.length);
      sheet.insertRule('#kancolle-info .tab meter.full::-moz-meter-bar { background: -moz-linear-gradient(top, #5f7, #cfd 20%, #5f7 30%, #3c5 60%, #2a3); }', sheet.length);
      sheet.insertRule('#kancolle-info .tab meter.little::-moz-meter-bar { background: -moz-linear-gradient(top, #8f6, #efc 20%, #8f6 30%, #7b5 60%, #673); }', sheet.length);
      sheet.insertRule('#kancolle-info .tab meter.slight::-moz-meter-bar { background: -moz-linear-gradient(top, #ed4, #eec 20%, #ed4 30%, #aa3 60%, #882); }', sheet.length);
      sheet.insertRule('#kancolle-info .tab meter.half::-moz-meter-bar { background: -moz-linear-gradient(top, #f93, #fdb 20%, #f93 30%, #b72 60%, #861); }', sheet.length);
      sheet.insertRule('#kancolle-info .tab meter.serious::-moz-meter-bar { background: -moz-linear-gradient(top, #f55, #faa 20%, #f55 30%, #d44 60%, #a33); }', sheet.length);
      sheet.insertRule('#kancolle-info .tab-header a { color: inherit; text-decoration: none; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab-header a:hover { color: yellow; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab { padding: 2px 8px 2px 8px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab h2 { font-size: 10pt; font-weight: normal; padding: 0; margin: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .list-header { color: skyblue; text-decoration: none; font-weight: bold; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab a.list-header:hover { color: yellow !important; dext-decoration: none !important; font-weight: bold !important; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab table { color: inherit; font-size: 10pt; padding: 0; margin: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab table tr { padding: 0; margin: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab table th, #kancolle-info .tab table td { padding: 0; margin: 0; line-height: 1.2; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-outer { position: relative; padding-top: 20px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-inner { height: 256px; overflow: auto; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-outer .table-inner table thead { position: absolute; top: 0px; left: 0px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-outer .table-inner table thead th { text-align: left; font-weight: bold; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-outer .table-inner table thead th.th-right { text-align: right; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-no, #kancolle-info .tab .item-no, #kancolle-info .tab .item-num { text-align: right; padding: 0 6px 0 4px; width: 1.8em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-type { width: 2.7em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-name { font-weight: bold; width: 8.5em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-level, #kancolle-info .tab .ship-cond { text-align: right; width: 2.7em; padding-right: 15px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-hp-header { width: 70px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-hp { text-align: right; width: 70px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-hp-meter { padding-top: 4px; text-align: right; width: 70px; line-height: 0; font-size: 8pt; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-hp-meter meter { width: 70px; height: 6px; margin-top: 5px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-at { text-align: right; width: 7.4em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-fuel, #kancolle-info .tab .ship-bull { text-align: right; width: 3.8em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-fuel-bull-header { width: 4.2em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-fuel-bull { width: 4.2em; line-height: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-fuel-bull meter { width: 4.2em; height: 5px; margin-bottom: 1px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-exp { text-align: right; width: 5.0em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-desc { text-align: left; padding-left: 12px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .item-type { width: 8em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .item-name { font-weight: bold; width: 14em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .item-level { text-align: right; width: 2.2em; padding-right: 12px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .res-name { font-weight: bold; width: 6em; padding-left: 1.5em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .res-value { text-align: right; width: 4.5em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab a.sort-current { color: yellow; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-main #resource { width: 174px; float: right; padding-left: 8px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-main #ndock { width: 482px; float: left; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-main #kdock { width: 302px; float: left; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-main table { position: relative; top: -3px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-main input.check-timer { padding: 0; margin: 0 0 0 4px; position: relative; top: 2px;}', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config table { width: 100%; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-header { text-align: right; width: 12em; padding: 2px 16px 0 0; color: skyblue; text-decoration: none; font-weight: bold; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-label { text-align: right; width: 12em; padding-right: 16px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.version { text-align: right; color: silver; font-weight: bold; padding-right: 16px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-input { text-align: left; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-input input[type=text] { width: 40em; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-input input[type=number] { width: 4em; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-input input[type=checkbox] { padding: 0; margin: 0 4px 0 0; position: relative; top: 2px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config td.config-input button { padding: 0; margin: 0; height: 24px; font-size: 10.5px; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config div.config-buttons { text-align: center; }', sheet.length);
      sheet.insertRule('#kancolle-info #tab-config div.config-buttons button { width: 5em; padding: 0; margin: 0; height: 24px; font-size: 10.5px; }', sheet.length);
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

      kcif.renderFrame();

      doc.body.setAttribute("onload", "function setHeight(){if (typeof ConstGadgetInfo != 'undefined') ConstGadgetInfo.height = 920; else window.setTimer(setHeight, 100);} setHeight();");
    }
    else if (url.match(/\/app_id=854854\//)) {
      log("DOMloaded:", url);
      var area_game = doc.querySelector("#area-game");
      if (area_game) {
        area_game.style.height = '920px';
        kcif.area_game = area_game;
      }
      var game_frame = doc.querySelector("#game_frame");
      if (game_frame) {
        kcif.game_frame = game_frame;
      }

      doc.body.setAttribute("onload", "if (typeof DMM != 'undefined' && DMM.netgame) DMM.netgame.reloadDialog = function(){};");

      if (!kcif.enemy_fleets) {
        loadEnemyFleetsFromStorage();
      }
    }
  },

  renderFrame: function() {
    if (kcif.area_game && parseInt(kcif.area_game.style.height) < 920) {
        kcif.area_game.style.height = '920px';
    }
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
      html += '<span class="color-yellow blink">Loading...</span>';
      html += '</div>';

      html += '<div id="tab-config" class="tab">';
      html += '<div class="table-inner"><table>';
      html += '<tr><td class="config-header">画面キャプチャ</td><td></td></tr>';
      html += '<tr><td class="config-label">保存先</td><td class="config-input"><input id="capture-save-dir" type="text" value="' + getCaptureSaveDir() + '"></td></tr>';
      html += '<tr><td class="config-label">ベース名</td><td class="config-input"><input id="capture-save-base" type="text" value="' + getCaptureSaveBase() + '"></td></tr>';
      html += '<tr><td class="config-header">タイマーサウンド</td><td></td></tr>';
      html += '<tr><td class="config-label">サウンドファイルURL</td><td class="config-input"><input id="beep-url" type="text" value="' + getBeepUrl() + '"></td></tr>';
      html += '<tr><td class="config-label">ボリューム(0～100)</td><td class="config-input"><input id="beep-volume" type="number" max="100" min="0" value="' + getBeepVolume() + '"> <button id="beep-test">テスト</button></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="beep-expedition" type="checkbox"' + (getBeepExpedition() ? ' checked' : '') + '>遠征帰還時のサウンド再生を自動でONにする</label></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="beep-dock" type="checkbox"' + (getBeepDock() ? ' checked' : '') + '>入渠終了時のサウンド再生を自動でONにする</label></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="beep-built" type="checkbox"' + (getBeepBuilt() ? ' checked' : '') + '>建造終了時のサウンド再生を自動でONにする</label></td></tr>';
      html += '<tr><td class="config-header">情報表示</td><td></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="show-battle" type="checkbox"' + (getShowBattle() ? ' checked' : '') + '>戦闘結果を表示する</label></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="show-built" type="checkbox"' + (getShowBuilt() ? ' checked' : '') + '>建造結果を表示する</label></td></tr>';
      html += '<tr><td class="config-header">表示カスタマイズ</td><td></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="hp-by-meter" type="checkbox"' + (getHpByMeter() ? ' checked' : '') + '>耐久値をメーター表示する</label></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><label><input id="fuel-by-meter" type="checkbox"' + (getFuelByMeter() ? ' checked' : '') + '>燃料・弾薬をメーター表示する</label></td></tr>';
      html += '<tr><td class="config-label">索敵値計算式</td><td class="config-input"><select id="search-formula"><option value="0"' + (getSearchFormula() == 0 ? ' selected' : '') + '>総計</option><option value="1"' + (getSearchFormula() == 1 ? ' selected' : '') + '>旧2-5式</option><option value="2"' + (getSearchFormula() == 2 ? ' selected' : '') + '>2-5秋式</option><option value="3"' + (getSearchFormula() == 3 ? ' selected' : '') + '>秋簡易式</option></select></td></tr>';
      html += '<tr><td class="config-header">敵艦隊編成情報</td><td></td></tr>';
      html += '<tr><td class="config-label"></td><td class="config-input"><button id="load-enemy-fleets">ファイル読み込み</button> <button id="save-enemy-fleets">ファイル書き出し</button> <button id="reset-enemy-fleets">リセット</button></td></tr>';
      html += '</table></div>';
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
        elems[i].addEventListener("click", selectTab, false);
      }
      var elem = kcif.info_div.querySelector("#" + kcif.current_tab.replace("-", "-header-") + " a");
      if (elem) {
        elem.click();
      }

      // 設定:テキスト
      var elems = kcif.info_div.querySelectorAll("#tab-config input[type=text], #tab-config input[type=number]");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("input", function() {
          kcif.info_div.querySelector("#config-save").disabled = !checkConfigChanged();
          kcif.info_div.querySelector("#config-reset").disabled = !checkConfigChanged();
        }, false);
      }

      // 設定:チェックボックス
      var elems = kcif.info_div.querySelectorAll("#tab-config input[type=checkbox]");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", function() {
          kcif.info_div.querySelector("#config-save").disabled = !checkConfigChanged();
          kcif.info_div.querySelector("#config-reset").disabled = !checkConfigChanged();
        }, false);
      }

      // 設定:リストボックス
      var elems = kcif.info_div.querySelectorAll("#tab-config select");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("change", function() {
          kcif.info_div.querySelector("#config-save").disabled = !checkConfigChanged();
          kcif.info_div.querySelector("#config-reset").disabled = !checkConfigChanged();
        }, false);
      }

      // 設定:敵艦隊編成情報ファイル読み込み
      var elem = kcif.info_div.querySelector("#load-enemy-fleets");
      if (elem) {
        elem.addEventListener("click", loadEnemyFleetsFromFile, false, true);
      }

      // 設定:敵艦隊編成情報ファイル書き出し
      var elem = kcif.info_div.querySelector("#save-enemy-fleets");
      if (elem) {
        elem.addEventListener("click", saveEnemyFleetsToFile, false, true);
      }

      // 設定:敵艦隊編成情報リセット
      var elem = kcif.info_div.querySelector("#reset-enemy-fleets");
      if (elem) {
        elem.addEventListener("click", function(evt){
          evt.preventDefault();

          if (window.confirm("敵艦隊編成情報をリセットします。\n本当によろしいですか？")) {
            kcif.enemy_fleets = {};
            kcif.putStorage("enemy_fleets", JSON.stringify(kcif.enemy_fleets));
            log("enemy fleets reset");
          }
        }, false, true);
      }

      // 設定:保存
      var elem = kcif.info_div.querySelector("#config-save");
      if (elem) {
        elem.addEventListener("click", saveConfig, false, true);
        elem.disabled = true;
      }

      // 設定:クリア
      var elem = kcif.info_div.querySelector("#config-reset");
      if (elem) {
        elem.addEventListener("click", resetConfig, false);
        elem.disabled = true;
      }

      // 設定:タイマーサウンドテスト
      var elem = kcif.info_div.querySelector("#beep-test");
      if (elem) {
        var beeptest = null;
        elem.addEventListener("click", function(evt) {
          evt.preventDefault();
          var url = kcif.info_div.querySelector("#beep-url").value;
          if (beeptest && beeptest.src != url) {
            log("beeptest: url=[" + url + "], src=[" + beeptest.src + "]");
            beeptest.pause();
            beeptest = null;
          }
          if (!/^[a-z]+:\/\//.test(url)) {
            return;
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
        }, false, true);
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

  renderInfo: function(all) {
    if (kcif.info_div) {
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

      html += '<div id="resource">';
      html += '<h2><span class="list-header">資源等</span></h2>';
      html += '<table>';
      html += formatMaterial("燃料", kcif.material[0], kcif.admiral_level);
      html += formatMaterial("弾薬", kcif.material[1], kcif.admiral_level);
      html += formatMaterial("鋼材", kcif.material[2], kcif.admiral_level);
      html += formatMaterial("ボーキサイト", kcif.material[3], kcif.admiral_level);
      html += '<tr><th class="res-name">&nbsp;</th><td class="res-value">&nbsp;</td></tr>';
      html += formatMaterial("高速修復材", kcif.material[5]);
      html += formatMaterial("開発資材", kcif.material[6]);
      html += formatMaterial("高速建造材", kcif.material[4]);
      html += formatMaterial("改修資材", kcif.material[7]);
      html += '</table>';
      html += '</div>';

      for (var i = 0; i < 4; i++) {
        var deck = kcif.deck_list[i];
        var lhtml = "";
        html += '<div id="fleet' + (i + 1) + '" class="fleet">';
        var col = "color-default";
        var t = kcif.mission[i];
        var s = null;
        if (Array.isArray(t)) {
          var dt = new Date(t[2]);
          s = "[<span title='" + t[1] + "'>遠征中</span> <label>" + time2str(dt) + "<input id='check-fleet" + (i + 1) + "' type='checkbox' class='check-timer check-expedition'></label>]";
          col = getTimeColor(dt);
        }
        else if (t) {
          if (getShowBattle() || t == "(連合艦隊)") {
            if (kcif.enemy_id) {
              var efs = "";
              var ef = kcif.enemy_fleets[kcif.enemy_id];
              if (ef && ef.id_list) {
                efs += ef.name + "(ID" + kcif.enemy_id + ") " + form2str(ef.formation);
                for (var j = 0, id; (id = ef.id_list[j]) && id >= 0; j++) {
                  efs += "&#10; " + (j + 1) + ": ";
                  var mst = kcif.ship_master[id];
                  if (mst) {
                    efs += mst.name;
                    if (mst.sort_no == 0 && mst.yomi != "-") {
                      efs += mst.yomi;
                    }
                  }
                  else {
                    efs += "(不明:" + id + ")";
                  }
                }
              }
              else {
                efs += "不明(ID" + kcif.enemy_id + ")";
              }
              t = t.replace(/^[\*\+] \d+-\d+-\d/, '<span title="' + efs + '">$&</span>');
            }
            s = "[" + t + "]";
          }
          else {
            s = "[出撃中]";
          }
          col = "color-green";
        }
        if (deck || i == 0) {
          var ships = [];
          var level_sum = 0;
          var sup = [];
          var sup_col = "";
          var kira = [];
          var drum = 0;
          var drum_ship = [];
          var dai = 0;
          var dai_ship = [];
          var seiku = 0;
          var sakuteki = 0;
          var sakuteki0 = 0;
          var sakuteki1 = 0;
          var sakuteki1i = 0;
          var sakuteki2 = 0;
          var ndock = [];
          var damage = [];
          for (var j = 0; j < 6; j++) {
            var id = deck ? deck.api_ship[j] : -1
            if (id === -1 || id == null) {
              lhtml += '<tr><td class="ship-no">' + (j + 1) + '</td><td colspan="9"></td></tr>';
              continue;
            }
            var ship = kcif.ship_list[id];
            if (ship != null) {
              ships.push(ship);
              var kit = null;
              for (var k = 0; ship.slot && k < 5; k++) {
                if (ship.slot[k] < 0) {
                  break;
                }
                var item = kcif.item_list[ship.slot[k]];
                if (item && item.type[2] == 23) { // 応急修理要員
                  kit = item.name;
                  break;
                }
              }
              if (kit) {
                lhtml += '<tr><td class="ship-no color-red" title="' + kit + '">' + (j + 1) + '</td>';
              }
              else {
                lhtml += '<tr><td class="ship-no">' + (j + 1) + '</td>';
              }
              lhtml += shipType(ship);
              lhtml += shipName(ship);
              lhtml += shipLevel(ship);
              lhtml += shipHp(ship);
              lhtml += shipCond(ship);
              lhtml += shipFuelBull(ship);
              lhtml += shipExp(ship);
              if (kcif.repair.filter(function(e){return e.api_ship_id == ship.api_id}).length != 0) {
                lhtml += '<td class="ship-desc color-red">入渠中</td>';
                ndock.push(ship.name);
              }
              else {
                lhtml += '<td class="ship-desc"></td>';
              }
              lhtml += '</tr>';
              if (t && isNaN(Number(t))) {
                if (!ship.taihi && ship.hp <= ship.hp_max / 4) {
                  col = "color-red";
                }
                else if (!ship.taihi && ship.hp <= ship.hp_max / 2 && col != "color-red") {
                  col = "color-orange";
                }
              }
              if (ship.hp < ship.hp_max) {
                damage[j] = true;
              }
            }

            level_sum += ship.level;
            if (ship.fuel < ship.fuel_max || ship.bull < ship.bull_max) {
              sup.push(ship.name);
              var col1 = fuelBullColor(ship.fuel, ship.fuel_max);
              var col2 = fuelBullColor(ship.bull, ship.bull_max);
              if (/red/.test(col1)) {
                sup_col = col1;
              }
              else if (/red/.test(col2)) {
                sup_col = col2;
              }
              else if (!/red/.test(sup_col)) {
                if (/orange/.test(col1)) {
                  sup_col = col1;
                }
                else if (/orange/.test(col2)) {
                  sup_col = col2;
                }
                else if (!/orange/.test(sup_col)) {
                  if (/yellow/.test(col1)) {
                    sup_col = col1;
                  }
                  else if (/yellow/.test(col2)) {
                    sup_col = col2;
                  }
                }
              }
            }
            if (ship.cond >= 50) {
              kira.push(ship.name);
            }
            var drum_p = false;
            var dai_p = false;
            var s_base = ship.sakuteki;
            var s_sakuteki = 0;
            var s_sakuteki1 = 0;
            var s_sakuteki2 = 0;
            for (var k = 0; ship.slot && k < 5; k++) {
              if (ship.slot[k] < 0) {
                break;
              }
              var item = kcif.item_list[ship.slot[k]];
              if (item) {
                if (item.item_id == 75) { // ドラム缶(輸送用)
                  drum++;
                  drum_p = true;
                }
                else if (item.item_id == 68) { // 大発動艇
                  dai++;
                  dai_p = true;
                }
                else if (hasSeiku(item.type[2]) && ship.equip[k] > 0) {
                  seiku += Math.floor(item.taiku * Math.sqrt(ship.equip[k]));
                }
                s_base -= item.sakuteki;
                s_sakuteki += calcSakuteki(item);
                s_sakuteki1 += calcSakuteki(item, 1);
                s_sakuteki2 += calcSakuteki(item, 2);
              }
            }
            if (drum_p) {
              drum_ship.push(ship.name);
            }
            if (dai_p) {
              dai_ship.push(ship.name);
            }
            s_sakuteki += Math.sqrt(s_base);
            s_sakuteki2 += Math.sqrt(s_base) * 1.6841056;
            sakuteki += Math.floor(s_sakuteki);
            sakuteki0 += ship.sakuteki;
            sakuteki1 += s_base;
            sakuteki1i += s_sakuteki1;
            sakuteki2 += s_sakuteki2;
          }
          sakuteki -= Math.floor(0.4 * kcif.admiral_level);
          sakuteki1 = Math.floor(Math.sqrt(sakuteki1)) + sakuteki1i;
          sakuteki2 -= Math.ceil((kcif.admiral_level) / 5) * 5.0 * 0.6142467;

          if (s) {
            s = ' <span class="' + col + '">' + s + '</span>';
          }
          else {
            var reparing = false;
            var num = 1;
            if (ships.length > 0 && ships[0].type == 19) { // 工作艦
              if (ships[0].name.indexOf("改") != -1) {
                num++;
              }
              for (var j = 0, slot; j < 5 && (slot = ships[0].slot[j]) >= 0; j++) {
                var item = kcif.item_list[slot];
                  if (item && item.type[2] == 31) { // 艦艇修理施設
                  num++;
                }
              }
              for (var j = 0; j < num; j++) {
                if (damage[j]) {
                  reparing = true;
                  break;
                }
              }
            }
            if (reparing) {
              var rcol = "color-yellow";
              if (!kcif.repair_start[i]) {
                kcif.repair_start[i] = new Date().getTime();
              }
              var now = new Date().getTime();
              var rt = kcif.repair_start[i] + 20 * 60 * 1000;
              if (rt < now) {
                rcol = "color-red";
              }
              else if (rt < now + 60 * 1000) {
                rcol = "color-orange";
              }
              s = ' <span class="' + rcol + '" title="' + num + '隻修理可能">[修理中 更新' + time2str(new Date(rt)) + ']</span>';
            }
            else {
              s = "";
            }
            if (sup.length > 0) {
              s += ' <span class="' + sup_col + ' blink" title="' + sup.join(', ') + '">未補給艦あり</span>';
            }
            if (ndock.length > 0) {
              s += ' <span class="color-red" title="' + ndock.join(', ') + '">入渠艦あり</span>';
            }
          }

          if (ships.length > 0) {
            s += ' <span class="color-gray" title="旗艦 ' + ships[0].name + '">LV:' + ships[0].level + '/' + level_sum + '</span>';
            s += ' <span class="color-gray" title="' + seiku2str(seiku) + '">制空:' + seiku + '</span>';
            s += ' <span class="color-gray" title="';
            var formula = getSearchFormula();
            if (formula != 0) {
              s += '総計:' + sakuteki0 + '&#10;';
            }
            if (formula != 1) {
              s += '旧2-5式:' + Math.floor(sakuteki1) + '&#10;';
            }
            if (formula != 2) {
              s += '2-5秋式:' + sakuteki2.toFixed(1) + '&#10;';
            }
            if (formula != 3) {
              s += '秋簡易式:' + sakuteki + '&#10;';
            }
            s += '">索敵:';
            if (formula == 0) {
              s += sakuteki0;
            }
            else if (formula == 1) {
              s += Math.floor(sakuteki1);
            }
            else if (formula == 2) {
              s += sakuteki2.toFixed(1);
            }
            else {
              s += sakuteki;
            }
            s += '</span>';
            s += ' <span class="color-gray" title="' + kira.join(', ') + '">キラ:' + kira.length + '/' + ships.length + '</span>';
            if (drum > 0) {
              s += ' <span class="color-gray" title="' + drum_ship.join(', ') + '">ドラム:' + drum + '/' + drum_ship.length + '</span>';
            }
            if (dai > 0) {
              s += ' <span class="color-gray" title="' + dai_ship.join(', ') + '">大発:' + dai + '</span>';
            }
          }

          html += '<h2><a class="list-header" href="#" title="' + (deck ? deck.api_name : "") + '">第' + (i + 1) + '艦隊</a>' + s + '</h2>';
        }
        else {
          html += '<h2><span class="list-header" href="#">第' + (i + 1) + '艦隊</span> <span class="color-gray">[未開放]</span></h2>';
        }

        html += '<table>' + lhtml + '</table>';
        html += '</div>';
      }

      html += '<div id="ndock">';
      html += '<h2><span class="list-header">入渠</span></h2>';
      html += '<table>';
      for (var i = 0; kcif.repair[i]; i++) {
        if (kcif.repair[i].api_complete_time > 0) {
          html += '<tr><td class="ship-no">' + kcif.repair[i].api_id + '</td>';
          var ship = kcif.ship_list[kcif.repair[i].api_ship_id];
          html += shipType(ship);
          html += shipName(ship);
          html += shipLevel(ship);
          html += shipHp(ship);
          html += shipCond(ship);
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
      html += '<h2><span class="list-header">建造</span></h2>';
      html += '<table>';
      for (var i = 0; kcif.build[i]; i++) {
        if (kcif.build[i].api_complete_time > 0 || kcif.build[i].api_state == 3) {
          html += '<tr><td class="ship-no">' + kcif.build[i].api_id + '</td>';
          var ship = kcif.ship_master[kcif.build[i].api_created_ship_id];
          if (getShowBuilt()) {
            html += shipType(ship);
            html += shipName(ship);
          }
          else {
            html += '<td class="ship-type">???</td>';
            html += '<td class="ship-name">???</td>';
          }
          var col;
          var s;
          if (kcif.build[i].api_complete_time > 0) {
            var dt = new Date(kcif.build[i].api_complete_time);
            s = time2str(dt);
            col = getTimeColor(dt, true);
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
        elems[i].addEventListener("click", selectFleet, false);
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
      var table = shipstab.querySelector("div.table-inner");
      var pos = table ? table.scrollTop : 0;
      html = "";
      html += '<div class="table-outer"><div class="table-inner"><table>';
      html += '<thead><tr><th class="ship-no th-right"><a class="list-header' + (kcif.sort_ships.startsWith("no") ? ' sort-current' : '') + '" href="#">#</a></th><th class="ship-type"><a class="list-header' + (kcif.sort_ships.startsWith("type") ? ' sort-current' : '') + '" href="#">艦種</a></th><th class="ship-name' + (kcif.sort_ships.startsWith("name") ? ' sort-current' : '') + '"><a class="list-header" href="#">艦名</a></th><th class="ship-level th-right"><a class="list-header' + (kcif.sort_ships.startsWith("level") ? ' sort-current' : '') + '" href="#">LV</a></th><th class="ship-hp-header' + (getHpByMeter() ? '' : ' th-right') + '"><a class="list-header' + (kcif.sort_ships.startsWith("hp") ? ' sort-current' : '') + '" href="#">耐久</a></th><th class="ship-cond th-right"><a class="list-header' + (kcif.sort_ships.startsWith("cond") ? ' sort-current' : '') + '" href="#">疲労</a></th>' + (getFuelByMeter() ? '<th class="ship-fuel-bull-header">燃料弾薬</th>' : '<th class="ship-fuel th-right">燃料</th><th class="ship-bull th-right">弾薬</th>') + '<th class="ship-exp th-right">経験値</th><th class="ship-desc">所在</th></tr></thead>';
      html += '<tbody>';

      var ships = [];
      for (var prop in kcif.ship_list) {
        if (kcif.ship_list[prop].type) {
          ships.push(kcif.ship_list[prop]);
        }
      }
      ships.sort(compareShip);

      for (var i = 0, ship; ship = ships[i]; i++) {
        html += '<tr><td class="ship-no">' + (i + 1) + '</td>';
        html += shipType(ship);
        html += shipName(ship);
        html += shipLevel(ship);
        html += shipHp(ship);
        html += shipCond(ship);
        html += shipFuelBull(ship);
        html += shipExp(ship);
        var fleet = null;
        for (var j = 0, deck; deck = kcif.deck_list[j]; j++) {
          if (deck.api_ship.filter(function(e){ return e == ship.api_id; }).length != 0) {
            fleet = j + 1;
            break;
          }
        }
        if (fleet) {
          html += '<td class="ship-desc">第' + fleet + '艦隊<span class="color-gray">「' + kcif.deck_list[fleet - 1].api_name + '」</span></td>';
        }
        else if (kcif.repair.filter(function(e){ return e.api_ship_id == ship.api_id; }).length != 0) {
          html += '<td class="ship-desc color-red">入渠中</td>';
        }
        else {
          html += '<td class="ship-desc"></td>';
        }
        html += '</tr>';
      }

      html += '</tbody>';
      html += '</table></div></div>';
      shipstab.innerHTML = html;
      shipstab.querySelector("div.table-inner").scrollTop = pos;

      // 艦娘:ヘッダ行リンク
      var elems = shipstab.querySelectorAll("th a");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", function(evt){
          evt.preventDefault();
          var sort = this.parentNode.className.replace(/ .*/, "").replace(/^.*-/, "");
          log("sort (ships) [" + kcif.sort_ships + "] -> [" + sort + "]");
          if (kcif.sort_ships.startsWith(sort)) {
            kcif.sort_ships = sort + (kcif.sort_ships.endsWith("+") ? "-" : "+");
          }
          else {
            kcif.sort_ships = sort + (sort == "no" || sort == "level" ? "-" : "+");
          }
          kcif.renderInfo(true);
        }, false);
      }

      // アイテム
      var itemstab = kcif.info_div.querySelector("#tab-items");
      table = itemstab.querySelector("div.table-inner");
      pos = table ? table.scrollTop : 0;
      html = "";
      html += '<div class="table-outer"><div class="table-inner"><table>';
      html += '<thead><tr><th class="item-no th-right"><a class="list-header' + (kcif.sort_items.startsWith("no") ? ' sort-current' : '') + '" href="#">#</a></th><th class="item-type"><a class="list-header' + (kcif.sort_items.startsWith("type") ? ' sort-current' : '') + '" href="#">種別</a></th><th class="item-name"><a class="list-header' + (kcif.sort_items.startsWith("name") ? ' sort-current' : '') + '" href="#">名称</a></th><th class="item-level th-right"><a class="list-header' + (kcif.sort_items.startsWith("level") ? ' sort-current' : '') + '" href="#">改修</a></th><th class="ship-name"><a class="list-header' + (kcif.sort_items.startsWith("holder") ? ' sort-current' : '') + '" href="#">所在</a></th><th class="ship-level"></th></tr></thead>';
      html += '<tbody>';

      var items = [];
      for (var prop in kcif.item_list) {
        if (kcif.item_list[prop].type[2]) {
          items.push(kcif.item_list[prop]);
        }
      }
      items.sort(function(a,b){
        var result = 0;
        if (kcif.sort_items.startsWith("no")) {
          result = a.api_id - b.api_id;
        }
        else if (kcif.sort_items.startsWith("type")) {
          result = a.type[2] - b.type[2];
        }
        else if (kcif.sort_items.startsWith("name")) {
          result = a.sort_no - b.sort_no;
        }
        else if (kcif.sort_items.startsWith("level")) {
          result = a.level - b.level;
        }
        else if (kcif.sort_items.startsWith("holder")) {
          if (a.ship_id == null || a.ship_id < 0) {
            if (b.ship_id == null || b.ship_id < 0) {
              result = 0;
            }
            else {
              result = 1;
            }
          }
          else if (b.ship_id == null || b.ship_id < 0) {
            result = -1;
          }
          else {
            result = compareShip(kcif.ship_list[a.ship_id], kcif.ship_list[b.ship_id]);
          }
        }

        if (kcif.sort_items.endsWith("-")) {
          result = -result;
        }
        if (result == 0 && kcif.sort_items.startsWith("holder") && a.ship_id > 0) {
          var slot = kcif.ship_list[a.ship_id].slot;
          result = slot.indexOf(a.api_id) - slot.indexOf(b.api_id);
        }
        if (result == 0) {
          result = a.sort_no - b.sort_no;
        }
        if (result == 0) {
          result = a.api_id - b.api_id;
        }
        return result;
      });

      for (var i = 0, item; item = items[i]; i++) {
        html += '<tr><td class="item-no">' + (i + 1) + '</td>';
        html += '<td class="item-type">' + item.type_name + '</td>';
        html += '<td class="item-name">' + item.name + '</td>';
        html += '<td class="item-level">' + item.level + '</td>';
        var ship = item.ship_id != null ? kcif.ship_list[item.ship_id] : null;
        html += shipName(ship);
        html += shipLevel(ship);
      }

      html += '</tbody>';
      html += '</table></div></div>';
      itemstab.innerHTML = html;
      itemstab.querySelector("div.table-inner").scrollTop = pos;

      // アイテム:ヘッダ行リンク
      var elems = itemstab.querySelectorAll("th a");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", function(evt){
          evt.preventDefault();
          var parentClass = this.parentNode.className;
          var sort = parentClass.replace(/ .*/, "").replace(/^.*-/, "");
          log("sort (items) [" + kcif.sort_items + "] -> [" + sort + "]");
          if (parentClass == "ship-name") {
            sort = "holder";
          }
          if (kcif.sort_items.startsWith(sort)) {
            kcif.sort_items = sort + (kcif.sort_items.endsWith("+") ? "-" : "+");
          }
          else {
            kcif.sort_items = sort + (sort == "no" || sort == "level" ? "-" : "+");
          }
          kcif.renderInfo(true);
        }, false);
      }
    }
  }
};

window.addEventListener("load", kcif.init, false);
window.addEventListener("unload", kcif.destroy, false);
document.addEventListener("DOMContentLoaded", kcif.onLoad, true);
