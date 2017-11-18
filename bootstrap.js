Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/Timer.jsm");

function load(script, root){
  const IOService = Components.classes['@mozilla.org/network/io-service;1']
      .getService(Components.interfaces.nsIIOService);

  if (root.isDirectory()) {
    let path = root.clone();
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
    let window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
    function loadListener(){
      window.removeEventListener('load', loadListener);
      if (window.document.documentElement.getAttribute('windowtype') == 'navigator:browser') {
        loadOverlay(xulWindow);
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
  //Services.console.logStringMessage("[kcif] install");
}

function uninstall(data, reason){
  //Services.console.logStringMessage("[kcif] uninstall");
}

function startup(data, reason){
  //Services.console.logStringMessage("[kcif] startup");
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  load("overlay.js", data.installPath);
  kcif.init();

  let windows = Services.wm.getEnumerator('navigator:browser');
  while (windows.hasMoreElements()) {
    let xulWindow = windows.getNext()
    loadOverlay(xulWindow);
  }
  Services.wm.addListener(WindowListener);
}

function shutdown(data, reason){
  //Services.console.logStringMessage("[kcif] shutdown");
  let windows = Services.wm.getEnumerator('navigator:browser');
  while (windows.hasMoreElements()) {
    unloadOverlay(windows.getNext());
  }
  Services.wm.removeListener(WindowListener);
  kcif.destroy();
}

var listener = null;
function loadOverlay(xulWindow){
  kcif.mainWindow = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsIDocShellTreeItem).rootTreeItem.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
  xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow).document.addEventListener("DOMContentLoaded", kcif.onLoad, false);

  let browser = xulWindow.gBrowser;
  for (let i = 0; i < browser.browsers.length; i++) {
    let tab = browser.getBrowserAtIndex(i);
    //log("loadOverlay: " + tab.contentDocument.URL);
    tab.contentDocument.addEventListener("DOMContentLoaded", kcif.onLoad, false);
    kcif.onLoad({originalTarget: tab.contentDocument});
    let frames = tab.contentWindow.frames;
    for (let j = 0; j < frames.length; j++) {
      frames[j].document.addEventListener("DOMContentLoaded", kcif.onLoad, false);
      kcif.onLoad({originalTarget: frames[j].document});
    }
  }
}

function unloadOverlay(xulWindow){
  xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow).document.RemoveEventListener("DOMContentLoaded", kcif.onLoad, false);

  let browser = xulWindow.gBrowser;
  for (let i = 0; i < browser.browsers.length; i++) {
    let tab = browser.getBrowserAtIndex(i);
    //log("unloadOverlay: " + tab.contentDocument.URL);
    tab.contentDocument.removeEventListener("DOMContentLoaded", kcif.onLoad, false);
    let frames = tab.contentWindow.frames;
    for (let j = 0; j < frames.length; j++) {
      frames[j].document.removeEventListener("DOMContentLoaded", kcif.onLoad, false);
    }
  }
  kcif.unload();
}
