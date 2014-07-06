var blacklistedExtension = null;

//defines a common and persistant object for handling the accessToken and other functions. avoids having to invoke angular in the background.
var gDocsUtil = new GDocs();

toggleAuth = function(interactive, callback) {
console.log('gdocs accessToken',gDocsUtil.accessToken, chrome.identity);
//if (!gdocs.accessToken) {
  gDocsUtil.auth(interactive, function() { //was failing to get the refreshed accessToken. Now we just call chrome.auth every time.
    //$scope.fetchFolder(false);
    //$scope.fetchDocs(false);
    callback();
  });
/*} else {
  //gdocs.revokeAuthToken(function() {});
  //this.clearDocs();
  callback();
}*/
}

launchPrintable = function(){
	chrome.app.window.create('view.html', {
		    'bounds': {
		      'width': 1200,
		      'height': 900
		    }
	  	});
}

chrome.app.runtime.onLaunched.addListener(function() {
		launchPrintable();
});

//Listener for communication from Citable.
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
	console.log('request: ',request,request.name);
	if (sender.id == blacklistedExtension) {
	  return;  // don't allow this extension access
	} else if (request.printDoc) {
		docKey = request.key;
		//localStorage.defaultDoc = docKey;
		//localStorage.defaultDocName = request.name;
		////gdocs.printDocument();
		//gdocs.printDocumentPage();
		launchPrintable();
		sendResponse({success: true});
	} else if (request.exportDoc) {
		docKey = request.key;
		//localStorage.defaultDoc = docKey;
		//localStorage.defaultDocName = request.name;
		////gdocs.exportDocument();
		//gdocs.exportDocumentPage();
		sendResponse({success: true});
	}
	console.log('docKey ', docKey);
});