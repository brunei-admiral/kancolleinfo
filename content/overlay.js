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
  if (level <= kcif.getLogLevel()) {
    Services.console.logStringMessage("[kcif]: " + Array.join(args, " "));
  }
}

function log() {
  logging(5, arguments); // Debug
}

function flog() {
  Services.console.logStringMessage("[kcif DEBUG]: " + Array.join(arguments, " "));
}

function makeElement(tag, id, className, text) {
  var elem = kcif.document.createElement(tag);
  if (id) {
    elem.id = id;
  }
  if (className) {
    elem.className = className;
  }
  if (text != null) {
    elem.textContent = String(text);
  }
  return elem;
}

function makeText(text) {
  return kcif.document.createTextNode(String(text));
}

function clearChildElements(elem) {
  while (elem.lastChild) {
    elem.removeChild(elem.lastChild);
  }
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
      var postText = this.readPostTextFromRequest(request, context);
      if (postText) {
        query = this.parseQuery(String(postText));
      }
    }
    this.originalListener.onStopRequest(request, context, statusCode);
    // Get entire response
    var responseSource = this.receivedData.join("");

    kcif.main(request, responseSource, query);
  },

  QueryInterface: function(aIID) {
    if (aIID.equals(Ci.nsIStreamListener) ||
        aIID.equals(Ci.nsISupports)) {
      return this;
    }
    throw Components.results.NS_NOINTERFACE;
  },

  parseQuery: function(query) {
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
  },

  // Helper function to read post text (derived from Firebug)
  readPostTextFromRequest: function(request, context) {
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
  },
}

const TOPIC = "http-on-examine-response";

var kcifHttpObserver = {
  observe: function (aSubject, aTopic, aData) {
    if (aTopic !== TOPIC) return;

    var httpChannel = aSubject.QueryInterface(Ci.nsIHttpChannel);
    var path = httpChannel.URI.path;
    if (path.match(/\/kcsapi\/(api_start2|api_get_member\/(ship[23]|basic|record|deck|ship_deck|kdock|ndock|slot_item|material|require_info)|api_port\/port|api_req_kousyou\/(createship(_speedchange)|getship|destroyship|createitem|destroyitem2|remodel_slot)|api_req_nyukyo\/(start|speedchange)|api_req_kaisou\/(powerup|slotset(_ex)?|unsetslot_all|slot_(exchange_index|deprive))|api_req_hokyu\/charge|api_req_hensei\/(change|preset_select)|api_req_sortie\/((ld_)?air)?battle(result)?|api_req_battle_midnight\/(battle|sp_midnight)|api_req_combined_battle\/(((ld_)?air|midnight_)?battle(_water)?(result)?|sp_midnight|goback_port)|api_req_practice\/(midnight_)?battle|api_req_map\/(start|next))$/)) {
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
  ship_master: {},
  item_master: {},
  mission_master: {},
  ship_list: {},
  item_list: {},
  mission: [],
  dock: [],
  build: [],
  deck_list: [],
  ship_num: 0,
  ship_max: 0,
  item_num: 0,
  item_max: 0,
  admiral_revel: 1,
  material: [0, 0, 0, 0, 0, 0, 0, 0],
  battle_result: [[], []],
  timer: null,

  init: function(evt) {
    log("init");
    Services.obs.addObserver(kcifHttpObserver, TOPIC, false);
  },

  destroy: function(evt) {
    log("destroy");
    Services.obs.removeObserver(kcifHttpObserver, TOPIC);
    if (kcif.beep) {
      kcif.beep.pause();
    }
  },

  onLoad: function(evt) {
    var doc = evt.originalTarget;
    var url = doc.location.href;
    if (url.match(/osapi\.dmm\.com\//) && url.match(/aid=854854/)) {
      log("DOMloaded:", url);

      kcif.document = doc;
      var div = makeElement("div");
      var elem = kcif.document.querySelector("#sectionWrap");
      if (elem) {
        elem.parentNode.insertBefore(div, elem);
      }
      else {
        kcif.document.body.appendChild(div);
      }
      kcif.info_div = div;

      // スタイルシート
      var sheet = (function(){
        var style = makeElement("style");
        kcif.document.head.appendChild(style);
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
      sheet.insertRule('#kancolle-info .tab-header a:hover { color: yellow; cursor: pointer; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab { padding: 2px 8px 2px 8px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab h2 { font-size: 10pt; font-weight: normal; padding: 0; margin: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .list-header { color: skyblue; text-decoration: none; font-weight: bold; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab a.list-header:hover { color: yellow !important; dext-decoration: none !important; font-weight: bold !important; cursor: pointer; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab table { color: inherit; font-size: 10pt; padding: 0; margin: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab table tr { padding: 0; margin: 0; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab table th, #kancolle-info .tab table td { padding: 0; margin: 0; line-height: 1.2; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-outer { position: relative; padding-top: 20px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-inner { height: 256px; overflow: auto; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-outer .table-inner table thead { position: absolute; top: 0px; left: 0px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-outer .table-inner table thead th { text-align: left; font-weight: bold; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .table-outer .table-inner table thead th.th-right { text-align: right; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-no { text-align: right; padding: 0 6px 0 4px; width: 1.8em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .item-no { text-align: right; padding: 0 6px 0 4px; width: 2.4em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-type { width: 2.7em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-name { font-weight: bold; width: 8.5em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-level, #kancolle-info .tab .ship-cond { text-align: right; width: 2.7em; padding-right: 15px; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .ship-header-hp { width: 70px; }', sheet.length);
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
      sheet.insertRule('#kancolle-info .tab .item-type { width: 8.5em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .item-name { font-weight: bold; width: 15em; }', sheet.length);
      sheet.insertRule('#kancolle-info .tab .item-level, #kancolle-info .tab .item-alv { text-align: right; width: 2.2em; padding-right: 12px; }', sheet.length);
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
      kcif.flash = kcif.document.querySelector("#flashWrap");

      kcif.renderFrame();

      kcif.document.body.setAttribute("onLoad", "var setHeightRetry = 10; function setHeight(){ if (typeof ConstGadgetInfo != 'undefined') { if (ConstGadgetInfo.height != 920) { console.log('[kcif] set height ' + ConstGadgetInfo.height + ' -> 920 (' + setHeightRetry + ')'); ConstGadgetInfo.height = 920; } } else { console.log('[kcif] ConstGadgetInfo is undefined (' + setHeightRetry + ')'); } if (--setHeightRetry > 0) window.setTimeout(setHeight, 1000); } setHeight();");
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

      doc.body.setAttribute("onload", "if (typeof DMM != 'undefined' && DMM.netgame) DMM.netgame.reloadDialog = function(){}; history.pushState(null, null, null); window.addEventListener('popstate', function() { history.pushState(null, null, null); });");
    }
  },

  renderFrame: function() {
    if (kcif.area_game && parseInt(kcif.area_game.style.height) < 920) {
        kcif.area_game.style.height = '920px';
    }
    if (kcif.info_div) {
      var base = makeElement("div", "kancolle-info");

      var tabs = makeElement("div", "tab-headers");

      var tab = makeElement("div", "tab-header-main", "tab-header");
      var elem = makeElement("a", null, null, "メイン");
      elem.setAttribute("href", "#");
      tab.appendChild(elem);
      tabs.appendChild(tab);

      tab = makeElement("div", "tab-header-ships", "tab-header");
      elem = makeElement("a", null, null, "艦娘");
      elem.setAttribute("href", "#");
      tab.appendChild(elem);
      tabs.appendChild(tab);

      tab = makeElement("div", "tab-header-items", "tab-header");
      elem = makeElement("a", null, null, "装備");
      elem.setAttribute("href", "#");
      tab.appendChild(elem);
      tabs.appendChild(tab);

      tab = makeElement("div", "tab-header-config", "tab-header");
      elem = makeElement("a", null, null, "設定");
      elem.setAttribute("href", "#");
      tab.appendChild(elem);
      tabs.appendChild(tab);

      tab = makeElement("div", "base-info");
      elem = makeElement("button", "capture", null, "画面キャプチャ");
      tab.appendChild(elem);
      tabs.appendChild(tab);

      base.appendChild(tabs);

      tab = makeElement("div", "tab-main", "tab");
      elem = makeElement("span", null, "color-yelow blink", "Loading...");
      tab.appendChild(elem);
      base.appendChild(tab);

      tab = makeElement("div", "tab-ships", "tab");
      elem = makeElement("span", null, "color-yelow blink", "Loading...");
      tab.appendChild(elem);
      base.appendChild(tab);

      tab = makeElement("div", "tab-items", "tab");
      elem = makeElement("span", null, "color-yelow blink", "Loading...");
      tab.appendChild(elem);
      base.appendChild(tab);

      // 設定
      tab = makeElement("div", "tab-config", "tab");
      var inner = makeElement("div", null, "table-inner");
      var table = makeElement("table");

      var tr = makeElement("tr");
      var td = makeElement("td", null, "config-header", "画面キャプチャ");
      tr.appendChild(td);
      td = makeElement("td");
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label", "保存先");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      elem = makeElement("input", "capture-save-dir");
      elem.setAttribute("type", "text");
      elem.value = kcif.getCaptureSaveDir();
      td.appendChild(elem);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label", "ベース名");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      elem = makeElement("input", "capture-save-base");
      elem.setAttribute("type", "text");
      elem.value = kcif.getCaptureSaveBase();
      td.appendChild(elem);
      tr.appendChild(td);
      table.appendChild(tr);

      var tr = makeElement("tr");
      var td = makeElement("td", null, "config-header", "タイマーサウンド");
      tr.appendChild(td);
      td = makeElement("td");
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label", "サウンドファイルURL");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      elem = makeElement("input", "beep-url");
      elem.setAttribute("type", "text");
      elem.value = kcif.getBeepUrl();
      td.appendChild(elem);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label", "ボリューム(0～100)");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      elem = makeElement("input", "beep-volume");
      elem.setAttribute("type", "number");
      elem.setAttribute("max", "100");
      elem.setAttribute("min", "0");
      elem.value = kcif.getBeepVolume();
      td.appendChild(elem);
      elem = makeText(" ");
      td.appendChild(elem);
      elem = makeElement("button", "beep-test", null, "テスト");
      td.appendChild(elem);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      var label = makeElement("label");
      elem = makeElement("input", "beep-expedition");
      elem.setAttribute("type", "checkbox");
      elem.value = "x";
      elem.checked = kcif.getBeepExpedition();
      label.appendChild(elem);
      label.appendChild(makeText("遠征帰還時のサウンド再生を自動でONにする"));
      td.appendChild(label);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      label = makeElement("label");
      elem = makeElement("input", "beep-dock");
      elem.setAttribute("type", "checkbox");
      elem.value = "x";
      elem.checked = kcif.getBeepDock();
      label.appendChild(elem);
      label.appendChild(makeText("入渠終了時のサウンド再生を自動でONにする"));
      td.appendChild(label);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      label = makeElement("label");
      elem = makeElement("input", "beep-built");
      elem.setAttribute("type", "checkbox");
      elem.value = "x";
      elem.checked = kcif.getBeepBuilt();
      label.appendChild(elem);
      label.appendChild(makeText("建造終了時のサウンド再生を自動でONにする"));
      td.appendChild(label);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      label = makeElement("label");
      elem = makeElement("input", "beep-repair");
      elem.setAttribute("type", "checkbox");
      elem.value = "x";
      elem.checked = kcif.getBeepRepair();
      label.appendChild(elem);
      label.appendChild(makeText("泊地修理更新(予想)時のサウンド再生を自動でONにする"));
      td.appendChild(label);
      tr.appendChild(td);
      table.appendChild(tr);

      var tr = makeElement("tr");
      var td = makeElement("td", null, "config-header", "情報表示");
      tr.appendChild(td);
      td = makeElement("td");
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      label = makeElement("label");
      elem = makeElement("input", "show-battle");
      elem.setAttribute("type", "checkbox");
      elem.value = "x";
      elem.checked = kcif.getShowBattle();
      label.appendChild(elem);
      label.appendChild(makeText("戦闘結果を表示する"));
      td.appendChild(label);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      label = makeElement("label");
      elem = makeElement("input", "show-built");
      elem.setAttribute("type", "checkbox");
      elem.value = "x";
      elem.checked = kcif.getShowBuilt();
      label.appendChild(elem);
      label.appendChild(makeText("建造結果を表示する"));
      td.appendChild(label);
      tr.appendChild(td);
      table.appendChild(tr);

      var tr = makeElement("tr");
      var td = makeElement("td", null, "config-header", "情報カスタマイズ");
      tr.appendChild(td);
      td = makeElement("td");
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      label = makeElement("label");
      elem = makeElement("input", "hp-by-meter");
      elem.setAttribute("type", "checkbox");
      elem.value = "x";
      elem.checked = kcif.getHpByMeter();
      label.appendChild(elem);
      label.appendChild(makeText("耐久値をメーター表示する"));
      td.appendChild(label);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      label = makeElement("label");
      elem = makeElement("input", "fuel-by-meter");
      elem.setAttribute("type", "checkbox");
      elem.value = "x";
      elem.checked = kcif.getFuelByMeter();
      label.appendChild(elem);
      label.appendChild(makeText("燃料・弾薬をメーター表示する"));
      td.appendChild(label);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input", "索敵値算出式：");
      var select = makeElement("select", "search-formula");
      elem = makeElement("option", null, null, "総計");
      elem.value = "0";
      select.appendChild(elem);
      elem = makeElement("option", null, null, "旧2-5式");
      elem.value = "1";
      select.appendChild(elem);
      elem = makeElement("option", null, null, "2-5秋式");
      elem.value = "2";
      select.appendChild(elem);
      elem = makeElement("option", null, null, "秋簡易式");
      elem.value = "3";
      select.appendChild(elem);
      elem = makeElement("option", null, null, "判定式(33)");
      elem.value = "4";
      select.appendChild(elem);
      select.selectedIndex = kcif.getSearchFormula();
      td.appendChild(select);
      tr.appendChild(td);
      table.appendChild(tr);

      tr = makeElement("tr");
      td = makeElement("td", null, "config-label");
      tr.appendChild(td);
      td = makeElement("td", null, "config-input");
      label = makeElement("label");
      elem = makeElement("input", "aircover-alv");
      elem.setAttribute("type", "checkbox");
      elem.value = "x";
      elem.checked = kcif.getAircoverAlv();
      label.appendChild(elem);
      label.appendChild(makeText("制空値に艦載機熟練度を加算する"));
      td.appendChild(label);
      tr.appendChild(td);
      table.appendChild(tr);

      inner.appendChild(table);
      tab.appendChild(inner);

      var div = makeElement("div", null, "config-buttons");
      var button = makeElement("button", "config-save", null, "保存");
      div.appendChild(button);
      button = makeElement("button", "config-reset", null, "クリア");
      div.appendChild(button);
      tab.appendChild(div);

      base.appendChild(tab);

      kcif.info_div.appendChild(base);

      // キャプチャボタン
      var elem = kcif.info_div.querySelector("#capture");
      if (elem) {
        elem.addEventListener("click", kcif.captureAndSave, false);
        document.addEventListener("keypress", function(evt){
          var url = content.document.URL;
          if (url.match(/\/app_id=854854\//) &&
              evt.keyCode == 113) { // F2
            kcif.captureAndSave(evt);
          }
        }, false);
      }

      // タブ
      var elems = kcif.info_div.querySelectorAll(".tab-header a");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", kcif.selectTab, false);
      }
      var elem = kcif.info_div.querySelector("#" + kcif.current_tab.replace("-", "-header-") + " a");
      if (elem) {
        elem.click();
      }

      // 設定:テキスト
      var elems = kcif.info_div.querySelectorAll("#tab-config input[type=text], #tab-config input[type=number]");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("input", function() {
          kcif.info_div.querySelector("#config-save").disabled = !kcif.checkConfigChanged();
          kcif.info_div.querySelector("#config-reset").disabled = !kcif.checkConfigChanged();
        }, false);
      }

      // 設定:チェックボックス
      var elems = kcif.info_div.querySelectorAll("#tab-config input[type=checkbox]");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", function() {
          kcif.info_div.querySelector("#config-save").disabled = !kcif.checkConfigChanged();
          kcif.info_div.querySelector("#config-reset").disabled = !kcif.checkConfigChanged();
        }, false);
      }

      // 設定:リストボックス
      var elems = kcif.info_div.querySelectorAll("#tab-config select");
      for (var i = 0; i < elems.length; i++) {
        elems[i].addEventListener("change", function() {
          kcif.info_div.querySelector("#config-save").disabled = !kcif.checkConfigChanged();
          kcif.info_div.querySelector("#config-reset").disabled = !kcif.checkConfigChanged();
        }, false);
      }

      // 設定:保存
      var elem = kcif.info_div.querySelector("#config-save");
      if (elem) {
        elem.addEventListener("click", kcif.saveConfig, false);
        elem.disabled = true;
      }

      // 設定:クリア
      var elem = kcif.info_div.querySelector("#config-reset");
      if (elem) {
        elem.addEventListener("click", kcif.resetConfig, false);
        elem.disabled = true;
      }

      // 設定:タイマーサウンドテスト
      var elem = kcif.info_div.querySelector("#beep-test");
      if (elem) {
        var beeptest = null;
        elem.addEventListener("click", function(evt) {
          if (evt) evt.preventDefault();
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
        }, false);
      }

      // タイマーサウンド設定
      if (kcif.beep) {
        kcif.beep.pause();
        kcif.beep = null;
      }
      kcif.beep = new Audio(kcif.getBeepUrl());
      if (kcif.beep) {
        kcif.beep.loop = true;
        kcif.beep.volume = kcif.getBeepVolume() / 100.0;
        kcif.beep.load();
      }
    }
  },

  renderInfo: function(all) {
    if (kcif.info_div) {
      // ベース
      var base = kcif.info_div.querySelector("#base-info");
      clearChildElements(base);
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
      var elem = makeElement("span", null, ship_col, kcif.ship_num);
      base.appendChild(elem);
      elem = makeText("/" + kcif.ship_max + " ships; ");
      base.appendChild(elem);
      elem = makeElement("span", null, item_col, kcif.item_num);
      base.appendChild(elem);
      elem = makeText("/" + kcif.item_max + " items ");
      base.appendChild(elem);
      elem = makeElement("span", "updated", null, (new Date()).toLocaleFormat("%H:%M") + "更新");
      base.appendChild(elem);
      elem = makeText(" ");
      base.appendChild(elem);
      elem = makeElement("button", "capture", null, "画面キャプチャ");
      base.appendChild(elem);

      // ベース:キャプチャボタン
      var elem = base.querySelector("#capture");
      if (elem) {
        elem.addEventListener("click", kcif.captureAndSave, false);
      }

      // メイン
      kcif.renderMain();

      if (!all) {
        return;
      }

      // 艦娘
      kcif.renderShips();

      // アイテム
      kcif.renderItems();
    }
  },

  renderMain: function() {
    var maintab = kcif.info_div.querySelector("#tab-main");
    var checks = kcif.saveCheckboxes(maintab);
    clearChildElements(maintab);
    var html = "";

    // 資源
    var div = makeElement("div", "resource");
    var h2 = makeElement("h2");
    var elem = makeElement("span", null, "list-header", "資源等");
    h2.appendChild(elem);
    div.appendChild(h2);
    var table = makeElement("table");
    table.appendChild(kcif.formatMaterial("燃料", kcif.material[0], kcif.admiral_level));
    table.appendChild(kcif.formatMaterial("弾薬", kcif.material[1], kcif.admiral_level));
    table.appendChild(kcif.formatMaterial("鋼材", kcif.material[2], kcif.admiral_level));
    table.appendChild(kcif.formatMaterial("ボーキサイト", kcif.material[3], kcif.admiral_level));
    var tr = makeElement("tr");
    var td = makeElement("th", null, "res-name", "\u00a0");
    tr.appendChild(td);
    td = makeElement("td", null, "res-value", "\u00a0");
    tr.appendChild(td);
    table.appendChild(tr);
    table.appendChild(kcif.formatMaterial("高速修復材", kcif.material[5]));
    table.appendChild(kcif.formatMaterial("開発資材", kcif.material[6]));
    table.appendChild(kcif.formatMaterial("高速建造材", kcif.material[4]));
    table.appendChild(kcif.formatMaterial("改修資材", kcif.material[7]));
    div.appendChild(table);
    maintab.appendChild(div);

    // 艦隊
    for (var i = 0; i < 4; i++) {
      var deck = kcif.deck_list[i];
      div = makeElement("div", "fleet" + (i + 1), "fleet");
      h2 = makeElement("h2");
      table = makeElement("table");
      var col = "color-default";
      var mission = kcif.mission[i];
      var s = null;
      if (kcif.isOnMission(mission)) {
        var dt = new Date(mission[3]);
        elem = makeElement("span", null, null, "遠征中");
        elem.setAttribute("title", mission[2]);
        s = [elem, makeText(" ")];
        elem = makeElement("label", null, null, kcif.time2str(dt));
        var input = makeElement("input", "check-fleet" + (i + 1), "check-timer check-expedition");
        input.setAttribute("type", "checkbox");
        input.value = "x";
        elem.appendChild(input);
        s.push(elem);
        col = kcif.getTimeColor(dt);
      }
      else if (mission) {
        if (kcif.isCombined(mission) || kcif.isOnPractice(mission) || kcif.getShowBattle()) {
          s = [makeText(mission[0])];
        }
        else {
          s = [makeText("出撃中")];
        }
        if (kcif.getShowBattle() && mission.length > 1) {
          s = s.concat(mission.slice(1));
        }
        col = "color-green";
      }

      if (deck || i == 0) {
        elem = makeElement("a", null, "list-header", '第' + (i + 1) + '艦隊');
        elem.setAttribute("title", (deck ? deck.api_name : ""));
        h2.appendChild(elem);

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
        var seiku_alv = 0;
        var sakuteki = 0;
        var sakuteki0 = 0;
        var sakuteki1 = 0;
        var sakuteki1i = 0;
        var sakuteki2 = 0;
        var sakuteki3 = 0;
        var ndock = [];
        var damage = [];
        for (var j = 0; j < 6; j++) {
          tr = makeElement("tr");
          var id = deck ? deck.api_ship[j] : -1
          if (id === -1 || id == null) {
            td = makeElement("td", null, "ship-no", j + 1);
            tr.appendChild(td);
            td = makeElement("td");
            td.setAttribute("colspan", "9");
            tr.appendChild(td);
            table.appendChild(tr);
          }

          var ship = kcif.ship_list[id];
          if (ship != null) {
            ships.push(ship);
            var kit = null;
            var slots = ship.slot.concat(ship.slot_ex);
            for (var k = 0; k < slots.length; k++) {
              if (slots[k] < 0) {
                continue;
              }
              var item = kcif.item_list[slots[k]];
              if (item && item.type[2] == 23) { // 応急修理要員・女神
                kit = item.name;
                break;
              }
            }
            if (kit) {
              td = makeElement("td", null, "ship-no color-red", j + 1);
              td.setAttribute("title", kit);
            }
            else {
              td = makeElement("td", null, "ship-no", j + 1);
            }
            tr.appendChild(td);
            tr.appendChild(kcif.shipType(ship));
            tr.appendChild(kcif.shipName(ship));
            tr.appendChild(kcif.shipLevel(ship));
            tr.appendChild(kcif.shipHp(ship));
            tr.appendChild(kcif.shipCond(ship));
            tr.appendChild(kcif.shipFuel(ship));
            if (!kcif.getFuelByMeter()) {
              tr.appendChild(kcif.shipBull(ship));
            }
            tr.appendChild(kcif.shipExp(ship));
            if (kcif.isInDock(ship)) {
              td = makeElement("td", null, "ship-desc color-red", "入渠中");
              ndock.push(ship.name);
            }
            else {
              td = makeElement("td", null, "ship-desc");
            }
            tr.appendChild(td);
            table.appendChild(tr);

            if (mission && !kcif.isOnMission(mission)) {
              if (!ship.taihi && ship.hp <= ship.hp_max / 4) {
                col = "color-red";
              }
              else if (!ship.taihi && ship.hp <= ship.hp_max / 2 && col != "color-red") {
                col = "color-orange";
              }
            }
            damage[j] = (ship.hp_max - ship.hp) / ship.hp_max;

            level_sum += ship.level;
            if (ship.fuel < ship.fuel_max || ship.bull < ship.bull_max) {
              sup.push(ship.name);
              var col1 = kcif.fuelBullColor(ship.fuel, ship.fuel_max);
              var col2 = kcif.fuelBullColor(ship.bull, ship.bull_max);
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
            if (!ship.taihi) {
              var drum_p = false;
              var dai_p = false;
              var s_base = ship.sakuteki;
              var s_sakuteki = 0;
              var s_sakuteki1 = 0;
              var s_sakuteki2 = 0;
              var s_sakuteki3 = 0;
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
                  else if (item.item_id == 68 || item.item_id == 166) { // 大発動艇
                    dai++;
                    dai_p = true;
                  }
                  else if (kcif.hasSeiku(item.type[2]) && ship.equip[k] > 0) {
                    seiku += Math.floor(item.taiku * Math.sqrt(ship.equip[k]));
                    if (kcif.getAircoverAlv()) {
                      if (item.type[2] == 6 || item.type[2] == 45) { // 艦戦
                        seiku_alv += [0, 0, 2, 5, 9, 14, 14, 22][item.alv];
                      }
                      else if (item.type[2] == 11) { // 水爆
                        seiku_alv += [0, 0, 0, 1, 2, 4, 5, 6][item.alv];
                      }
                      seiku_alv += [0, 1, 2, 2, 2, 2, 2, 3][item.alv];
                    }
                  }
                  s_base -= item.sakuteki;
                  s_sakuteki += kcif.calcSakuteki(item, 3);
                  s_sakuteki1 += kcif.calcSakuteki(item, 1);
                  s_sakuteki2 += kcif.calcSakuteki(item, 2);
                  s_sakuteki3 += kcif.calcSakuteki(item, 4);
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
              s_sakuteki3 += Math.sqrt(s_base);
              sakuteki += Math.floor(s_sakuteki);
              sakuteki0 += ship.sakuteki;
              sakuteki1 += s_base;
              sakuteki1i += s_sakuteki1;
              sakuteki2 += s_sakuteki2;
              sakuteki3 += s_sakuteki3;
            }
          }
        }
        sakuteki -= Math.floor(0.4 * kcif.admiral_level);
        sakuteki1 = Math.floor(Math.sqrt(sakuteki1)) + sakuteki1i;
        sakuteki2 -= Math.ceil((kcif.admiral_level) / 5) * 5.0 * 0.6142467;
        sakuteki3 -= Math.ceil(0.4 * kcif.admiral_level);
        sakuteki3 += 2 * (6 - ships.length);

        if (s) {
          elem = makeElement("span", null, col, "[");
          for (var j = 0; j < s.length; j++) {
            elem.appendChild(s[j]);
          }
          elem.appendChild(makeText("]"));
          s = [makeText(" "), elem];
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
              if (damage[j] && damage[j] < 0.5 && !kcif.isInDock(ships[j])) {
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
            elem = makeElement("span", null, rcol, "[修理中 ");
            elem.setAttribute("title", num + "隻修理可能");
            var label = makeElement("label", null, null, "更新" + kcif.time2str(new Date(rt)));
            var input = makeElement("input", "check-fleet" + (i + 1), "check-timer check-repair");
            input.setAttribute("type", "checkbox");
            input.value = "x";
            label.appendChild(input);
            elem.appendChild(label);
            elem.appendChild(makeText(" "));
            s = [makeText(" "), elem];
          }
          else {
            s = [];
          }
          if (sup.length > 0) {
            elem = makeElement("span", null, sup_col + " blink", "未補給");
            elem.setAttribute("title", sup.join(", "));
            s.push(makeText(" "), elem);
          }
          if (ndock.length > 0) {
            elem = makeElement("span", null, "color-red", "入渠中");
            elem.setAttribute("title", ndock.join(", "));
            s.push(makeText(" "), elem);
          }
        }

        if (ships.length > 0) {
          elem = makeElement("span", null, "color-gray", "LV:" + ships[0].level + "/" + level_sum);
          elem.setAttribute("title", "旗艦 " + ships[0].name);
          s.push(makeText(" "), elem);

          elem = makeElement("span", null, "color-gray", "制空:" + (seiku + seiku_alv));
          elem.setAttribute("title", kcif.seiku2str(seiku, seiku_alv));
          s.push(makeText(" "), elem);

          var ss;
          var formula = kcif.getSearchFormula();
          if (formula == 0) {
            ss = sakuteki0;
          }
          else if (formula == 1) {
            ss = Math.floor(sakuteki1);
          }
          else if (formula == 2) {
            ss = sakuteki2.toFixed(1);
          }
          else if (formula == 3) {
            ss = sakuteki;
          }
          else {
            ss = sakuteki3.toFixed(2);
          }
          elem = makeElement("span", null, "color-gray", "索敵:" + ss);
          ss = "";
          if (formula != 0) {
            ss += '総計:' + sakuteki0 + "\u000a";
          }
          if (formula != 1) {
            ss += '旧2-5式:' + Math.floor(sakuteki1) + "\u000a";
          }
          if (formula != 2) {
            ss += '2-5秋式:' + sakuteki2.toFixed(1) + "\u000a";
          }
          if (formula != 3) {
            ss += '秋簡易式:' + sakuteki + "\u000a";
          }
          if (formula != 4) {
            ss += '判定式(33):' + sakuteki3.toFixed(2) + "\u000a";
          }
          elem.setAttribute("title", ss);
          s.push(makeText(" "), elem);

          elem = makeElement("span", null, "color-gray", "キラ:" + kira.length + '/' + ships.length);
          elem.setAttribute("title", kira.join(', '));
          s.push(makeText(" "), elem);

          if (drum > 0) {
            elem = makeElement("span", null, "color-gray", "ドラム:" + drum + '/' + drum_ship.length);
            elem.setAttribute("title", drum_ship.join(', '));
            s.push(makeText(" "), elem);
          }

          if (dai > 0) {
            elem = makeElement("span", null, "color-gray", "大発:" + dai);
            elem.setAttribute("title", dai_ship.join(', '));
            s.push(makeText(" "), elem);
          }
        }

        for (var j = 0; j < s.length; j++) {
          h2.appendChild(s[j]);
        }
      }
      else {
        elem = makeElement("span", null, "list-header", '第' + (i + 1) + '艦隊');
        h2.appendChild(elem);
        h2.appendChild(makeText(" "));
        elem = makeElement("span", null, "color-gray", "[未開放]");
        h2.appendChild(elem);
      }

      div.appendChild(h2);
      div.appendChild(table);
      maintab.appendChild(div);
    }

    // 入渠
    div = makeElement("div", "ndock");
    h2 = makeElement("h2");
    elem = makeElement("span", null, "list-header", "入渠");
    h2.appendChild(elem);
    div.appendChild(h2);
    table = makeElement("table");
    for (var i = 0; kcif.dock[i]; i++) {
      tr = makeElement("tr");
      if (kcif.dock[i].api_complete_time > 0) {
        td = makeElement("td", null, "ship-no", kcif.dock[i].api_id);
        tr.appendChild(td);
        var ship = kcif.ship_list[kcif.dock[i].api_ship_id];
        tr.appendChild(kcif.shipType(ship));
        tr.appendChild(kcif.shipName(ship));
        tr.appendChild(kcif.shipLevel(ship));
        tr.appendChild(kcif.shipHp(ship));
        tr.appendChild(kcif.shipCond(ship));
        var dt = new Date(kcif.dock[i].api_complete_time);
        td = makeElement("td", null, "ship-at " + kcif.getTimeColor(dt));
        elem = makeElement("label", null, null, kcif.time2str(dt));
        var input = makeElement("input", "check-dock" + kcif.dock[i].api_id, "check-timer check-dock");
        input.setAttribute("type", "checkbox");
        input.value = "x";
        elem.appendChild(input);
        td.appendChild(elem);
        tr.appendChild(td);
      }
      else {
        td = makeElement("td", null, "ship-no", kcif.dock[i].api_id);
        tr.appendChild(td);
        td = makeElement("td");
        td.setAttribute("colspan", "6");
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    div.appendChild(table);
    maintab.appendChild(div);

    // 建造
    div = makeElement("div", "kdock");
    h2 = makeElement("h2");
    elem = makeElement("span", null, "list-header", "建造");
    h2.appendChild(elem);
    div.appendChild(h2);
    table = makeElement("table");
    for (var i = 0; kcif.build[i]; i++) {
      tr = makeElement("tr");
      if (kcif.build[i].api_complete_time > 0 || kcif.build[i].api_state == 3) {
        td = makeElement("td", null, "ship-no", kcif.build[i].api_id);
        tr.appendChild(td);
        var ship = kcif.ship_master[kcif.build[i].api_created_ship_id];
        if (kcif.getShowBuilt()) {
          tr.appendChild(kcif.shipType(ship));
          tr.appendChild(kcif.shipName(ship));
        }
        else {
          td = makeElement("td", null, "ship-type", "???");
          tr.appendChild(td);
          td = makeElement("td", null, "ship-name", "???");
          tr.appendChild(td);
        }
        var col;
        var s;
        if (kcif.build[i].api_complete_time > 0) {
          var dt = new Date(kcif.build[i].api_complete_time);
          s = kcif.time2str(dt);
          col = kcif.getTimeColor(dt, true);
        }
        else {
          s = "--:--";
          col = "color-red";
        }
        td = makeElement("td", null, "ship-at " + col);
        elem = makeElement("label", null, null, s);
        var input = makeElement("input", "check-built" + kcif.build[i].api_id, "check-timer check-built");
        input.setAttribute("type", "checkbox");
        input.value = "x";
        elem.appendChild(input);
        td.appendChild(elem);
        tr.appendChild(td);
      }
      else {
        td = makeElement("td", null, "ship-no", kcif.build[i].api_id);
        tr.appendChild(td);
        td = makeElement("td");
        td.setAttribute("colspan", "4");
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    div.appendChild(table);
    maintab.appendChild(div);

    // メイン:艦隊
    elems = maintab.querySelectorAll(".fleet h2 a");
    for (var i = 0; i < elems.length; i++) {
      elems[i].addEventListener("click", kcif.selectFleet, false);
    }
    var elem = maintab.querySelector("#" + kcif.current_fleet + " h2 a");
    if (elem) {
      elem.click();
    }

    // メイン:タイマーチェックボックス
    elems = maintab.querySelectorAll("input.check-timer");
    for (var i = 0; i < elems.length; i++) {
      elems[i].addEventListener("click", kcif.beepOnOff, false);
    }

    // メイン:チェックボックス復元
    kcif.restoreCheckboxes(maintab, checks);
    kcif.beepOnOff();
  },

  renderShips: function() {
    var shipstab = kcif.info_div.querySelector("#tab-ships");
    var inner = shipstab.querySelector("div.table-inner");
    var pos = inner ? inner.scrollTop : 0;
    clearChildElements(shipstab);
    var outer = makeElement("div", null, "table-outer");
    inner = makeElement("div", null, "table-inner");
    var table = makeElement("table");

    // ヘッダ行
    var thead = makeElement("thead");
    var tr = makeElement("tr");

    var td = makeElement("th", null, "ship-no th-right");
    var elem = makeElement("a", null, "list-header" + (kcif.sort_ships.startsWith("no") ? ' sort-current' : ''), "#");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "ship-type");
    elem = makeElement("a", null, "list-header" + (kcif.sort_ships.startsWith("type") ? ' sort-current' : ''), "艦種");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "ship-name");
    elem = makeElement("a", null, "list-header" + (kcif.sort_ships.startsWith("name") ? ' sort-current' : ''), "艦名");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "ship-level th-right");
    elem = makeElement("a", null, "list-header" + (kcif.sort_ships.startsWith("level") ? ' sort-current' : ''), "LV");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "ship-header-hp" + (kcif.getHpByMeter() ? '' : ' th-right'));
    elem = makeElement("a", null, "list-header" + (kcif.sort_ships.startsWith("hp") ? ' sort-current' : ''), "耐久");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "ship-cond th-right");
    elem = makeElement("a", null, "list-header" + (kcif.sort_ships.startsWith("cond") ? ' sort-current' : ''), "疲労");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    if (kcif.getFuelByMeter()) {
      td = makeElement("th", null, "ship-fuel-bull-header", "燃料弾薬");
      tr.appendChild(td);
    }
    else {
      td = makeElement("th", null, "ship-fuel th-right", "燃料");
      tr.appendChild(td);

      td = makeElement("th", null, "ship-bull th-right", "弾薬");
      tr.appendChild(td);
    }

    td = makeElement("th", null, "ship-exp th-right", "経験値");
    tr.appendChild(td);

    td = makeElement("th", null, "ship-desc", "所在");
    tr.appendChild(td);

    thead.appendChild(tr);
    table.appendChild(thead);

    // データ
    var tbody = makeElement("tbody");
    var ships = [];
    for (var prop in kcif.ship_list) {
      if (kcif.ship_list[prop].type) {
        ships.push(kcif.ship_list[prop]);
      }
    }
    ships.sort(kcif.compareShip);

    for (var i = 0, ship; ship = ships[i]; i++) {
      tr = makeElement("tr");
      td = makeElement("td", null, "ship-no", i + 1);
      tr.appendChild(td);
      tr.appendChild(kcif.shipType(ship));
      tr.appendChild(kcif.shipName(ship));
      tr.appendChild(kcif.shipLevel(ship));
      tr.appendChild(kcif.shipHp(ship));
      tr.appendChild(kcif.shipCond(ship));
      tr.appendChild(kcif.shipFuel(ship));
      if (!kcif.getFuelByMeter()) {
        tr.appendChild(kcif.shipBull(ship));
      }
      tr.appendChild(kcif.shipExp(ship));
      var fleet = null;
      for (var j = 0, deck; deck = kcif.deck_list[j]; j++) {
        if (deck.api_ship.filter(function(e){ return e == ship.api_id; }).length != 0) {
          fleet = j + 1;
          break;
        }
      }
      if (fleet) {
        td = makeElement("td", null, "ship-desc", "第" + fleet + "艦隊");
        var elem = makeElement("span", null, "color-gray", "「" + kcif.deck_list[fleet - 1].api_name + "」");
        td.appendChild(elem);
      }
      else if (kcif.isInDock(ship)) {
        td = makeElement("td", null, "ship-desc color-red", "入渠中");
      }
      else {
        td = makeElement("td", null, "ship-desc");
      }
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    inner.appendChild(table);
    outer.appendChild(inner);
    shipstab.appendChild(outer);
    inner.scrollTop = pos;

    // 艦娘:ヘッダ行リンク
    var elems = shipstab.querySelectorAll("th a");
    for (var i = 0; i < elems.length; i++) {
      elems[i].addEventListener("click", function(evt){
        if (evt) evt.preventDefault();
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
  },

  renderItems: function() {
    var itemstab = kcif.info_div.querySelector("#tab-items");
    var inner = itemstab.querySelector("div.table-inner");
    pos = inner ? inner.scrollTop : 0;
    clearChildElements(itemstab);
    var outer = makeElement("div", null, "table-outer");
    inner = makeElement("div", null, "table-inner");
    var table = makeElement("table");

    // ヘッダ行
    var thead = makeElement("thead");
    var tr = makeElement("tr");

    var td = makeElement("th", null, "item-no th-right");
    var elem = makeElement("a", null, "list-header" + (kcif.sort_items.startsWith("no") ? ' sort-current' : ''), "#");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "item-type");
    elem = makeElement("a", null, "list-header" + (kcif.sort_items.startsWith("type") ? ' sort-current' : ''), "種別");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "item-name");
    elem = makeElement("a", null, "list-header" + (kcif.sort_items.startsWith("name") ? ' sort-current' : ''), "名称");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "item-level th-right");
    elem = makeElement("a", null, "list-header" + (kcif.sort_items.startsWith("level") ? ' sort-current' : ''), "改修");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "item-alv th-right");
    elem = makeElement("a", null, "list-header" + (kcif.sort_items.startsWith("alv") ? ' sort-current' : ''), "熟練");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "ship-name");
    elem = makeElement("a", null, "list-header" + (kcif.sort_items.startsWith("holder") ? ' sort-current' : ''), "所在");
    elem.setAttribute("href", "#");
    td.appendChild(elem);
    tr.appendChild(td);

    td = makeElement("th", null, "ship-level");
    tr.appendChild(td);

    thead.appendChild(tr);
    table.appendChild(thead);

    // データ
    var tbody = makeElement("tbody");
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
      else if (kcif.sort_items.startsWith("alv")) {
        result = a.alv - b.alv;
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
          result = kcif.compareShip(kcif.ship_list[a.ship_id], kcif.ship_list[b.ship_id]);
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
      tr = makeElement("tr");
      td = makeElement("td", null, "item-no", (i + 1));
      tr.appendChild(td);
      td = makeElement("td", null, "item-type", item.type_name);
      tr.appendChild(td);
      td = makeElement("td", null, "item-name", item.name);
      tr.appendChild(td);
      td = makeElement("td", null, "item-level", item.level);
      tr.appendChild(td);
      td = makeElement("td", null, "item-alv", item.alv);
      tr.appendChild(td);
      var ship = item.ship_id != null ? kcif.ship_list[item.ship_id] : null;
      tr.appendChild(kcif.shipName(ship));
      tr.appendChild(kcif.shipLevel(ship));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    inner.appendChild(table);
    outer.appendChild(inner);
    itemstab.appendChild(outer);
    inner.scrollTop = pos;

    // アイテム:ヘッダ行リンク
    var elems = itemstab.querySelectorAll("th a");
    for (var i = 0; i < elems.length; i++) {
      elems[i].addEventListener("click", function(evt){
        if (evt) evt.preventDefault();
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
          kcif.sort_items = sort + (sort == "no" || sort == "level" || sort == "alv" ? "-" : "+");
        }
        kcif.renderInfo(true);
      }, false);
    }
  },

  selectTab: function(evt) {
    if (evt) evt.preventDefault();

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
  },

  selectFleet: function (evt) {
    if (evt) evt.preventDefault();

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
  },

  saveConfig: function(evt) {
    if (evt) evt.preventDefault();

    var str = CCIN("@mozilla.org/supports-string;1", "nsISupportsString");

    var configtab = kcif.info_div.querySelector("#tab-config");
    var elem = configtab.querySelector("#capture-save-dir");
    if (elem) {
      str.data = elem.value;
      kcif.myPref().setComplexValue("capture.directory", Ci.nsISupportsString, str);
    }

    elem = configtab.querySelector("#capture-save-base");
    if (elem) {
      str.data = elem.value;
      kcif.myPref().setComplexValue("capture.basename", Ci.nsISupportsString, str);
    }

    elem = configtab.querySelector("#beep-url");
    if (elem) {
      str.data = elem.value;
      kcif.myPref().setComplexValue("beep.url", Ci.nsISupportsString, str);
    }

    elem = configtab.querySelector("#beep-volume");
    if (elem) {
      kcif.myPref().setIntPref("beep.volume", elem.value);
    }

    elem = configtab.querySelector("#beep-expedition");
    if (elem) {
      kcif.myPref().setBoolPref("beep.expedition", elem.checked);
    }

    elem = configtab.querySelector("#beep-dock");
    if (elem) {
      kcif.myPref().setBoolPref("beep.dock", elem.checked);
    }

    elem = configtab.querySelector("#beep-built");
    if (elem) {
      kcif.myPref().setBoolPref("beep.built", elem.checked);
    }

    elem = configtab.querySelector("#beep-repair");
    if (elem) {
      kcif.myPref().setBoolPref("beep.repair", elem.checked);
    }

    elem = configtab.querySelector("#show-battle");
    if (elem) {
      kcif.myPref().setBoolPref("show.battle", elem.checked);
    }

    elem = configtab.querySelector("#show-built");
    if (elem) {
      kcif.myPref().setBoolPref("show.built", elem.checked);
    }

    elem = configtab.querySelector("#hp-by-meter");
    if (elem) {
      kcif.myPref().setBoolPref("meter.hp", elem.checked);
    }

    elem = configtab.querySelector("#fuel-by-meter");
    if (elem) {
      kcif.myPref().setBoolPref("meter.fuel", elem.checked);
    }

    elem = configtab.querySelector("#search-formula");
    if (elem) {
      kcif.myPref().setIntPref("search.formula", elem.options[elem.selectedIndex].value);
    }

    elem = configtab.querySelector("#aircover-alv");
    if (elem) {
      kcif.myPref().setBoolPref("aircover.alv", elem.checked);
    }

    kcif.restoreCheckboxes(configtab, kcif.saveCheckboxes(configtab));
    kcif.beepOnOff();

    var elems = configtab.querySelectorAll("div.config-buttons button");
    for (var i = 0; i < elems.length; i++) {
      elems[i].disabled = true;
    }

    kcif.renderInfo(true);
  },

  resetConfig: function(evt) {
    if (evt) evt.preventDefault();

    var elem = kcif.info_div.querySelector("#capture-save-dir");
    if (elem) {
      elem.value = kcif.getCaptureSaveDir();
    }

    elem = kcif.info_div.querySelector("#capture-save-base");
    if (elem) {
      elem.value = kcif.getCaptureSaveBase();
    }

    elem = kcif.info_div.querySelector("#beep-url");
    if (elem) {
      elem.value = kcif.getBeepUrl();
    }

    elem = kcif.info_div.querySelector("#beep-volume");
    if (elem) {
      elem.value = kcif.getBeepVolume();
    }

    elem = kcif.info_div.querySelector("#beep-expedition");
    if (elem) {
      elem.checked = kcif.getBeepExpedition();
    }

    elem = kcif.info_div.querySelector("#beep-dock");
    if (elem) {
      elem.checked = kcif.getBeepDock();
    }

    elem = kcif.info_div.querySelector("#beep-built");
    if (elem) {
      elem.checked = kcif.getBeepBuilt();
    }

    elem = kcif.info_div.querySelector("#beep-repair");
    if (elem) {
      elem.checked = kcif.getBeepRepair();
    }

    elem = kcif.info_div.querySelector("#show-battle");
    if (elem) {
      elem.checked = kcif.getShowBattle();
    }

    elem = kcif.info_div.querySelector("#show-built");
    if (elem) {
      elem.checked = kcif.getShowBuilt();
    }

    elem = kcif.info_div.querySelector("#hp-by-meter");
    if (elem) {
      elem.checked = kcif.getHpByMeter();
    }

    elem = kcif.info_div.querySelector("#fuel-by-meter");
    if (elem) {
      elem.checked = kcif.getFuelByMeter();
    }

    elem = kcif.info_div.querySelector("#search-formula");
    if (elem) {
      for (var i = 0; i < elem.options.length; i++) {
        if (Number(elem.options[i].value) == kcif.getSearchFormula()) {
          elem.selectedIndex = i;
          break;
        }
      }
    }

    elem = kcif.info_div.querySelector("#aircover-alv");
    if (elem) {
      elem.checked = kcif.getAircoverAlv();
    }

    var elems = kcif.info_div.querySelectorAll("#tab-config div.config-buttons button");
    for (var i = 0; i < elems.length; i++) {
      elems[i].disabled = true;
    }
  },

  checkConfigChanged: function() {
    var changed = false;

    var elem = kcif.info_div.querySelector("#capture-save-dir");
    if (elem) {
      if (elem.value != kcif.getCaptureSaveDir()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#capture-save-base");
    if (elem) {
      if (elem.value != kcif.getCaptureSaveBase()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#beep-url");
    if (elem) {
      if (elem.value != kcif.getBeepUrl()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#beep-volume");
    if (elem) {
      if (elem.value != kcif.getBeepVolume()) {
        log("checkConfigChaned: beep-volume: [" + elem.value + "] <- [" + kcif.getBeepVolume() + "] : " + elem.value != kcif.getBeepVolume());
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#beep-expedition");
    if (elem) {
      if (elem.checked != kcif.getBeepExpedition()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#beep-dock");
    if (elem) {
      if (elem.checked != kcif.getBeepDock()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#beep-built");
    if (elem) {
      if (elem.checked != kcif.getBeepBuilt()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#beep-repair");
    if (elem) {
      if (elem.checked != kcif.getBeepRepair()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#show-battle");
    if (elem) {
      if (elem.checked != kcif.getShowBattle()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#show-built");
    if (elem) {
      if (elem.checked != kcif.getShowBuilt()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#hp-by-meter");
    if (elem) {
      if (elem.checked != kcif.getHpByMeter()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#fuel-by-meter");
    if (elem) {
      if (elem.checked != kcif.getFuelByMeter()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#search-formula");
    if (elem) {
      if (elem.options[elem.selectedIndex].value != kcif.getSearchFormula()) {
        changed = true;
      }
    }

    elem = kcif.info_div.querySelector("#aircover-alv");
    if (elem) {
      if (elem.checked != kcif.getAircoverAlv()) {
        changed = true;
      }
    }

    return changed;
  },

  myGetTmpDir: function() {
    return Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("TmpD", Ci.nsIFile).path;
  },

  myPref: function() {
    return Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.kancolleinfo.");
  },

  getStringPref: function(pref) {
    return kcif.myPref().getComplexValue(pref, Ci.nsISupportsString).data;
  },

  getIntPref: function(pref) {
    return kcif.myPref().getIntPref(pref);
  },

  getBoolPref: function(pref) {
    return kcif.myPref().getBoolPref(pref);
  },

  getCaptureSaveDir: function() {
    return kcif.getStringPref("capture.directory") || kcif.myGetTmpDir();
  },

  getCaptureSaveBase: function() {
    return kcif.getStringPref("capture.basename") || "kancolle-";
  },

  getBeepUrl: function() {
    return kcif.getStringPref("beep.url") || "file:///C:/Windows/Media/ringout.wav";
  },

  getBeepVolume: function() {
    return kcif.getIntPref("beep.volume");
  },

  getBeepExpedition: function() {
    return kcif.getBoolPref("beep.expedition");
  },

  getBeepDock: function() {
    return kcif.getBoolPref("beep.dock");
  },

  getBeepBuilt: function() {
    return kcif.getBoolPref("beep.built");
  },

  getBeepRepair: function() {
    return kcif.getBoolPref("beep.repair");
  },

  getShowBattle: function() {
    return kcif.getBoolPref("show.battle");
  },

  getShowBuilt: function() {
    return kcif.getBoolPref("show.built");
  },

  getHpByMeter: function() {
    return kcif.getBoolPref("meter.hp");
  },

  getFuelByMeter: function() {
    return kcif.getBoolPref("meter.fuel");
  },

  getSearchFormula: function() {
    return kcif.getIntPref("search.formula");
  },

  getAircoverAlv: function() {
    return kcif.getBoolPref("aircover.alv");
  },

  getLogLevel: function() {
    return kcif.getIntPref("debug.loglevel");
  },

  saveCheckboxes: function(tab) {
    var checks = {};
    if (typeof tab != "undefined") {
      var elems = tab.querySelectorAll("input.check-timer");
      for (var i = 0; i < elems.length; i++) {
        checks[elems[i].id] = elems[i].checked;
      }
    }
    return checks;
  },

  restoreCheckboxes: function(tab, checks) {
    if (typeof tab != "undefined") {
      var elems = tab.querySelectorAll("input.check-timer");
      for (var i = 0; i < elems.length; i++) {
        if (elems[i].className.indexOf("check-repair") >= 0) {
          elems[i].checked = kcif.getBeepRepair() && checks[elems[i].id] == null || checks[elems[i].id];
        }
        else if (elems[i].className.indexOf("check-expedition") >= 0) {
          elems[i].checked = kcif.getBeepExpedition() && checks[elems[i].id] == null || checks[elems[i].id];
        }
        else if (elems[i].className.indexOf("check-dock") >= 0) {
          elems[i].checked = kcif.getBeepDock() && checks[elems[i].id] == null || checks[elems[i].id];
        }
        else if (elems[i].className.indexOf("check-built") >= 0) {
          elems[i].checked = kcif.getBeepBuilt() && checks[elems[i].id] == null || checks[elems[i].id];
        }
      }
    }
  },

  beepOnOff: function() {
    var url = kcif.getBeepUrl();
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
    kcif.beep.volume = kcif.getBeepVolume() / 100.0;

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
  },

  saveFile: function(blob, path) {
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
  },

  getPathSeparator: function() {
    var profD = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
    profD.append("dummy");
    profD.append("dummy");
    return profD.path.substr(profD.path.length - ("dummy".length) - 1, 1);
  },

  captureAndSave: function(evt) {
    if (evt) evt.preventDefault();

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
      var dir = kcif.getCaptureSaveDir();
      var base = kcif.getCaptureSaveBase();
      var s = new Date().toLocaleFormat("%Y%m%d%H%M%S");
      var filename = dir + kcif.getPathSeparator() + base + s + ".png";
      kcif.saveFile(blob, filename);
    }, "image/png");
  },

  time2str: function(dt) {
    return dt.toLocaleFormat(dt.getDate() != new Date().getDate() ? "%m/%d %H:%M" : "%H:%M");
  },

  getTimeColor: function(dt, strict) {
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
  },

  hash2str: function(obj) {
    var s = "";
    for (var prop in obj) {
      if (s.length > 0) {
        s += "&";
      }
      s += prop + "=" + obj[prop];
    }
    return s;
  },

  map2str: function(map) {
    var cell;
    if (map.api_no == map.api_bosscell_no || map.api_event_id == 5) {
      cell = "*";
    }
    else if (map.api_event_kind) {
      cell = "+";
    }
    else {
      cell = "-";
    }
    return cell + " " + map.api_maparea_id + "-" + map.api_mapinfo_no + "-" + map.api_no;
  },

  type2str: function(type) {
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
      case 22:
        s = "補給";
        break;
      default:
        log("艦種不明: " + type);
        s = "不明";
        break;
    }
    return s;
  },

  seiku2str: function(seiku, seiku_alv) {
    var seikuText = "";
    if (seiku_alv) {
      seikuText += "自制空値: " + seiku + " + " + seiku_alv + "(熟練度ボーナス)\u000a";
      seiku += seiku_alv;
    }
    seikuText += "敵制空値:\u000a ";
    var tmp = Math.floor(seiku / 3);
    if (tmp < 1) {
      seikuText += "0: ";
    }
    else {
      seikuText += "0～" + tmp + ": ";
    }
    seikuText += "制空権確保\u000a ";
    tmp++;
    var tmp2 = Math.floor(seiku / 1.5);
    if (tmp <= tmp2) {
      seikuText += tmp;
      if (tmp < tmp2) {
        seikuText += "～" + tmp2;
      }
      seikuText += ": 航空優勢\u000a ";
      tmp = tmp2 + 1;
    }
    tmp2 = Math.floor(seiku * 1.5);
    if (tmp <= tmp2) {
      seikuText += tmp;
      if (tmp < tmp2) {
        seikuText += "～" + tmp2;
      }
      seikuText += ": 航空均衡\u000a ";
      tmp = tmp2 + 1;
    }
    tmp2 = Math.floor(seiku * 3);
    if (tmp <= tmp2) {
      seikuText += tmp;
      if (tmp < tmp2) {
        seikuText += "～" + tmp2;
      }
      seikuText += ": 航空劣勢\u000a ";
      tmp = tmp2 + 1;
    }
    seikuText += tmp + "～: 制空権喪失";

    return seikuText;
  },

  shipType: function(ship) {
    var s = "";
    if (ship && ship.type) {
      s = kcif.type2str(ship.type);
    }
    return makeElement("td", null, "ship-type", s);
  },

  itemName: function(item, equip, equip_max) {
    var name = item.name;
    if (item.level > 0) {
      name += "+" + item.level;
    }
    if (item.alv > 0) {
      name += "+" + item.alv;
    }
    if (item.type && kcif.isPlane(item.type[2])) {
      name += " [" + String(equip) + "/" + String(equip_max) + "]";
    }
    return name;
  },

  shipName: function(ship) {
    var s;
    var items = [];
    if (!ship || !ship.ship_id) {
      s = "";
    }
    else {
      s = ship.name || "(" + ship.ship_id + ")";
      for (var i = 0; ship.slot && (i < ship.slot.length); i++) {
        if (ship.slot[i] >= 0 && kcif.item_list[ship.slot[i]]) {
          var item = kcif.item_list[ship.slot[i]];
          var name = String(i + 1) + ": " + kcif.itemName(item, ship.equip[i], ship.equip_max[i]);
          items.push(name);
        }
      }
      if (ship.slot_ex >= 0) {
        var item = kcif.item_list[ship.slot_ex];
        if (item) {
          var name = "ex: " + kcif.itemName(item);
          items.push(name);
        }
      }
    }

    var td = makeElement("td", null, "ship-name", s);
    if (items.length > 0) {
      td.setAttribute("title", items.join("\u000a"));
    }
    return td;
  },

  shipLevel: function(ship) {
    var col = "color-default";
    var title = null;
    if (ship) {
      if (ship.afterlv > 0) {
        if (ship.level >= ship.afterlv) {
          col = "color-green";
          title = '改造後 ' + kcif.ship_master[ship.aftershipid].name + '(' + kcif.type2str(kcif.ship_master[ship.aftershipid].type) + ')';
        }
        else {
          title = 'LV' + ship.afterlv + ' ' + kcif.ship_master[ship.aftershipid].name + '(' + kcif.type2str(kcif.ship_master[ship.aftershipid].type) + ')';
        }
      }
      if (ship.level != ship.p_level) {
        col += " blink";
      }
    }

    var td = makeElement("td", null, "ship-level " + col, ship ? ship.level : "");
    if (title) {
      td.setAttribute("title", title);
    }
    return td;
  },

  hp2meter: function(cur, max) {
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

    var meter = makeElement("meter", null, status);
    meter.setAttribute("min", "0");
    meter.setAttribute("max", max);
    meter.setAttribute("title", Math.floor(cur * 100 / max) + '%');
    meter.value = cur;
    return meter;
  },

  shipHp: function(ship) {
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

    var td = makeElement("td", null, "ship-hp" + (kcif.getHpByMeter() ? '-meter ' : ' ') + col, ship.taihi ? "退避" : (hp + '/' + ship.hp_max));
    if (ship.p_hp != hp) {
      td.setAttribute("title", "直前:" + ship.p_hp);
    }
    if (kcif.getHpByMeter()) {
      td.appendChild(kcif.hp2meter(ship.hp, ship.hp_max));
    }
    return td;
  },

  shipCond: function(ship) {
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
    return makeElement("td", null, "ship-cond " + col, ship.cond);
  },

  fuelBullColor: function(cur, max) {
    if (cur >= max) {
      return "color-green";
    }
    else if (cur >= max * 0.5) {
      return "color-yellow";
    }
    else if (cur > 0) {
      return "color-orange";
    }
    else {
      return "color-red";
    }
  },

  fuel2meter: function(cur, max) {
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

    var meter = makeElement("meter", null, status);
    meter.setAttribute("min", "0");
    meter.setAttribute("max", max);
    meter.value = cur;
    return meter;
  },

  shipFuel: function(ship) {
    if (kcif.getFuelByMeter()) {
      var td = makeElement("td", null, "ship-fuel-bull");
      td.setAttribute("title", '燃料: ' + ship.fuel + '/' + ship.fuel_max + ' (' + Math.floor(ship.fuel * 100 / ship.fuel_max) + '%)\u000a弾薬: ' + ship.bull + '/' + ship.bull_max + ' (' + Math.floor(ship.bull * 100 / ship.bull_max) + '%)');
      td.appendChild(kcif.fuel2meter(ship.fuel, ship.fuel_max));
      td.appendChild(kcif.fuel2meter(ship.bull, ship.bull_max));
      return td;
    }
    else {
      var col = kcif.fuelBullColor(ship.fuel, ship.fuel_max);
      if (ship.fuel != ship.p_fuel) {
        col += " blink";
      }
      var td = makeElement("td", null, "ship-fuel " + col, Math.floor(ship.fuel * 100 / ship.fuel_max) + '%');
      td.setAttribute("title", ship.fuel + '/' + ship.fuel_max);
      return td;
    }
  },

  shipBull: function(ship) {
    if (!kcif.getFuelByMeter()) {
      col = kcif.fuelBullColor(ship.bull, ship.bull_max);
      if (ship.bull != ship.p_bull) {
        col += " blink";
      }
      var td = makeElement("td", null, "ship-bull " + col, Math.floor(ship.bull * 100 / ship.bull_max) + '%');
      td.setAttribute("title", ship.bull + '/' + ship.bull_max);
      return td;
    }
  },

  shipExp: function(ship) {
    var total = '';
    var need = '';
    if (ship.exp[1] > 0) {
      total = ship.exp[0] + '/' + (ship.exp[0] + ship.exp[1]);
      need = ship.exp[1];
    }
    var td = makeElement("td", null, "ship-exp", need);
    td.setAttribute("title", total);
    return td;
  },

  formatMaterial: function(name, value, level) {
    var col;
    if (level) {
      var max = (level + 3) * 250;
      col = value >= 300000 ? " color-red" : value >= max ? " color-yellow" : "";
    }
    else {
      col = value >= 3000 ? " color-red" : "";
    }
    var tr = makeElement("tr");
    var td = makeElement("th", null, "res-name", name);
    tr.appendChild(td);
    td = makeElement("td", null, "res-value" + col, value);
    tr.appendChild(td);
    return tr;
  },

  updateRepairStart: function(idx) {
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
  },

  removeFromDeck: function(ship_id) {
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
          kcif.updateRepairStart(i);
          found = true;
          break;
        }
      }
    }
    return found;
  },

  makeItem: function(data, ship_id) {
    var item = {
      api_id: data.api_id,
      item_id: data.api_slotitem_id,
      level: typeof data.api_level != "undefined" ? data.api_level : 0,
      alv: typeof data.api_alv != "undefined" ? data.api_alv : 0,
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
  },

  makeShip: function(data, taihi) {
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
      slot_ex: data.api_slot_ex,
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
  },

  hasSeiku: function(type) {
    return (type >= 6 && type <= 8) || type == 11 || type == 45;
  },

  isPlane: function(type) {
    return (type >= 6 && type <= 11 || type == 25 || type == 26 || type == 41 || type == 45 || type == 94);
  },

  isInDock: function(ship) {
    return kcif.dock.filter(function(e){return e.api_ship_id == ship.api_id}).length != 0;
  },

  isOnMission: function(mission) {
    return mission && mission[0] == "遠征中";
  },

  isOnPractice: function(mission) {
    return mission && mission[0] == "演習";
  },

  isCombined: function(mission) {
    return mission && mission[0] == "(連合艦隊)";
  },

  calcSakuteki: function(item, type) {
    var co = 0;
    var add = 0;
    if (type == 1) { // 旧2-5式
      switch (item.type[2]) {
        case 9: // 艦偵
        case 10:// 水偵
        case 11:// 水爆
        case 94:// 艦偵(II) TODO
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
        case 94:// 艦偵(II) TODO
          co = 1.6592780;
          break;
        case 10:// 水偵
          co = 2.0000000;
          break;
        case 11:// 水爆
          co = 1.7787282;
          break;
        case 12:// 小型電探
          co = 1.0045358;
          break;
        case 13:// 大型電探
        case 93:// 大型電探(II) TODO
          co = 0.9906638;
          break;
        default:// その他
          co = 0.9067950;
          break;
      }
    }
    else if (type == 3) { // 2-5秋簡易式
      switch (item.type[2]) {
        case 7: // 艦爆
          co = 0.6;
          break;
        case 8: // 艦攻
          co = 0.8;
          break;
        case 9: // 艦偵
        case 94:// 艦偵(II) TODO
          co = 1.0;
          break;
        case 10:// 水偵
          co = 1.2;
          break;
        case 11:// 水爆
          co = 1.0;
          break;
        case 12:// 小型電探
        case 13:// 大型電探
        case 93:// 大型電探(II) TODO
          co = 0.6;
          break;
        default:// その他
          co = 0.5;
          break;
      }
    }
    else { // 33判定式
      switch (item.type[2]) {
        case 8: // 艦攻
          co = 0.8;
          break;
        case 9: // 艦偵
        case 94:// 艦偵(II) TODO
          co = 1.0;
          break;
        case 10:// 水偵
          co = 1.2;
          add = 1.2 * Math.sqrt(item.level);
          break;
        case 11:// 水爆
          co = 1.1;
          break;
        case 12:// 小型電探
        case 13:// 大型電探
        case 93:// 大型電探(II) TODO
          co = 0.6;
          add = 1.25 * Math.sqrt(item.level);
          break;
        default:// その他
          co = 0.6;
          break;
      }
    }
    return co * (item.sakuteki + add);
  },

  compareShip: function(a, b) {
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
  },

  setupFleetStatus: function() {
    kcif.battle_result = [[], []];
    for (var i = 0, deck; deck = kcif.deck_list[i]; i++) {
      for (var j = 0, id; (id = deck.api_ship[j]) && id >= 0; j++) {
        var ship = kcif.ship_list[id];
        if (ship && ship.hp <= 0) {
          var k = j;
          do {
            deck.api_ship[k] = deck.api_ship[k + 1];
            k++;
          } while (deck.api_ship[k] && (deck.api_ship[k] >= 0));
          j--;
        }
      }
    }
  },

  form2str: function(form, prefix) {
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
  },

  reflectDamage: function(buf, idx, ship, damage) {
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
        var slots = ship.slot.concat(ship.slot_ex);
        for (var i = 0; i < slots.length && !found; i++) {
          if (slots[i] < 0) {
            continue;
          }
          var item = kcif.item_list[slots[i]];
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
              if (i >= ship.slot.length) {
                ship.slot_ex = -1;
              }
              else {
                for (var j = i + 1; j < ship.slot.length - 1; j++) {
                  ship.slot[j - 1] = ship.slot[j];
                }
                ship.slot[slots.length - 1] = -1;
              }
            }
          }
        }
      }
      if (!found) {
        ship.hp = 0;
      }
    }
  },

  damageKouku: function(deck, enemies, kouku, offset) {
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
            kcif.reflectDamage(kcif.battle_result[0], i + offset, ship, damage);
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
              kcif.reflectDamage(kcif.battle_result[1], i, enemies[i], damage);
            }
          }
        }
      }
    }
  },

  damageRaigeki: function(deck, enemies, raigeki, offset) {
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
        kcif.reflectDamage(kcif.battle_result[0], i + offset, ship, damage);
      }
    }

    damage_list = raigeki.api_edam;
    for (var i = 0; i < 6; i++) {
      if (enemies[i]) {
        if (damage_list[i + 1] >= 0 && raigeki.api_frai.indexOf(i + 1) != -1) {
          var damage = Math.floor(damage_list[i + 1]);
          log("    enemy " + (i + 1) + " damaged " + damage);
          kcif.reflectDamage(kcif.battle_result[1], i, enemies[i], damage);
        }
      }
    }
  },

  damageHougeki: function(deck, enemies, hougeki, offset) {
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
          kcif.reflectDamage(kcif.battle_result[0], target - 1 + offset, ship, damage);
        }
        else if (target >= 7 && target <= 12) {
          if (enemies[target - 7]) {
            log("    enemy " + (target - 6) + " damaged " + damage);
            kcif.reflectDamage(kcif.battle_result[1], target - 7, enemies[target - 7], damage);
          }
        }
      }
    }
  },

  damageTaisen: function(deck, enemies, taisen, offset) {
    if (!offset) {
      offset = 0;
    }

    for (var i = 1, t_list; t_list = taisen.api_df_list[i]; i++) {
      for (var j = 0, target; target = t_list[j]; j++) {
        var damage = Math.floor(taisen.api_damage[i][j]);
        if (target >= 1 && target <= 6) {
          var id = deck.api_ship[target - 1];
          log("    fleet " + deck.api_id + " ship " + target + "(" + String(id) + ") damaged " + damage);
          var ship = kcif.ship_list[id];
          kcif.reflectDamage(kcif.battle_result[0], target - 1 + offset, ship, damage);
        }
        else if (target >= 7 && target <= 12) {
          if (enemies[target - 7]) {
            log("    enemy " + (target - 6) + " damaged " + damage);
            kcif.reflectDamage(kcif.battle_result[1], target - 7, enemies[target - 7], damage);
          }
        }
      }
    }
  },

  judgeBattleResult: function(friends, enemies, myresult, eresult) {
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
      log("friend " + (i+1) + ": hp=" + friends[i].hp + ", damage=" + myresult[i]);
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
      log("enemy " + (i+1) + ": hp=" + enemies[i].hp + ", damage=" + eresult[i]);
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
  },

  judgeLdBattleResult: function(friends, myresult) {
    var fall = 0;
    var fdmg = 0;
    for (var i = 0; i < 12; i++) {
      if (!friends[i] || friends[i].taihi) {
        continue;
      }
      if (!myresult[i]) myresult[i] = 0;
      log("friend " + i + ": hp=" + friends[i].hp + ", damage=" + myresult[i]);
      fall += friends[i].hp + myresult[i];
      fdmg += myresult[i];
    }
    var frate = fdmg / fall;
    log("fdmg=" + fdmg + ", fall=" + fall + ", frate=" + frate);

    if (frate <= 0.0) {
      return "SS";
    }
    else if (frate < 0.1) {
      return "A";
    }
    else if (frate < 0.2) {
      return "B";
    }
    else if (frate < 0.5) {
      return "C";
    }
    else if (frate < 0.8) {
      return "D";
    }
    else {
      return "E";
    }
  },

  deck2ships: function(deck, deck2) {
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
  },

  battle: function(url, json) {
    try {
      var elem;
      var deck_id = json.api_data.api_dock_id || json.api_data.api_deck_id || 1;
      if (json.api_data.api_formation) {
        var title = kcif.form2str(json.api_data.api_formation[0], "自") + " " + kcif.form2str(json.api_data.api_formation[1], "敵");
        log("json.json.api_data.api_kouku = " + (json.api_data.api_kouku ? "exist" : "not exist"));
        if (json.api_data.api_kouku && json.api_data.api_kouku.api_stage1) {
          title += " ";
          switch (Number(json.api_data.api_kouku.api_stage1.api_disp_seiku)) {
            case 1:
              title += "制空権確保";
              break;
            case 2:
              title += "航空優勢";
              break;
            case 0:
              title += "航空均衡";
              break;
            case 3:
              title += "航空劣勢";
              break;
            case 4:
              title += "制空権喪失";
              break;
          }
        }

        var text = "";
        switch (json.api_data.api_formation[2]) {
          case 1:
            text = "同航戦";
            break;
          case 2:
            text = "反航戦";
            break;
          case 3:
            text = "T字有利";
            break;
          case 4:
            text = "T字不利";
            break;
        }
        elem = makeElement("span", null, null, text);
        elem.setAttribute("title", title);
        kcif.mission[deck_id - 1] = [kcif.mission[deck_id - 1][0], makeText(" "), elem];
      }
      if (url.indexOf("combined") != -1) {
        kcif.mission[1] = ["(連合艦隊)"];
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
          if (json.api_data.api_air_base_attack) { // air base attack
            for (var j = 0, kouku; kouku = json.api_data.api_air_base_attack[j]; j++) {
              log("  air base attack " + (j+1));
              kcif.damageKouku(deck, enemies, kouku.api_stage3);
            }
          }
          if (json.api_data.api_kouku) {
            log("  kouku");
            kcif.damageKouku(deck, enemies, json.api_data.api_kouku.api_stage3);
            if (url.indexOf("combined") != -1 && json.api_data.api_kouku.api_stage3_combined) {
              // must be 2nd fleet
              log("  kouku (2nd)");
              kcif.damageKouku(kcif.deck_list[1], enemies, json.api_data.api_kouku.api_stage3_combined, 6);
            }
          }
          if (json.api_data.api_kouku2) { // air battle
            log("  kouku2");
            kcif.damageKouku(deck, enemies, json.api_data.api_kouku2.api_stage3);
            if (url.indexOf("combined") != -1 && json.api_data.api_kouku2.api_stage3_combined) {
              // must be 2nd fleet
              log("  kouku2 (2nd)");
              kcif.damageKouku(kcif.deck_list[1], json.api_data.api_kouku2.api_stage3_combined, 6);
            }
          }
          if (json.api_data.api_support_info) {
            var support = json.api_data.api_support_info;
            if (support.api_support_airatack) {
              log("  support (airatack)");
              kcif.damageKouku(deck, enemies, support.api_support_airatack.api_stage3);
            }
            else if (support.api_support_hourai) {
              log("  support (hourai)");
              var damage = support.api_support_hourai.api_damage;
              for (var i = 0; i < 6; i++) {
                if (damage[i + 1] > 0 && enemies[i]) {
                  kcif.reflectDamage(kcif.battle_result[1], i, enemies[i], Math.floor(damage[i + 1]));
                }
              }
            }
          }
          if (json.api_data.api_opening_taisen) {
            log("  opening taisen");
            if (url.indexOf("combined") != -1 && url.indexOf("water") == -1) {
              // must be 2nd fleet
              kcif.damageTaisen(kcif.deck_list[1], enemies, json.api_data.api_opening_taisen, 6);
            }
            else {
              kcif.damageTaisen(deck, enemies, json.api_data.api_opening_taisen);
            }
          }
          if (json.api_data.api_opening_atack) {
            log("  opening");
            if (url.indexOf("combined") != -1) {
              // must be 2nd fleet
              kcif.damageRaigeki(kcif.deck_list[1], enemies, json.api_data.api_opening_atack, 6);
            }
            else {
              kcif.damageRaigeki(deck, enemies, json.api_data.api_opening_atack);
            }
          }
          if (json.api_data.api_hougeki) { // midnight battle
            log("  hougeki (midnight)");
            if (url.indexOf("combined") != -1) {
              kcif.damageHougeki(deck, enemies, json.api_data.api_hougeki, 6);
            }
            else {
              kcif.damageHougeki(deck, enemies, json.api_data.api_hougeki);
            }
          }
          if (json.api_data.api_hougeki1) {
            log("  hougeki1");
            if (url.indexOf("combined") != -1 && url.indexOf("water") == -1) {
              // must be 2nd fleet
              kcif.damageHougeki(kcif.deck_list[1], enemies, json.api_data.api_hougeki1, 6);
            }
            else {
              kcif.damageHougeki(deck, enemies, json.api_data.api_hougeki1);
            }
          }
          if (json.api_data.api_raigeki && url.indexOf("combined") != -1 && url.indexOf("water") == -1) {
            log("  raigeki");
            // must be 2nd fleet
            kcif.damageRaigeki(kcif.deck_list[1], enemies, json.api_data.api_raigeki, 6);
          }
          if (json.api_data.api_hougeki2) {
            log("  hougeki2");
            kcif.damageHougeki(deck, enemies, json.api_data.api_hougeki2);
          }
          if (json.api_data.api_hougeki3) { // combined battle
            log("  hougeki3");
            if (url.indexOf("water") != -1) {
              // must be 2nd fleet
              kcif.damageHougeki(kcif.deck_list[1], enemies, json.api_data.api_hougeki3, 6);
            }
            else {
              kcif.damageHougeki(deck, enemies, json.api_data.api_hougeki3);
            }
          }
          if (json.api_data.api_raigeki && (url.indexOf("combined") == -1 || url.indexOf("water") != -1)) {
            log("  raigeki");
            if (url.indexOf("combined") == -1) {
              kcif.damageRaigeki(deck, enemies, json.api_data.api_raigeki);
            }
            else {
              // must be 2nd fleet
              kcif.damageRaigeki(kcif.deck_list[1], enemies, json.api_data.api_raigeki, 6);
            }
          }

          var ships;
          if (url.indexOf("combined") != -1) {
            ships = kcif.deck2ships(kcif.deck_list[0], kcif.deck_list[1]);
          }
          else {
            ships = kcif.deck2ships(deck);
          }
          if (url.indexOf("ld_airbattle") != -1) { // air raid battle
            rank = kcif.judgeLdBattleResult(ships, kcif.battle_result[0]);
          }
          else {
            rank = kcif.judgeBattleResult(ships, enemies, kcif.battle_result[0], kcif.battle_result[1]);
          }
          break;
        }
      }
      rank = makeElement("span", null, ((rank == "C" || rank == "D" || rank == "E") ? "color-red" : (rank == "SS" || rank == "S") ? "color-green" : "color-gray"), rank);

      var s = [];
      for (var i = 0; i < 6; i++) {
        if (enemies[i] && enemies[i].hp_max > 0) {
          var t = "";
          if (enemies[i].name) {
            t += enemies[i].name + " ";
          }
          t += String(enemies[i].hp) + "/" + String(enemies[i].hp_max);
          if (enemies[i].hp > enemies[i].hp_max * 3 / 4) {
            elem = makeElement("span", null, "color-green", "◎");
          }
          else if (enemies[i].hp > enemies[i].hp_max / 2) {
            elem = makeElement("span", null, "color-yellow", "◎");
          }
          else if (enemies[i].hp > enemies[i].hp_max / 4) {
            elem = makeElement("span", null, "color-orange", "○");
          }
          else if (enemies[i].hp > 0) {
            elem = makeElement("span", null, "color-red", "△");
          }
          else if (enemies[i].hp <= 0) {
            elem = makeElement("span", null, "color-gray", "×");
          }
          elem.setAttribute("title", t);
          s.push(elem);
        }
      }
      elem = makeElement("span");
      elem.style.letterSpacing = "-2px";
      for (var i = 0; i < s.length; i++) {
        elem.appendChild(s[i]);
      }

      if (url.indexOf("combined") != -1 && url.indexOf("midnight") != -1) {
        deck_id = 1;
      }

      for (var i = 1; i < kcif.mission[deck_id - 1].length; i++) {
        if (kcif.mission[deck_id - 1][i] && kcif.mission[deck_id - 1][i].className == "battle-result") {
          kcif.mission[deck_id - 1].splice(i, kcif.mission[deck_id - 1].length - i);
        }
      }
      var bresult = makeElement("span", null, "battle-result", " ");
      bresult.appendChild(rank);
      bresult.appendChild(makeText(" "));
      bresult.appendChild(elem);
      kcif.mission[deck_id - 1].push(bresult);
    }
    catch (exc) {
      log("  failed: " + String(deck_id) + ": " + String(exc));
    }
  },

  basic: function(data) {
    kcif.admiral_level = Number(data.api_level);
    kcif.ship_max = Number(data.api_max_chara);
    kcif.item_max = Number(data.api_max_slotitem) + 3;
    log("basic: ship_max=" + String(kcif.ship_max) + ", item_max=" + String(kcif.item_max));
  },

  slot_item: function(data) {
    kcif.item_list = {};
    for (var i = 0, item; item = data[i]; i++) {
      kcif.makeItem(item, null);
    }
    kcif.item_num = data.length;
    for (var ship_id in kcif.ship_list) {
      var ship = kcif.ship_list[ship_id];
      for (var i = 0, slot; slot = ship.slot[i]; i++) {
        if (slot >= 0 && kcif.item_list[slot]) {
          kcif.item_list[slot].ship_id = ship.api_id;
        }
      }
    }
    log("slot_item: " + String(kcif.item_num) + " items");
  },

  kdock: function(dock_list) {
    for (var i = 0, dock; dock = dock_list[i]; i++) {
      kcif.build[i] = dock;
      log("kdock: " + kcif.build[i].api_id + ": " + kcif.build[i].api_complete_time);
    }
  },

  ndock: function(dock_list) {
    for (var i = 0, dock; dock = dock_list[i]; i++) {
      if (kcif.dock[i] && kcif.dock[i].api_ship_id >= 0 && kcif.dock[i].api_ship_id != dock.api_ship_id) {
        var ship = kcif.ship_list[kcif.dock[i].api_ship_id];
        if (ship) {
          ship.p_hp = ship.hp;
          ship.hp = ship.hp_max;
          if (ship.cond < 40) {
            ship.p_cond = ship.cond;
            ship.cond = 40;
          }
          log("ndock: " + kcif.dock[i].api_id + ": completed: " + ship.api_id);
        }
      }
      kcif.dock[i] = dock;
      log("ndock: " + kcif.dock[i].api_id + ": " + kcif.dock[i].api_complete_time);
    }
  },

  main: function(request, content, query) {
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
          kcif.mission[i] = ["遠征中", deck.api_mission[0], master ? master.name : "", deck.api_mission[2]];
        }
        else if (kcif.isOnMission(kcif.mission[i])) {
          kcif.mission[i] = null;
        }
        log("deck mission: " + i + ": " + (kcif.mission[i] ? kcif.mission[i][1] : "null"));
      }
      update_all = false;
    }
    else if (url.indexOf("/kdock") != -1 || url.indexOf("/getship") != -1) {
      var dock_list = url.indexOf("/kdock") != -1 ? json.api_data : json.api_data.api_kdock;
      kcif.kdock(dock_list);
      if (url.indexOf("/getship") != -1) {
        kcif.makeShip(json.api_data.api_ship);
        kcif.ship_num++;
        for (var i = 0, slot; slot = json.api_data.api_slotitem[i]; i++) {
          kcif.makeItem(slot, json.api_data.api_ship.api_id);
        }
        kcif.item_num += json.api_data.api_slotitem.length;
        log("getship: " + String(kcif.ship_num) + " ships, " + String(kcif.item_num) + " items");
      }
      else {
        update_all = false;
      }
    }
    else if (url.indexOf("/ndock") != -1) {
      kcif.ndock(json.api_data);
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
        kcif.removeFromDeck(Number(id));
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
        kcif.makeItem(json.api_data.api_slot_item, null);
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
        var after_slot = json.api_data.api_after_slot;
        var item = kcif.item_list[after_slot.api_id];
        if (item) {
          item.item_id = after_slot.api_slotitem_id;
          item.level = typeof after_slot.api_level != "undefined" ? after_slot.api_level : 0;
          item.alv = typeof after_slot.api_alv != "undefined" ? after_slot.api_alv : 0;
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
      if (json.api_data.api_use_slot_id) {
        for (var i = 0; i < json.api_data.api_use_slot_id.length; i++) {
          var id = json.api_data.api_use_slot_id[i];
          var item = kcif.item_list[id];
          if (item) {
            delete kcif.item_list[id];
            kcif.item_num--;
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
      if (dock_id > 0 && kcif.dock[dock_id - 1]) {
        var ship = kcif.ship_list[kcif.dock[dock_id - 1].api_ship_id];
        if (ship) {
          ship.p_hp = ship.hp;
          ship.hp = ship.hp_max;
          if (ship.cond < 40) {
            ship.p_cond = ship.cond;
            ship.cond = 40;
          }
        }
        kcif.material[5]--;
        kcif.dock[dock_id - 1].api_ship_id = 0;
        kcif.dock[dock_id - 1].api_complete_time = 0;
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
          kcif.removeFromDeck(id);
          delete kcif.ship_list[id];
        }
      }
      kcif.ship_num -= id_list.length;
      log("powerup: " + String(kcif.ship_num) + " ships, " + String(kcif.item_num) + " items");
    }
    else if (url.indexOf("slotset_ex") != -1) {
      var ship = kcif.ship_list[Number(query["api_id"])];
      if (ship) {
        var item_id = Number(query["api_item_id"]);
        ship.slot_ex[idx] = item_id;
      }
    }
    else if (url.indexOf("slotset") != -1) {
      var ship = kcif.ship_list[Number(query["api_id"])];
      if (ship) {
        var item_id = Number(query["api_item_id"]);
        var idx = Number(query["api_slot_idx"]);
        if (ship.slot[idx] >= 0 && kcif.item_list[ship.slot[idx]]) {
          kcif.item_list[ship.slot[idx]].ship_id = -1;
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
    else if (url.indexOf("slot_exchange_index") != -1) {
      var ship = kcif.ship_list[Number(query["api_id"])];
      if (ship) {
        for (var i = 0; i < 5; i++) {
          var item_id = json.api_data.api_slot[i];
          if (item_id >= 0 && kcif.item_list[item_id]) {
            kcif.item_list[item_id].ship_id = ship.api_id;
            ship.slot[i] = item_id;
          }
        }
      }
    }
    else if (url.indexOf("slot_deprive") != -1) {
      var setShip = kcif.ship_list[Number(query["api_set_ship"])];
      var unsetShip = kcif.ship_list[Number(query["api_unset_ship"])];
      if (setShip && unsetShip) {
        var unset = Number(query["api_unset_idx"]);
        var item_id = unsetShip.slot[unset];
        for (var i = unset; i < 4; i++) {
          unsetShip.slot[i] = unsetShip.slot[i + 1];
        }
        unsetShip.slot[4] = -1;

        var set = Number(query["api_set_idx"]);
        if (setShip.slot[set] >= 0) {
          kcif.item_list[setShip.slot[set]].ship_id = -1;
        }
        setShip.slot[set] = item_id;
        kcif.item_list[item_id].ship_id = setShip.ship_id;
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
      kcif.basic(api_data);
      update_all = false;
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
      kcif.slot_item(json.api_data);
    }
    else if (url.indexOf("/require_info") != -1) {
      kcif.slot_item(json.api_data.api_slot_item);
      kcif.kdock(json.api_data.api_kdock);
    }
    else if (url.indexOf("/charge") != -1) {
      for (var i = 0, data; data = json.api_data.api_ship[i]; i++) {
        var ship = kcif.ship_list[data.api_id];
        if (ship) {
          ship.p_fuel = ship.fuel;
          ship.fuel = data.api_fuel;
          ship.p_bull = ship.bull;
          ship.bull = data.api_bull;
          ship.equip = data.api_onslot;
        }
      }
      for (var i = 0; i < json.api_data.api_material.length; i++) {
        kcif.material[i] = json.api_data.api_material[i];
      }
      log("charged");
    }
    else if (url.indexOf("/api_req_hensei/change") != -1) {
      var deck_id = Number(query["api_id"]);
      var deck = kcif.deck_list[deck_id - 1];
      var idx = Number(query["api_ship_idx"]);
      var ship_id = Number(query["api_ship_id"]);
      log("changed (deck:" + deck_id + ", idx:" + idx + ", ship:" + ship_id + ", prev:" + deck.api_ship[idx] + ")");
      if (ship_id == -2) {
        for (var i = 1; i < 6; i++) {
          deck.api_ship[i] = -1;
        }
        kcif.updateRepairStart(deck_id - 1);
      }
      else if (ship_id < 0) {
        kcif.removeFromDeck(deck.api_ship[idx]);
      }
      else {
        var tmp = deck.api_ship[idx];
        if (tmp < 0) {
          kcif.removeFromDeck(ship_id);
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
              kcif.updateRepairStart(i);
            }
          }
          deck.api_ship[idx] = ship_id;
        }
        kcif.updateRepairStart(deck_id - 1);
      }
    }
    else if (url.indexOf("/preset_select") != -1) {
      var deck_id = Number(query["api_deck_id"]);
      var deck = kcif.deck_list[deck_id - 1];
      deck.api_ship = json.api_data.api_ship;
      kcif.updateRepairStart(deck_id - 1);
    }
    else if (url.indexOf("goback_port") != -1) {
      var ship1 = null, ship2 = null;
      for (var i = 0, deck; i < 2 && (deck = kcif.deck_list[i]); i++) {
        for (var j = 1, ship; j < 6 && (ship = kcif.ship_list[deck.api_ship[j]]); j++) {
          if (!ship1 && !ship.taihi && ship.hp <= ship.hp_max / 4) {
            ship1 = ship;
          }
          else if (i == 1 && !ship2 && !ship.taihi && ship.type == 2 && ship.hp > ship.hp_max * 3 / 4) {
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
      if (json.api_data.api_get_ship && json.api_data.api_get_ship.api_ship_id) {
        kcif.ship_num++;
        log("drop: " + json.api_data.api_get_ship.api_ship_id);
      }
      update_all = false;
    }
    else if (url.indexOf("battle") != -1) {
      log("battle: " + url);
      var deck_id = Number(json.api_data.api_dock_id || json.api_data.api_deck_id);
      if (url.indexOf("practice") != -1 && (!kcif.mission[deck_id - 1] || kcif.isOnPractice(kcif.mission[deck_id - 1]))) {
        kcif.mission[deck_id - 1] = ["演習"];
        if (url.indexOf("midnight") == -1) {
          kcif.setupFleetStatus();
        }
      }
      if (kcif.getShowBattle()) {
        kcif.battle(url, json);
      }
    }
    else if (url.indexOf("_map/start") != -1) {
      kcif.setupFleetStatus();
      var deck_id = Number(query["api_deck_id"]);
      if (deck_id > 0) {
        kcif.repair_start[deck_id - 1] = null;
        kcif.mission[deck_id - 1] = [kcif.map2str(json.api_data)];
        log("start: " + deck_id + ": " + kcif.mission[deck_id - 1][0]);
      }
      update_all = false;
    }
    else if (url.indexOf("_map/next") != -1) {
      kcif.setupFleetStatus();
      for (var i = 0; i < 4; i++) {
        if (kcif.mission[i] && !kcif.isOnMission(kcif.mission[i])) {
          kcif.mission[i] = [kcif.map2str(json.api_data)];
          log("next: " + (i + 1) + ": " + kcif.mission[i][0]);
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
    else if (url.indexOf("/ship") != -1 || url.indexOf("/port") != -1 || url.indexOf("/ship_deck") != -1) {
      var port = url.indexOf("/port") != -1;
      var ship2 = url.indexOf("/ship2") != -1;
      var data_list = port ? json.api_data.api_ship : ship2 ? json.api_data : json.api_data.api_ship_data;
      var deck_list = port ? json.api_data.api_deck_port : ship2 ? json.api_data_deck : json.api_data.api_deck_data;
      if (port) {
        for (var i = 0, deck; deck = deck_list[i]; i++) {
          master = kcif.mission_master[deck.api_mission[1]];
          if (deck.api_mission[2] > 0) {
            kcif.mission[i] = ["遠征中", deck.api_mission[1], master ? master.name : "", deck.api_mission[2]];
          }
          else {
            kcif.mission[i] = null;
          }
        }

        kcif.basic(json.api_data.api_basic);
      }
      if (deck_list.length >= kcif.deck_list.length) {
        kcif.deck_list = deck_list;
      }
      else {
        var found = false;
        for (var i = 0, deck; (deck = deck_list[i]) && !found; i++) {
          for (var j = 0; kcif.deck_list[j]; j++) {
            if (deck.api_id == kcif.deck_list[j]) {
              kcif.deck_list[j] = deck;
              found = true;
              break;
            }
          }
        }
      }

      for (var i = 0, data; data = data_list[i]; i++) {
        var ship = kcif.makeShip(data, !port);
        for (var j = 0, slot; slot = data.api_slot[j]; j++) {
          if (slot >= 0 && kcif.item_list[slot]) {
            kcif.item_list[slot].ship_id = ship.api_id;
          }
        }
        if (data.api_slot_ex >= 0 && kcif.item_list[data.api_slot_ex]) {
          kcif.item_list[data.api_slot_ex].ship_id = ship.api_id;
        }
      }
      if (port || ship2) {
        kcif.ship_num = i;
      }
      if (port) {
        // 轟沈艦削除
        for (var ship_id in kcif.ship_list) {
          var ship = kcif.ship_list[ship_id];
          if (ship.hp <= 0) {
            delete kcif.ship_list[ship_id];
          }
        }

        // 資源数更新
        for (var i = 0, data; data = json.api_data.api_material[i]; i++) {
          kcif.material[data.api_id - 1] = data.api_value;
        }

        // 泊地修理チェック
        var now = new Date().getTime();
        for (var i = 0, deck; deck = kcif.deck_list[i]; i++) {
          var leader = kcif.ship_list[deck.api_ship[0]];
          if (kcif.isOnMission(kcif.mission[i]) || !leader || leader.type != 19) {
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
            if (kcif.isInDock(ship)) {
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

        // 入渠状況更新
        kcif.ndock(json.api_data.api_ndock);
      }

      log("etc: " + String(kcif.ship_num) + " ships (" + (port ? "port" : ship2 ? "ship2" : "ship3") + ")");
    }
    else {
      //log("timer(?): " + url + " , query: " + kcif.hash2str(query));
    }

    kcif.renderInfo(update_all);

    if (kcif.timer) {
      window.clearTimeout(kcif.timer);
      kcif.timer = null;
    }
    kcif.timer = window.setTimeout(kcif.main, 10 * 1000);
  },
};

window.addEventListener("load", kcif.init, false);
window.addEventListener("unload", kcif.destroy, false);
document.addEventListener("DOMContentLoaded", kcif.onLoad, true);
