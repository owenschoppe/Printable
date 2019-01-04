var DOCLIST_SCOPE = 'https://docs.google.com/feeds';
var DOCLIST_FEED = DOCLIST_SCOPE + '/default/private/full/';
var docs = []; //In memory cache for the user's entire doclist.
var row = []; //In memory cache for each row of the sheet returned.
var cat = []; //In memory cache for entire folder list
var refreshRate = 300; // 5 min default.
var pollIntervalMin = 1000 * refreshRate;
var requests = [];
var docName; //For passing the document name to the export page.
var docKey;
var blacklistedExtension = null;
	
var SPREAD_SCOPE = 'https://spreadsheets.google.com/feeds';

var FULL_SCOPE = DOCLIST_SCOPE + ' ' + SPREAD_SCOPE;

// Array to hold callback functions
var callbacks = []; 

//Variable that is only true in the first start after an update. //Set to false if there is no need to update the headers.
var firstRun = false; 

//defines a common and persistant object for handling the accessToken and other functions. avoids having to invoke angular in the background.
var gDocsUtil = new GDocs();

toggleAuth = function(interactive, callback) {
console.log('gdocs accessToken',gDocsUtil.accessToken, chrome.identity);
  gDocsUtil.auth(interactive, function() { //was failing to get the refreshed accessToken. Now we just call chrome.auth every time.
    callback && callback();
  });
}

chrome.app.runtime.onLaunched.addListener(function() {
		chrome.storage.local.get('orientation', function(items){
			launchPrintable(items['orientation']);	
		});
});

launchPrintable = function(orientation){
	if(orientation == 'portrait'){
		createWindow('printable',1200,1110);
	} else {	//default window size.
		createWindow('printable',1440,900);
	}
}

createWindow = function(id,w,h){
	var maxH = Math.round(window.screen.availHeight*0.9);
	var maxW = Math.round(window.screen.availWidth*0.9);
	w = w < maxW ? w : maxW;
	h = h < maxH ? h : maxH;
	chrome.app.window.create('view.html', {
	    'id': id,
	    'innerBounds': {
	    	'width': w,
	    	'height': h
	    }
  	});
}

resizeWindow = function(id,w,h){
	var maxH = Math.round(window.screen.availHeight*0.9);
	var maxW = Math.round(window.screen.availWidth*0.9);
	w = w < maxW ? w : maxW;
	h = h < maxH ? h : maxH;
    chrome.app.window.get(id).resizeTo(w, h);
}

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