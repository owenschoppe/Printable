var row = []; //In memory cache for each row of the sheet returned.

var gdocs = {};

/////////////////////////////////////////////////////////
gdocs.printDocumentPage = function(callback) 
{
	console.log('printDocumentPage');
	//chrome.tabs.create({ 'url' : 'view.html?key='+docKey});
	chrome.tabs.create({ 'url' : 'view.html'});
	if(callback) callback();
};
/////////////////////////////////////////////////////////
gdocs.exportDocumentPage = function(callback) 
{
	console.log('exportDocument');
	//chrome.tabs.create({ 'url' : 'export.html?key='+docKey});
	chrome.tabs.create({ 'url' : 'export.html'});
	if(callback) callback();
};
/////////////////////////////////////////////////////////
//Dynamic row prototype that parses all user defined columns.
gdocs.Row = function(entry) {
	for (var key in entry) {
	  parts = key.toString().split('$');
	  if(parts[0] == 'gsx'){  
		  if (entry.hasOwnProperty(key)) {
			this[parts[1]] = entry[key].$t;
		  }
	  }
	}
};
/////////////////////////////////////////////////////////

gdocs.processDocContent = function(response, xhr, callback) {
	console.log('rows returned: ', xhr);
  
  	row = [];
  
	if (xhr.status != 200) {
//TODO: Add an error message display.		
		//gdocs.handleError(xhr, response);
		return;
	} else {
		requestFailureCount = 0;
	}
	
	var data = JSON.parse(response);
	console.log('row data: ',data,Boolean(data.feed.entry));
	if(data.feed.entry) {
		for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
			//console.log(i);
			row.push(new gdocs.Row(entry));
			//console.log(entry);
		}
		//console.log('rows: ', row);
		if(callback) callback();	
	} else {
		console.log('No entries');
		util.displayError('Invalid file.');
		util.hideMsg();
	}
};


////////////////////////////////////////////////////
gdocs.printDocument = function(destination, callback) {
	if(destination == 'new'){ return; }
	//var worksheetId = 'od6';
    //var url = SPREAD_SCOPE +'/list/'+docKey+'/'+worksheetId+'/private/full'; //good

    	var handleSuccess = function(response, xhr){
    		gdocs.processDocContent(response,xhr,callback );
    	}

      var config = {
        params: {
            'alt': 'json'
        },
        headers: {
          'Authorization': 'Bearer ' + gDocsUtil.accessToken,
          'GData-Version': '3.0',
        }
      };

      var worksheetId = 'default';

      var url = SPREAD_SCOPE +'/list/'+docKey+'/'+worksheetId+'/private/full?'+util.stringify(config.params);
      
      gDocsUtil.makeRequest('GET', url, handleSuccess, null, config.headers);

    //bgPage.oauth.sendSignedRequest(url, function(response, xhr){gdocs.processDocContent(response,xhr,callback )}, params);
};
/////////////////////////////////////////////////////////

gdocs.exportDocument = function(destination, callback){
	if(destination == 'new'){ return; }
	//Duplicate the print request to get the updated rows.
	//For now just run print first.
	console.log('exportDocument ', destination);

//TODO: Pass in docName.	
	//docName = $("select option:selected").text();
	//docName = docs[$("select option").index($("select option:selected"))-1].title;
	//console.log('docName: ',docName);
	
	var worksheetId = 'od6';
    var url = SPREAD_SCOPE +'/list/'+docKey+'/'+worksheetId+'/private/full'; //good
    
    var params = {
    'headers': {
      'GData-Version': '3.0'
    },
   'parameters': {
      'alt': 'json',
    }
    };
	bgPage.oauth.sendSignedRequest(url, function(response, xhr){gdocs.processDocContent(response,xhr,callback )}, params);
}