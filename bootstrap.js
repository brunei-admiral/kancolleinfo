Components.utils.import("resource://gre/modules/Services.jsm");

function load(script, root){
  const IOService = Components.classes['@mozilla.org/network/io-service;1']
      .getService(Components.interfaces.nsIIOService);

  if (root.isDirectory()) {
    var path = root.clone();
    root.append("content");
    root.append(script);
    script = IOService.newFileURI(root).spec;
  }
  else {
    script = 'jar:' + IOService.newFileURI(root).spec + '!/content/' + script;
    script = IOService.newURI(script, null, null).spec;
  }

  Components.classes['@mozilla.org/moz/jssubscript-loader;1']
      .getService(Components.interfaces.mozIJSSubScriptLoader)
          .loadSubScript(script, this, "UTF-8");
}

var WindowListener = {
  onOpenWindow: function(xulWindow){
    log("new opened xulWindow: title = " + xulWindow.title);
    var window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
    function loadListener(){
      window.removeEventListener('load', loadListener);
      if (window.document.documentElement.getAttribute('windowtype') == 'navigator:browser') {
        loadOverlay(window);
      }
    };
    window.addEventListener('load', loadListener);
  },

  onCloseWindow: function(xulWindow){
  },

  onWindowTitleChange: function(xulWindow, newTitle){
  },
};

function install(data, reason){
}

function uninstall(data, reason){
}

function startup(data, reason){
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  load("overlay.js", data.installPath);
  kcif.init();

  var windows = Services.wm.getEnumerator('navigator:browser');
  while (windows.hasMoreElements()) {
    var xulWindow = windows.getNext()
    log("use existent xulWindow: title = ", xulWindow.title);
    loadOverlay(xulWindow.QueryInterface(Components.interfaces.nsIDOMWindow));
  }
  Services.wm.addListener(WindowListener);
}

function shutdown(data, reason){
  var windows = Services.wm.getEnumerator('navigator:browser');
  while (windows.hasMoreElements()) {
    unloadOverlay(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
  }
  Services.wm.removeListener(WindowListener);
  kcif.destroy();
}

var listener = null;
function loadOverlay(window){
  kcif.mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsIDocShellTreeItem).rootTreeItem.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
  kcif.window = window.content;
  window.document.addEventListener("DOMContentLoaded", kcif.onLoad, false);
}

function unloadOverlay(window){
  window.document.removeEventListener("DOMContentLoaded", kcif.onLoad, false);
  kcif.unload();
}
