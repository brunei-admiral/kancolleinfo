// derived from http://vcraft.jp/soft/kancolle.html 0.2 by c.mos
//
// original code: https://github.com/kageroh/cond_checker
// references:
//  http://d.hatena.ne.jp/teramako/20120215/p1
//  http://www.softwareishard.com/blog/firebug/nsitraceablechannel-intercept-http-traffic/
//  http://fartersoft.com/blog/2011/03/07/using-localstorage-in-firefox-extensions-for-persistent-data-storage/

function log() {
  Services.console.logStringMessage("[kcex]: " + Array.join(arguments, " "));
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

function captureAndSave() {
  log("captureAndSave start");
  var png = capture(kcex.flash, kcex.game_frame, 1.0);

  var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch).getBranch("extensions.kancolleEx.");
  var dir = prefs.getCharPref("capture.directory") || Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("TmpD", Ci.nsIFile).path;
  var s = new Date().toLocaleFormat("%Y%m%d%H%M%S");
  var filename = dir + "\\kancolle-" + s + ".png";
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
  return "<b>" + (ship.name || "(" + ship.ship_id + ")") + "</b>(" + (ship.level || 1) + ")";
}

function map2str(map) {
  return map.api_maparea_id + "-" + map.api_mapinfo_no + "-" + map.api_no;
}

function kouku_damage(deck, kouku)
{
  if (kouku) {
    var damage_list = kouku.api_fdam;
    var id_list = deck.api_ship;
    for (var i = 0, id; (id = id_list[i]) && id != -1; i++) {
      if (damage_list[i + 1] >= 0 && (kouku.api_frai_flag[i + 1] > 0 || kouku.api_fbak_flag[i + 1] > 0)) {
        var damage = Math.floor(damage_list[i + 1]);
        log("    ship " + (i + 1) + "(" + String(id) + ") damaged " + damage);
        var ship = kcex.ship_list[String(id)];
        ship.nowhp -= damage;
      }
    }
  }
}

function raigeki_damage(deck, raigeki)
{
  var damage_list = raigeki.api_fdam;
  var id_list = deck.api_ship;
  for (var i = 0, id; (id = id_list[i]) && id != -1; i++) {
    if (damage_list[i + 1] >= 0 && raigeki.api_erai.indexOf(i + 1) != -1) {
      var damage = Math.floor(damage_list[i + 1]);
      log("    ship " + (i + 1) + "(" + String(id) + ") damaged " + damage);
      var ship = kcex.ship_list[String(id)];
      ship.nowhp -= damage;
    }
  }
}

function hougeki_damage(deck, hougeki)
{
  for (var i = 1, t_list; t_list = hougeki.api_df_list[i]; i++) {
    for (var j = 0, target; target = t_list[j]; j++) {
      if (target >= 1 && target <= 6) {
        var damage = Math.floor(hougeki.api_damage[i][j]);
        var id = deck.api_ship[target - 1];
        log("    ship " + target + "(" + String(id) + ") damaged " + damage);
        var ship = kcex.ship_list[String(id)];
        ship.nowhp -= damage;
      }
    }
  }
}

function damage(url, json) {
  try {
    var deck_id = json.api_data.api_dock_id || json.api_data.api_deck_id;
    if (url.indexOf("combined") != -1 && url.indexOf("midnight") != -1) {
      // if it's combined fleet and midnight battle, it must be 2nd fleet.
      deck_id = 2;
    }
    for (var i = 0, deck; deck = kcex.deck_list[i]; i++) {
      if (deck.api_id == deck_id) {
        if (json.api_data.api_kouku) {
          log("  kouku");
          kouku_damage(deck, json.api_data.api_kouku.api_stage3);
          if (url.indexOf("combined") != -1 && json.api_data.api_kouku.api_stage3_combined) {
            // must be 2nd fleet
            log("  kouku (2nd)");
            kouku_damage(kcex.deck_list[1], json.api_data.api_kouku.api_stage3_combined);
          }
        }
        if (json.api_data.api_kouku2) { // combined air battle
          log("  kouku2");
          kouku_damage(deck, json.api_data.api_kouku2.api_stage3);
          if (url.indexOf("combined") != -1 && json.api_data.api_kouku2.api_stage3_combined) {
            // must be 2nd fleet
            log("  kouku2 (2nd)");
            kouku_damage(kcex.deck_list[1], json.api_data.api_kouku2.api_stage3_combined);
          }
        }
        if (json.api_data.api_opening_atack) {
          log("  opening");
          if (url.indexOf("combined") != -1) {
            // must be 2nd fleet
            raigeki_damage(kcex.deck_list[1], json.api_data.api_opening_atack);
          }
          else {
            raigeki_damage(deck, json.api_data.api_opening_atack);
          }
        }
        if (json.api_data.api_hougeki) { // midnight battle
          log("  hougeki (midnight)");
          hougeki_damage(deck, json.api_data.api_hougeki);
        }
        if (json.api_data.api_hougeki1) {
          log("  hougeki1");
          if (url.indexOf("combined") != -1) {
            // must be 2nd fleet
            hougeki_damage(kcex.deck_list[1], json.api_data.api_hougeki1);
          }
          else {
            hougeki_damage(deck, json.api_data.api_hougeki1);
          }
        }
        if (json.api_data.api_hougeki2) {
          log("  hougeki2");
          hougeki_damage(deck, json.api_data.api_hougeki2);
        }
        if (json.api_data.api_raigeki) {
          log("  raigeki");
          if (url.indexOf("combined") != -1) {
            // must be 2nd fleet
            raigeki_damage(kcex.deck_list[1], json.api_data.api_raigeki);
          }
          else {
            raigeki_damage(deck, json.api_data.api_raigeki);
          }
        }
        if (json.api_data.api_hougeki3) { // combined battle
          log("  hougeki3");
          hougeki_damage(deck, json.api_data.api_hougeki3);
        }
        break;
      }
    }
  }
  catch (exc) {
    log("  failed: " + String(exc));
  }
}

function kcexCallback(request, content, query) {
  if (kcex.timer) {
    window.clearTimeout(kcex.timer);
    kcex.timer = null;
  }

  var url = request ? request.name : "";
  var n = content ? content.indexOf("=") : -1;
  var json = n >= 0 ? JSON.parse(content.substring(n + 1)) : null;
  if (url.indexOf("/deck_port") != -1 || url.indexOf("/deck") != -1) {
    var deck_list = json.api_data;
    for (var i = 0, deck; deck = deck_list[i]; i++) {
      if (deck.api_mission[2] > 0) {
        kcex.mission[i] = deck.api_mission[2];
      }
      else if (!isNaN(Number(kcex.mission[i]))) {
        kcex.mission[i] = null;
      }
      log("deck mission: " + i + ": " + kcex.mission[i]);
    }
  } else if (url.indexOf("/kdock") != -1 || url.indexOf("/getship") != -1) {
    var dock_list = url.indexOf("/kdock") != -1 ? json.api_data : json.api_data.api_kdock;
    for (var i = 0, dock; dock = dock_list[i]; i++) {
      kcex.build[i] = dock;
      log("kdock: " + kcex.build[i].api_id + ": " + kcex.build[i].api_complete_time);
    }
    if (url.indexOf("/getship") != -1) {
      kcex.ship_num++;
      kcex.item_num += json.api_data.api_slotitem.length;
      log("getship: " + String(kcex.ship_num) + " ships, " + String(kcex.item_num) + " items");
    }
  } else if (url.indexOf("/ndock") != -1) {
    var dock_list = json.api_data;
    for (var i = 0, dock; dock = dock_list[i]; i++) {
      kcex.repair[i] = dock;
      log("ndock: " + kcex.repair[i].api_id + ": " + kcex.repair[i].api_complete_time);
    }
  } else if (url.indexOf("/destroyship") != -1) {
    kcex.ship_num--;
    kcex.item_num -= kcex.ship_list[String(query.api_ship_id)].slot.filter(function(e){return e >= 0;}).length;
    log("destroyship: " + String(kcex.ship_num) + " ships, " + String(kcex.item_num) + " items");
  } else if (url.indexOf("/createitem") != -1) {
    if (json.api_data.api_create_flag > 0) {
      kcex.item_num++;
    }
    log("createitem: " + String(kcex.item_num) + " items");
  } else if (url.indexOf("/destroyitem2") != -1) {
    kcex.item_num -= query.api_slotitem_ids.split(",").length;
    log("destroyitem2: " + String(kcex.item_num) + " items");
  } else if (url.indexOf("/powerup") != -1) {
    var id_list = query["api_id_items"].split(",");
    kcex.ship_num -= id_list.length;
    for (var i = 0, id; (id = id_list[i]) && i < id_list.length; i++) {
      kcex.item_num -= kcex.ship_list[String(id)].slot.filter(function(e){return e >= 0;}).length;
    }
    log("powerup: " + String(kcex.ship_num) + " ships, " + String(kcex.item_num) + " items");
  } else if (url.indexOf("/api_start2") != -1) {
    var mst_ship = json.api_data.api_mst_ship;
    var master = {};
    for (var i = 0, ship; ship = mst_ship[i]; i++) {
      master[ship.api_id] = {
        ship_id: ship.api_id,
        name: ship.api_name
      };
    }
    kcex.ship_master = master;
    kcex.putStorage("ship_master", JSON.stringify(master));
    log("ship_master parsed");
    return;
  } else if (url.indexOf("/basic") != -1) {
    kcex.ship_max = Number(json.api_data.api_max_chara);
    kcex.item_max = Number(json.api_data.api_max_slotitem) + 3;
    log("basic: ship_max=" + String(kcex.ship_max) + ", item_max=" + String(kcex.item_max));
  } else if (url.indexOf("/record") != -1) {
    kcex.ship_num = Number(json.api_data.api_ship[0]);
    kcex.ship_max = Number(json.api_data.api_ship[1]);
    kcex.item_num = Number(json.api_data.api_slotitem[0]);
    kcex.item_max = Number(json.api_data.api_slotitem[1]) + 3;
    log("record: ship=" + String(kcex.ship_num) + "/" + String(kcex.ship_max) + ", item=" + String(kcex.item_num) + "/" + String(kcex.item_max));
  } else if (url.indexOf("/slot_item") != -1) {
    kcex.item_num = json.api_data.length;
    log("slot_item: " + String(kcex.item_num) + " items");
  } else if (url.indexOf("battle") != -1) {
    log("damage: " + url);
    damage(url, json);
  } else if (url.indexOf("_map/start") != -1) {
    var deck = Number(query["api_deck_id"]);
    if (deck > 0) {
      kcex.mission[deck - 1] = "* " + map2str(json.api_data);
    }
  } else if (url.indexOf("_map/next") != -1) {
    for (var i = 0, deck; deck = kcex.mission[i]; i++) {
      if (deck && isNaN(Number(deck))) {
        kcex.mission[i] = "* " + map2str(json.api_data);
        break;
      }
    }
  } else if (url.indexOf("/ship") != -1 || url.indexOf("/port") != -1) {
    var port = url.indexOf("/port") != -1;
    var ship2 = url.indexOf("/ship2") != -1;
    var data_list = port ? json.api_data.api_ship : ship2 ? json.api_data : json.api_data.api_ship_data;
    var deck_list = port ? json.api_data.api_deck_port : ship2 ? json.api_data_deck : json.api_data.api_deck_data;
    if (port) {
      for (var i = 0, deck; deck = deck_list[i]; i++) {
        kcex.mission[i] = deck.api_mission[2];
      }

      var dock_list = json.api_data.api_ndock;
      for (var i = 0, dock; dock = dock_list[i]; i++) {
        kcex.repair[i] = dock;
      }

      kcex.ship_max = Number(json.api_data.api_basic.api_max_chara);
      kcex.item_max = Number(json.api_data.api_basic.api_max_slotitem) + 3;
    }
    kcex.deck_list = deck_list;

    var i = 0;
    for (var data; data = data_list[i]; i++) {
      var api_id = String(data.api_id);
      var ship = kcex.ship_list[api_id];
      kcex.ship_list[api_id] = {
        ship_id: data.api_ship_id,
        level: data.api_lv,
        p_cond: ship ? ship.c_cond : 49,
        c_cond: data.api_cond,
        prehp: ship ? ship.nowhp : data.api_nowhp,
        nowhp: data.api_nowhp,
        maxhp: data.api_maxhp,
        slot: data.api_slot
      };
      if (kcex.ship_master[data.api_ship_id]) {
        kcex.ship_list[api_id].name = kcex.ship_master[data.api_ship_id].name;
      }
    }
    if (port || ship2) {
      kcex.ship_num = i;
    }

    kcex.putStorage("ship_list", JSON.stringify(kcex.ship_list));
    log("etc: " + String(kcex.ship_num) + " ships (" + (port ? "port" : ship2 ? "ship2" : "ship3") + ")");
  }
  else {
    log("timer(?): " + url + " , query: " + hash2str(query));
  }

  // construct HTML
  var p = [];
  var r = []
  r.push("<b>" + kcex.timeStamp() + "</b>");
  if (kcex.ship_num) {
    var sh = String(kcex.ship_num) + "/" + String(kcex.ship_max);
    if (kcex.ship_num >= kcex.ship_max) {
      sh = "<font color='#d00'><b>" + sh + "</b></font>";
    }
    else if (kcex.ship_num >= kcex.ship_max - 4) {
      sh = "<font color='#c60'>" + sh + "</font>";
    }
    else if (kcex.ship_num >= kcex.ship_max - 8) {
      sh = "<font color='#a90'>" + sh + "</font>";
    }
    var it = String(kcex.item_num) + "/" + String(kcex.item_max);
    if (kcex.item_num >= kcex.item_max - 3) {
      it = "<font color='#d00'><b>" + it + "</b></font>";
    }
    else if (kcex.item_num >= kcex.item_max - 4 * 4 - 3) {
      it = "<font color='#c60'>" + it + "</font>";
    }
    else if (kcex.item_num >= kcex.item_max - 8 * 4 - 3) {
      it = "<font color='#a90'>" + it + "</font>";
    }
    r.push(sh + " ships, " + it + " items");
  }
  else {
    r.push("loading...");
  }
  p.push(r);

  r = []
  r.push("<b>建造</b>");
  for (var i = 0; kcex.build[i]; i++) {
    if (kcex.build[i].api_complete_time > 0 || kcex.build[i].api_state == 3) {
      var now = new Date().getTime();
      var dt;
      var s;
      if (kcex.build[i].api_complete_time > 0) {
        dt = new Date(kcex.build[i].api_complete_time);
        s = kcex.build[i].api_id + ".&nbsp;" + time2str(dt);
      }
      else {
        s = "--:--";
      }
      if (kcex.build[i].api_complete_time <= now) {
        s = "<font color='#d00'>" + s + "</font>";
      } else if (dt.getTime() - 60000 <= now) {
        s = "<font color='#c60'>" + s + "</font>";
      }
      r.push(s + " " + ship2str(kcex.ship_master[kcex.build[i].api_created_ship_id]));
    }
  }
  p.push(r);

  r = []
  r.push("<b>入渠</b>");
  for (var i = 0; kcex.repair[i]; i++) {
    if (kcex.repair[i].api_complete_time > 0) {
      var dt = new Date(kcex.repair[i].api_complete_time);
      var now = new Date().getTime();
      var s = kcex.repair[i].api_id + ".&nbsp;" + time2str(dt);
      if (dt.getTime() <= now) {
        s = "<font color='#d00'>" + s + "</font>";
      } else if (dt.getTime() - 60000 <= now) {
        s = "<font color='#c60'>" + s + "</font>";
      }
      r.push(s + " " + ship2str(kcex.ship_list[kcex.repair[i].api_ship_id]));
    }
  }
  p.push(r);

  for (var i = 0, deck; deck = kcex.deck_list[i]; i++) {
    var r = [];
    r.push("<b>" + String(i + 1) + ":" + deck.api_name + "</b>");
    var t = kcex.mission[i];
    if (t && !isNaN(Number(kcex.mission[i]))) {
      var dt = new Date(t);
      var now = new Date().getTime();
      var s = "[" + time2str(dt) + "]";
      if (dt.getTime() <= now) {
        s = "<font color='#d00'>" + s + "</font>";
      } else if (dt.getTime() - 60000 <= now) {
        s = "<font color='#c60'>" + s + "</font>";
      }
      r.push(s);
    }
    else if (t) {
      r.push("<b>" + t + "</b>");
    }
    var id_list = deck.api_ship;
    for (var j = 0, id; id = id_list[j]; j++) {
      if (id === -1) break;
      var ship = kcex.ship_list[String(id)];
      if (ship != null) {
        var s = String(j + 1) + '.&nbsp;';
        var shp = ship.nowhp + '/' + ship.maxhp +'&nbsp;';
        if (ship.nowhp <= ship.maxhp / 4) {
          shp = "<font color='#d00'><b>" + shp + "</b></font>";
        } else if (ship.nowhp <= ship.maxhp / 2) {
          shp = "<font color='#c60'>" + shp + "</font>";
        } else if (ship.nowhp <= ship.maxhp * 3 / 4) {
          shp = "<font color='#a90'>" + shp + "</font>";
        } else if (ship.nowhp >= ship.maxhp) {
          shp = "<font color='#0d0'>" + shp + "</font>";
        }
        if (ship.prehp != ship.nowhp) {
          shp = "<span style='background-color: #d8d8d8;'>" + shp + "</span>";
        }
        var scd = ship.c_cond;
        var diff = ship.c_cond - ship.p_cond;
        if (diff != 0) {
          scd += "&nbsp;(" + ((diff > 0) ? '+' : '') + diff + ")";
        }
        if (ship.c_cond < 20) {
          scd = "<font color='#d00'>" + scd + "</font>";
        } else if (ship.c_cond < 30) {
          scd = "<font color='#c60'>" + scd + "</font>";
        } else if (ship.c_cond < 40) {
          scd = "<font color='#a90'>" + scd + "</font>";
        } else if (ship.c_cond >= 50) {
          scd = "<font color='#0d0'>" + scd + "</font>";
        }
        r.push(s + shp + scd + " " + ship2str(ship));
      }
    }
    p.push(r);
  }
  kcex.render(p);

  if (kcex.timer) {
    window.clearTimeout(kcex.timer);
    kcex.timer = null;
  }
  kcex.timer = window.setTimeout(kcexCallback, 60 * 1000);
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

    kcexCallback(request, responseSource, query);
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

var kcexHttpObserver = {
  observe: function (aSubject, aTopic, aData) {
    if (aTopic !== TOPIC) return;

    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
    var path = httpChannel.URI.path;
    if (path.match(/\/kcsapi\/(api_start2|api_get_member\/(ship2|basic|record|deck|kdock|ndock|slot_item)|api_port\/port|api_req_kousyou\/(getship|destroyship|createitem|destroyitem2)|api_req_kaisou\/powerup|api_req_sortie\/battle|api_req_battle_midnight\/(battle|sp_midnight)|api_req_combined_battle\/((air)?battle|sp_midnight))$/)) {
      log("create TracingListener: " + path);
      var newListener = new TracingListener();
      aSubject.QueryInterface(Ci.nsITraceableChannel);
      newListener.originalListener = aSubject.setNewListener(newListener);
    }
  },

  QueryInterface: XPCOMUtils.generateQI(["nsIObserver"])
};

var kcex = {
  game_frame: null,
  flash: null,
  div: null,
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
    kcex.storage = dsm.getLocalStorageForPrincipal(principal, "");

    var s = kcex.getStorage("ship_master");
    if (s) {
      kcex.ship_master = JSON.parse(s);
    }
    s = kcex.getStorage("ship_list");
    if (s) {
      kcex.ship_list = JSON.parse(s);
    }

    Services.obs.addObserver(kcexHttpObserver, TOPIC, false);
  },
  
  destroy: function(event) {
    log("destroy");
    Services.obs.removeObserver(kcexHttpObserver, TOPIC);
  },
  
  putStorage: function(key, s) {
    kcex.storage.setItem(key, s);
  },

  getStorage: function(key) {
    return kcex.storage.getItem(key);
  },

  onLoad: function(event) {
    var doc = event.originalTarget;
    var url = doc.location.href;
    if (url.match(/osapi\.dmm\.com\//)) {
      log("DOMloaded:", url);
      var div = doc.createElement('div');
      div.style.whiteSpace = 'pre';
      div.style.position = 'absolute';
      div.style.top = '16px';
      div.style.left = '830px';
      div.style.textAlign = "left";
      div.style.whiteSpace = "nowrap";
      div.style.fontSize = '11px';
      div.innerHTML = kcex.timeStamp();
      doc.body.style.width = '848px';
      doc.body.appendChild(div);
      kcex.div = div;
      log("create div");
      kcex.flash = doc.getElementById("flashWrap");
    }
    else if (url.match(/\/app_id=854854\//)) {
      log("DOMloaded:", url);
      var game_frame = doc.getElementById("game_frame");
      if (game_frame) {
        game_frame.style.width = '980px';
        kcex.game_frame = game_frame;
      }

      var navi_right = doc.getElementsByClassName("navi_right")[0];
      if (navi_right) {
        navi_right.innerHTML = "<li><button id='capture'>capture</button></li>" + navi_right.innerHTML;
        var elem = navi_right.querySelectorAll("button.capture")[0];
        if (elem) {
          elem.addEventListener("click", captureAndSave, false, true);
        }
      }
    }
  },
  
  render: function(p) {
    if (kcex.div) {
      var html = "";
      for (var i = 0; i < p.length; i++) {
        html += "<p style='border-bottom:1px solid #AAA;margin:2px 0;'>"
           + p[i].join("<br>") + "</p>";
      }
      kcex.div.innerHTML = html;
    }
  },
  
  timeStamp: function() {
    var dt = new Date();
    return dt.toLocaleFormat("%H:%M");
  }
};

window.addEventListener("load", kcex.init, false);
window.addEventListener("unload", kcex.destroy, false);
document.addEventListener("DOMContentLoaded", kcex.onLoad, true);
