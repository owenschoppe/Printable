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


chrome.app.runtime.onLaunched.addListener(function() {
		chrome.app.window.create('view.html', {
		    'bounds': {
		      'width': 1200,
		      'height': 900
		    }
	  	});
});
