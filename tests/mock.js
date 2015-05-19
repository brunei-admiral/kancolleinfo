var XPCOMUtils = {
  generateQI: function(ary){
  }
};

var Services = {
  console: console,
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

const Ci = {
  nsISupportsString: null,
};

function Audio(){
  obj = {
    load: function(){
    },
    pause: function(){
    },
  };
  return obj;
}
