var XPCOMUtils = {
  generateQI: function(ary){
  }
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
