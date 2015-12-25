var XPCOMUtils = {
  generateQI: function(ary){
  }
};

var Services = {
  console: console,
  obs: {
    addObserver: function(){},
  },
}

console.logStringMessage = console.log;

Array.join = function(ary, sep){
  var s = "";
  for (var i = 0; i < ary.length; i++) {
    if (i > 0) {
      s += sep;
    }
    s += ary[i];
  }
  return s;
};

Date.prototype.toLocaleFormat = function(format){
  return format;
};

String.prototype.startsWith = function(str){
  return this.indexOf(str) == 0;
};

String.prototype.endsWith = function(str){
  return this.lastIndexOf(str) == this.length - str.length;
};

var dummyCc = {
  getService: function(){
    var obj = {
      newURI: function(){},
      getCodebasePrincipal: function(){},
      getLocalStorageForPrincipal: function(){},
    };
    return obj;
  },
}

const Cc = {
  "@mozilla.org/network/io-service;1": dummyCc,
  "@mozilla.org/scriptsecuritymanager;1": dummyCc,
  "@mozilla.org/dom/storagemanager;1": dummyCc,
}

const Ci = {
  nsIDOMStorageManager: null,
  nsIIOService: null,
  nsIScriptSecuirtyManager: null,
  nsISupportsString: null,
};

function Audio(){
  var obj = {
    load: function(){
    },
    pause: function(){
    },
  };
  return obj;
}

function sendSyncMessage(){
  return [null];
}
