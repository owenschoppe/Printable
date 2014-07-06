var DOCLIST_SCOPE = 'https://docs.google.com/feeds';
var DOCLIST_FEED = DOCLIST_SCOPE + '/default/private/full/';
var docs = []; //In memory cache for the user's entire doclist.
var row = []; //In memory cache for each row of the sheet returned.
var cat = []; //In memory cache for entire folder list
var refreshRate = localStorage.refreshRate || 300; // 5 min default.
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
//var firstRun = true; 

//defines a common and persistant object for handling the accessToken and other functions. avoids having to invoke angular in the background.
var gDocsUtil = new GDocs();

toggleAuth = function(interactive, callback) {
console.log('gdocs accessToken',gDocsUtil.accessToken);
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

/*var oauth = ChromeExOAuth.initBackgroundPage({
'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
'consumer_key': '1034066493115.apps.googleusercontent.com',
'consumer_secret': 'ZYDYGWh1g71m2-w1iA0-VxSC',
'scope': FULL_SCOPE,
'app_name': 'Citable'
});*/
      
//Get authorization on first load of bgPage. //Moved to view.js since we have a docList now.
//oauth.authorize(function() {});

/////////////////////////////////////////////////////////
 // This function is called onload in the popup code
function getPageInfo(callback) 
{ 
	console.log('getPageInfo');
	// Add the callback to the queue
	callbacks = [];
	callbacks.push(callback); 
	// Inject the content script into the current page        
	//chrome.tabs.executeScript(null, { file: "content_script.js" }); 
	chrome.tabs.executeScript(null, { file: "jquery-1.7.2.min.js" }, function() {
		chrome.tabs.executeScript(null, { file: "content_script.js" });
	});
} 
    
//Listener for communication from other extension pages.
chrome.extension.onConnect.addListener(function(port) {
  var tab = port.sender.tab;

  // This will get called by the content script we execute in
  // the tab as a result of the user pressing the browser action.
  port.onMessage.addListener(function(info) {
	console.log('onMessage Listener ', info.values);
	console.log('tab.url ', tab.url);
	docKey = tab.url.split("=")[1].split('#')[0].split('&')[0];		
	localStorage.defaultDocName = tab.title;
	localStorage.defaultDoc = docKey;
	if(info.values == 0 && info.message == "myCustomEvent"){
		//Need to update functions to grab the doc id from the tab url and put it in the bgpage variables.
			console.log('Try printing');
			//gdocs.printDocument();
			gdocs.printDocumentPage();
	} else if(info.values == 1 && info.message == "myCustomEvent") {
			console.log('Try exporting');
			//gdocs.exportDocument();
			gdocs.exportDocumentPage();
	}
  });
});

//Listener for communication from Citable.
chrome.extension.onRequestExternal.addListener(
  function(request, sender, sendResponse) {
	console.log('request: ',request,request.name);
	if (sender.id == blacklistedExtension) {
	  return;  // don't allow this extension access
	} else if (request.printDoc) {
		docKey = request.key;
		localStorage.defaultDoc = docKey;
		localStorage.defaultDocName = request.name;
		//gdocs.printDocument();
		gdocs.printDocumentPage();
		sendResponse({success: true});
	} else if (request.exportDoc) {
		docKey = request.key;
		localStorage.defaultDoc = docKey;
		localStorage.defaultDocName = request.name;
		//gdocs.exportDocument();
		gdocs.exportDocumentPage();
		sendResponse({success: true});
	}
	console.log('docKey ', docKey);
});

/////////////////////////////////////////////////////////
function setIcon(opt_badgeObj) {
	if (opt_badgeObj) {
	  var badgeOpts = {};
	  if (opt_badgeObj && opt_badgeObj.text !== undefined) {
		badgeOpts['text'] = opt_badgeObj.text;
	  }
	  if (opt_badgeObj && opt_badgeObj.tabId) {
		badgeOpts['tabId'] = opt_badgeObj.tabId;
	  }
	  chrome.browserAction.setBadgeText(badgeOpts);
	}
}

function clearPendingRequests() {
	for (var i = 0, req; req = requests[i]; ++i) {
	  window.clearTimeout(req);
	}
	requests = [];
};

/*function logout() {
	docs = [];
	setIcon({'text': ''});
	oauth.clearTokens();
	clearPendingRequests();
};*/

