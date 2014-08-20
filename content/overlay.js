// original code: https://github.com/kageroh/cond_checker
// references:
//	http://d.hatena.ne.jp/teramako/20120215/p1
//	http://www.softwareishard.com/blog/firebug/nsitraceablechannel-intercept-http-traffic/
//	http://fartersoft.com/blog/2011/03/07/using-localstorage-in-firefox-extensions-for-persistent-data-storage/

function log() {
	Services.console.logStringMessage("[kcex]: " + Array.join(arguments, " "));
}

function time2str(dt) {
	var week = "SunMonTueWedThuFriSat";
	var s = dt.toLocaleFormat("%H:%M");
	if (dt.getDate() != new Date().getDate()) {
		s = week.substr(dt.getDay() * 3, 3) + "&nbsp;" + s;
	}
	return s;
}

function kcexCallback(request, content) {
	var url = request.name;
	var n = content.indexOf("=");
	var json = JSON.parse(content.substring(n + 1));
	if (url.indexOf("/deck_port") != -1 || url.indexOf("/deck") != -1) {
		var deck_list = json.api_data;
		for (var i = 0, deck; deck = deck_list[i]; i++) {
			kcex.mission[i] = deck.api_mission[2];
			log("deck_port: " + i + ": " + kcex.mission[i]);
		}
	} else if (url.indexOf("/kdock") != -1 || url.indexOf("/getship") != -1) {
		var dock_list = url.indexOf("/kdock") != -1 ? json.api_data : json.api_data.api_kdock;
		for (var i = 0, dock; dock = dock_list[i]; i++) {
			kcex.build[i] = dock;
			log("kdock: " + kcex.build[i].api_id + ": " + kcex.build[i].api_complete_time);
		}
	} else if (url.indexOf("/ndock") != -1) {
		var dock_list = json.api_data;
		for (var i = 0, dock; dock = dock_list[i]; i++) {
			kcex.repair[i] = dock;
			log("ndock: " + kcex.repair[i].api_id + ": " + kcex.repair[i].api_complete_time);
		}
	} else {
		var port = url.indexOf("/port") != -1;
		var ship3 = url.indexOf("/ship3") != -1
		log("etc: port=" + port + ", ship3 = " + ship3);
		var data_list = port ? json.api_data.api_ship : ship3 ? json.api_data.api_ship_data : json.api_data;
		var deck_list = port ? json.api_data.api_deck_port : ship3 ? json.api_data.api_deck_data: json.api_data_deck;
		if (port) {
			for (var i = 0, deck; deck = deck_list[i]; i++) {
				kcex.mission[i] = deck.api_mission[2];
			}

			var dock_list = json.api_data.api_ndock;
			for (var i = 0, dock; dock = dock_list[i]; i++) {
				kcex.repair[i] = dock;
			}
		}
		kcex.deck_list = deck_list;

		var ship_list = {};
		var i = 0;
		for (var data; data = data_list[i]; i++) {
			var api_id = data.api_id.toString();
			var ship = kcex.ship_list[api_id];
			ship_list[api_id] = {
				ship_id: data.api_ship_id,
				p_cond: ship ? ship.c_cond : 49,
				c_cond: data.api_cond,
				nowhp: data.api_nowhp,
				maxhp: data.api_maxhp
			};
			if (data.api_ship_name) {
				ship_list[api_id].name = data.api_ship_name;
			}
		}
		if (!ship3) {
			kcex.ship_num = i;
		}

		kcex.ship_list = ship_list;
		kcex.putStorage("ship_list", JSON.stringify(ship_list));
		log(String(kcex.ship_num) + " ships");
	}

	var p = [];
	var r = [];
	r.push("<b>" + kcex.timeStamp() + "</b>");
	if (kcex.ship_num) {
		r.push(String(kcex.ship_num) + " ships");
	}
	else {
		r.push("loading...");
	}
	p.push(r);

	r = []
	r.push("<b>建造</b>");
	for (var i = 0; kcex.build[i]; i++) {
		if (kcex.build[i].api_complete_time > 0) {
			var dt = new Date(kcex.build[i].api_complete_time);
			var now = new Date().getTime();
			var s = kcex.build[i].api_id + ".&nbsp;" + time2str(dt);
			if (dt.getTime() <= now) {
				s = "<font color='#d00'>" + s + "</font>";
			} else if (dt.getTime() - 60000 <= now) {
				s = "<font color='#c60'>" + s + "</font>";
			}
			r.push(s);
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
			r.push(s);
		}
	}
	p.push(r);

	for (var i = 0, deck; deck = kcex.deck_list[i]; i++) {
		var r = [];
		r.push("<b>" + String(i+1) + ":" + deck.api_name + "</b>");
		var t = kcex.mission[i];
		if (t) {
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
		var id_list = deck.api_ship;
		for (var j = 0, id; id = id_list[j]; j++) {
			if (id === -1) break;
			var ship = kcex.ship_list[id.toString()];
			if (ship != null) {
				var s = (j + 1).toString() + '.&nbsp;';
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
				var sid = " " + (ship.name ? ship.name : "") + "(" + ship.ship_id + ")";
				r.push(s + shp + scd + sid);
			}
		}
		p.push(r);
	}
	kcex.render(p);
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
		this.originalListener.onStopRequest(request, context, statusCode);
		// Get entire response
		var responseSource = this.receivedData.join("");

		kcexCallback(request, responseSource);
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
		if (path.indexOf("/kcsapi/api_get_member/") != -1 || path.indexOf("/kcsapi/api_port/") != -1 || path.indexOf("/kcsapi/api_req_kousyou/") != -1) {
			if (path.indexOf("/ship2") != -1 || path.indexOf("/ship3") != -1 || path.indexOf("/port") != -1 || path.indexOf("/deck_port") != -1 || path.indexOf("/deck") != -1 || path.indexOf("/kdock") != -1 || path.indexOf("/getship") != -1 || path.indexOf("/ndock") != -1) {
				log("create TracingListener");
				var newListener = new TracingListener();
				aSubject.QueryInterface(Ci.nsITraceableChannel);
				newListener.originalListener = aSubject.setNewListener(newListener);
			}
		}
	},

	QueryInterface: XPCOMUtils.generateQI(["nsIObserver"])
};

var kcex = {
	div: null,
	storage: null,
	ship_list: {},
	mission: [],
	repair: [],
	build: [],
	deck_list: [],
	ship_num: null,
	
	init: function(event) {
		log("init");
	
		var url = "http://www.dmm.com/netgame/social/-/gadgets/=/app_id=854854/";
		var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		var ssm = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
		var dsm = Cc["@mozilla.org/dom/storagemanager;1"].getService(Ci.nsIDOMStorageManager);
		var uri = ios.newURI(url, "", null);
		var principal = ssm.getCodebasePrincipal(uri);
		kcex.storage = dsm.getLocalStorageForPrincipal(principal, "");
		
		var s = kcex.getStorage("ship_list");
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
		log("DOMloaded:", url);
		if (url.match(/osapi\.dmm\.com\//)) {
			var div = doc.createElement('div');
//			div.style.whiteSpace = 'pre';
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
		}
		else if (url.match(/\/app_id=854854\//)) {
			var game_frame = event.originalTarget.getElementById('game_frame');
			if (game_frame) {
				game_frame.style.width = '950px';
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
