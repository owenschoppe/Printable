var order = ['summary','title','author','url','tags','destination','doc_title','addNote']; //the tab order for select fields
var folders = ['Citable_Documents','Citation_Tool_Documents'];

var bgPage = chrome.extension.getBackgroundPage();
var pollIntervalMax = 1000 * 60 * 60;  // 1 hour
var requestFailureCount = 0;  // used for exponential backoff
var requestTimeout = 1000 * 2;  // 5 seconds

String.prototype.truncate = function(){
    var strlength = 33;
    var re = this.match(/^.{0,33}[\S]*/); //Update this value to reflect strlength.
    var l = re[0].length;
    re = re[0].replace(/\s$/,'');
    if(l < this.length)
        re = re + "&hellip;";
	else re = this.substr(0,strlength)+(this.length>strlength+1?"&hellip;":'');
    return re;
};

/**
 * Returns the correct atom link corresponding to the 'rel' value passed in.
 * @param {Array<Object>} links A list of atom link objects.
 * @param {string} rel The rel value of the link to return. For example: 'next'.
 * @return {string|null} The appropriate link for the 'rel' passed in, or null
 *     if one is not found.
 */
gdocs.getLink = function(links, rel) {
  for (var i = 0, link; link = links[i]; ++i) {
    if (link.rel === rel) {
      return link;
    }
  }
  return null;
};

/**
 * Returns the correct atom category corresponding to the scheme/term passed in.
 * @param {Array<Object>} categories A list of atom category objects.
 * @param {string} scheme The category's scheme to look up.
 * @param {opt_term?} An optional term value for the category to look up.
 * @return {string|null} The appropriate category, or null if one is not found.
 */
gdocs.getCategory = function(categories, scheme, opt_term) {
  for (var i = 0, cat; cat = categories[i]; ++i) {
    if (opt_term) {
      if (cat.scheme === scheme && opt_term === cat.term) {
        return cat;
      }
    } else if (cat.scheme === scheme) {
      return cat;
    }
  }
  return null;
};

/*
 * Class to compartmentalize properties of a Google document.
 * @param {Object} entry A JSON representation of a DocList atom entry.
 * @constructor
 */
gdocs.GoogleDoc = function(entry) {
  this.entry = entry;
  this.title = entry.title.$t;
  this.resourceId = entry.gd$resourceId.$t;
  this.type = gdocs.getCategory(
    entry.category, 'http://schemas.google.com/g/2005#kind');
  this.starred = gdocs.getCategory(
    entry.category, 'http://schemas.google.com/g/2005/labels',
    'http://schemas.google.com/g/2005/labels#starred') ? true : false;
  this.link = {
    'alternate': gdocs.getLink(entry.link, 'alternate').href
  };
  this.contentSrc = entry.content.src;
};

//Row prototype object. 
//Added conditinals to all of the elements to prevent failure if a user deletes a header from the spreadsheet.
/*gdocs.Row = function(entry) {
  this.title = (entry.gsx$title ? entry.gsx$title.$t : '');
  this.url = (entry.gsx$url ? entry.gsx$url.$t : '');
  this.summary = (entry.gsx$summary ? entry.gsx$summary.$t : '');
  this.tags = (entry.gsx$tags ? entry.gsx$tags.$t : '');
  this.author = (entry.gsx$author ? entry.gsx$author.$t : '');
  this.date = (entry.gsx$date ? entry.gsx$date.$t : '');
};*/

gdocs.Category = function(entry) {
  this.entry = entry;
  this.resourceId = entry.gd$resourceId.$t;
};

gdocs.changeAction = function(aForm, aValue, aLabel){
	console.log('gdocs.changeAction',aForm, aValue, aLabel);
	//$('#output').html('');//Clear the output.
	document.getElementById('output').firstChild.addClassName('hidden');
	document.getElementById('elements').innerHTML = '';
	cols = [];
	$('#loading').removeClass('hidden');
	
	docKey = $('#destination').val().split(':')[1];
	console.log('docKey: ',docKey,aLabel);
	localStorage['defaultDoc'] = docKey;
	localStorage['defaultDocName'] = aLabel;
	setTimeout(function(){gdocs.printDocument(null, processRowsCallback)},0); //In printexport.js
	return;
}

gdocs.renderDocSelect = function(callback) {
console.log('gdocs.renderDocSelect');
	//util.displayMsg('Documents found!');
	util.hideMsg();
	//label="',bgPage.docs[0].title.truncate(),'"
	var html = [];
	if(bgPage.docs.length) {
		//html.push('<option selected value="',bgPage.docs[0].resourceId,'">',bgPage.docs[0].title.truncate(),'</option>'); //Have the first document be selected.
		var docKey;
		var selected;
		var found = false;
		for (var i = 0, doc; doc = bgPage.docs[i]; ++i) {
			docKey = doc.resourceId.slice(12);
			//selected = i==0?'selected':'';
			//Scans the doclist for a document key that matches the default doc.
			selected = docKey==localStorage['defaultDoc']?'selected':'';
			//If it is found, then 'found' is updated to true.
			found = selected=='selected'?true:found;
			html.push('<option ',selected,' value="',doc.resourceId,'">',doc.title.truncate(),'</option>');
		}
		console.log('found ',found);
		//Adds the non-Citable spreadsheet to the top of the list.
		if(found == false && localStorage['defaultDoc'] != undefined && localStorage['defaultDocName'] != undefined){
			//Adds the default doc to front of the array 'html' and makes it selected.
			html.unshift('<option selected value="spreadsheet:',localStorage['defaultDoc'],'">'+localStorage['defaultDocName'].truncate(),'</option>');
		}
		
		//On the first run after update, update all documents in the background.
		//Conditional on bgPage.docs.length to fire only after successfully retrieving doc list.
		if(bgPage.firstRun == true){ //Check for flag.
		console.log('bgPage.firstRun ',bgPage.firstRun);
		//bgPage.firstRun = false; //Moved to update callback to bgPage.updateDocumentCallback.
		bgPage.updateDocument(bgPage.updateDocumentCallback); //Intitiate update.
		}
		
	}
	console.log('Render selection', html);
	$('#selection').html('<select id="destination" class="Droid" name="destination">' + html.join('') + '</select>'); //<option value="new">Create New Document</option> //!!!This is the one major change from citable/popup.js gdocs.renderDocSelect must remain split.
	//gdocs.changeAction(this.form, null); //!!!
	//setTabOrder(order); //Resets the tab order to include this selection menu and the addNote button. //!!!
	
	//Edit: 7/22 to fix switch focus after typing.
	//switchFocus(order[0]); //On refresh switches focus to the summary field.
	
	document.querySelector('#destination').addEventListener('change', gdocs.onChangeHandler);
	
	console.log('callback');
	if(callback){ callback() };
}

gdocs.onChangeHandler = function(e) {
	gdocs.changeAction(this.form,this.value,$('select option:selected').html());
}

/**
 * Fetches the user's document list.
 * @param {string?} opt_url A url to query the doclist API with. If omitted,
 *     the main doclist feed uri is used.
 */
gdocs.getDocumentList = function(opt_url, callback) {
	console.log('gdocs.getDocumentList');
	//util.displayMsg('Fetching your docs..');
  
	var handleSuccess = function(response, xhr) {
		console.log('gdocs.getDocumentList handleSuccess', xhr);
		//util.displayMsg($('#butter').text() + '.');
		if (xhr.status != 200) {
			gdocs.handleError(xhr, response);
			callback(xhr.status); //Return the error to the calling function.
			return;
		} else {
			requestFailureCount = 0;
		}
		
		var data = JSON.parse(response);
		
		console.log('Doc list data. Should have entries. ', data);
		  
		if(data.feed.entry) {
			console.log('process feed');
			for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
				console.log(i);
				bgPage.docs.push(new gdocs.GoogleDoc(entry));
			}
			
			var nextLink = gdocs.getLink(data.feed.link, 'next');
			if (nextLink) {
				gdocs.getDocumentList(nextLink.href); // Fetch next page of results.
			} else {
				console.log("render doc list");
				gdocs.renderDocSelect(callback); //Pass callback to renderDocSelect, to callback directly from there.
			}
		} else {
			console.log("create new document");
			//Display the document name if there was a default document.
			if(localStorage['defaultDocName']!=undefined){
				$('#selection').text(localStorage['defaultDocName']);
			} else {
				//Show this error if there is no default and no docs in the folder. 
				util.displayMsg('No Citable Documents');
			}
			//util.hideMsg();
			/*gdocs.renderDocSelect(function() {
				gdocs.changeAction(this.form,'new');
			});*/ //Open the field to create a new doc after creating the new folder.
		}
		
		if(callback){ callback() }; //Callback with null.
	};
	
  var changeAction = function() {
		gdocs.changeAction(this.form,'new'); 
  };
  
  var url = opt_url || null; //Set the url if one was passed in.

  var params = {
    'headers': {
      'GData-Version': '3.0'
    },
    'parameters': {
	  'alt': 'json',
	  'showfolders': 'true'
	}
  };

  if (!url) {
	//If no url was passed in set the url to first folder in bgPage.cat.
    url = bgPage.DOCLIST_FEED + bgPage.cat[0].resourceId + '/contents';
    
  } else {
    //util.displayMsg($('#butter').text() + '.');

	bgPage.docs = []; // Clear document list. We're doing a refresh.

	/*params['parameters'] = {
      'alt': 'json',
      'showfolders': 'true'
    };*/

    var parts = url.split('?');
    if (parts.length > 1) {
      url = parts[0]; // Extract base URI. Params are passed in separately.
      params['parameters'] = util.unstringify(parts[1]);
    }
  }

  bgPage.oauth.sendSignedRequest(url, handleSuccess, params);
};

gdocs.constructMoveManyBody_ = function(docs) { //pass in the docs list
console.log('gdocs.constructMoveManyBody');
  var atom = ["<?xml version='1.0' encoding='UTF-8'?>"]
  for( var i, docId; docId = docs[i].resourceId; i++){
	  atom += ["<entry xmlns='http://www.w3.org/2005/Atom'>",
	  "<id>https://docs.google.com/feeds/default/private/full/", docId ,"</id>",
	  "</entry>"].join('');
	}
  return atom;
};

gdocs.constructMoveBody_ = function(docId) {
  var atom = ["<?xml version='1.0' encoding='UTF-8'?>",
  		      "<entry xmlns='http://www.w3.org/2005/Atom'>",
              "<id>https://docs.google.com/feeds/default/private/full/", docId ,"</id>",
              "</entry>"].join('');
  return atom;
};

///////////////////////////////////////////////////////
gdocs.moveDoc = function(callback, docId) {
console.log('gdocs.moveDoc');
	
  //util.displayMsg('Moving to folder...');
  
  var i = 0;
  
  var handleSuccess = function(response, xhr) {
		console.log('moveDoc handleSuccess: ', xhr);
		
		if (xhr.status != 201) {
			console.log('ERROR', xhr);
			gdocs.handleError(xhr, response);
			if (xhr.status == 404) {
				gdocs.createFolder(0,move);
			} else {
				//Try again?
				return;
			}
		} else {
			//util.displayMsg('Folder added!');
			util.hideMsg();
			requestFailureCount = 0;
			++i; //Increment to the next document.
			if(!docId && i < bgPage.docs.length) { //Don't move th next if we have an override id, otherwise, move next.
				move(); //Call move() to move the next doc.
			} else { 
				console.log('gdocs.moveDoc handleSuccess -> CALLBACK');
				callback(); //End of the array, callback.
			}
		}
		
  };
  
	var move = function() {
		url = bgPage.DOCLIST_FEED + bgPage.cat[0].resourceId + '/contents';
		
		id = docId ? docId : bgPage.docs[i].resourceId; //If an override id is provided then use that, otherwise move all documents in doclist.

		var params = {
		'method': 'POST',
		'headers': {
		  'GData-Version': '3.0',
		  'Content-Type': 'application/atom+xml',
			},
			'parameters': {'alt': 'json'},
			'body': gdocs.constructMoveBody_(id)
			};
		
		//Sends the params to the background page to get delivered to gDocs.
		bgPage.oauth.sendSignedRequest(url, handleSuccess, params);
		console.log('Move to:', url, params);
	};
	
	if(bgPage.docs.length) { move() }; //Call move() for the first time, if there are docs to move.

}


gdocs.constructFolderBody_ = function(title) {
  var atom = ["<?xml version='1.0' encoding='UTF-8'?>",
  		      "<entry xmlns='http://www.w3.org/2005/Atom'>",
              "<category scheme='http://schemas.google.com/g/2005#kind' term='http://schemas.google.com/docs/2007#folder' />",
              "<title type='text'>Citable_Documents</title>",
              "</entry>"].join('');
  return atom;
};

gdocs.createFolder = function(title, callback) {
console.log('gdocs.createFolder ', title);
  
	var handleSuccess = function(response, xhr) {
		console.log('category returned: ', xhr);
		
		if (xhr.status != 201) {
			console.log('ERROR', xhr);
			gdocs.handleError(xhr, response);
			return;
		} else {
			//util.displayMsg('Folder added!');
			//util.hideMsg();
			requestFailureCount = 0;
		}
		
		bgPage.cat.splice(0, bgPage.cat.length, new gdocs.Category(JSON.parse(response).entry)); //Resets the cat list to have only the new folder id.
		var parts = bgPage.cat[0].resourceId.split(':');
		var resourceId = parts[1];
		console.log('category: ', resourceId, ' : ', bgPage.cat[0]);
				
		callback(resourceId);
		
	}; 
  	
  //util.displayMsg('Creating folder...');
  console.log('Creating folder...');
  
  var params = {
    'method': 'POST',
    'headers': {
      'GData-Version': '3.0',
      'Content-Type': 'application/atom+xml',
    },
    'parameters': {'alt': 'json'},
    'body': gdocs.constructFolderBody_(folders[title])
  };

  //Sends the params to the background page to get delivered to gDocs.
  bgPage.oauth.sendSignedRequest(bgPage.DOCLIST_FEED, handleSuccess, params);
  console.log('FOLDER:', bgPage.DOCLIST_FEED, params);
};


////////////////////////////////////////////////////////////
//Searches for the specific category passed in through title
////////////////////////////////////////////////////////////

gdocs.getFolder = function(title, callback) {
console.log('gdocs.getFolder');

  var params = {
    'headers': {
      'GData-Version': '3.0'
    }
  };
	
	var handleSuccess = function(response, xhr) {
		console.log('getFolder handleSuccess: ', xhr);
		
		if (xhr.status != 200) {
			gdocs.handleError(xhr, response);
			return;
		} else {
			requestFailureCount = 0;
		}
		
		var data = JSON.parse(response);
		
		console.log(data);
		
		if(data.feed.entry) {
			console.log('parse folders');
			for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
				bgPage.cat.push(new gdocs.Category(entry));
			}
			console.log('folder Id: ', bgPage.cat[bgPage.cat.length-1].resourceId);
			callback(bgPage.cat[bgPage.cat.length-1].resourceId);
  		} else {
  			callback(null);
  		}
  		util.hideMsg();
	}

    //util.displayMsg('Fetching your docs');

    url = bgPage.DOCLIST_FEED; //+ '?title=%22PR+Citation_Tool_Documents%22'; //retrieves the citations folder
    params['parameters'] = {
      'alt': 'json',
      'title': folders[title],
      'showfolders': 'true',
      'title-exact': 'true'
    };
    
  bgPage.oauth.sendSignedRequest(url, handleSuccess, params);
};

/////////////////////////////////////////////////////////////

gdocs.updateFolders = function(callback) {
	console.log('gdocs.updateFolders');
	
	var createFolderCallback = function(id) {
		console.log('gdocs.updateFolders createFolderCallback', id);
		gdocs.getFolder(1, getFolderCallback); //Check for the old folder.
	}
	
	var getFolderCallback = function(id) {
		console.log('gdocs.updateFolders getFolderCallback', id);
		if( id == null ){
			url = bgPage.DOCLIST_FEED + bgPage.cat[0].resourceId + '/contents';
			gdocs.getDocumentList(url, gdocs.start.getDocumentListCallback); //??? Fix the callback
		} else {
			url = bgPage.DOCLIST_FEED + id + '/contents'; //id should be stored in bgPage.cat[1] for reference. Consider moving this to getDocumentList() and pass in the folder[] interger.
			gdocs.getDocumentList(url, getDocListCallback);
		}
	}
	
	var getDocListCallback = function(e) {
		console.log('gdocs.updateFolders getDocListCallback', e);
		gdocs.moveDoc(moveDocCallback); //If no error is returned, then move the docs.
	}
	
	var moveDocCallback = function() {
		console.log('gdocs.updateFolders moveDocCallback');
		bgPage.docs = []; //Clear docs list.
		callback();
	}

	gdocs.createFolder(0,createFolderCallback);
}

gdocs.start = function(callback) { //!!! Added callback
	console.log('gdocs.start', callback);
	
	//switchFocus(order[0]); //Switches focus to the summary field.

	var getFolderCallback = function(id) {
		console.log('gdocs.start getFolderCallback ', id);
		//$('#loading').toggleClass('hidden',false);
		if ( id == null ) {
			gdocs.updateFolders(updateFoldersCallback);
		} else {
			url = bgPage.DOCLIST_FEED + id + '/contents';
			gdocs.getDocumentList(url, getDocumentListCallback);
		}
	}
	
	var getDocumentListCallback = function(e) {
		//console.log('gdocs.start getDocumentListCallback ', e);
		if(e) { gdocs.getFolder(0, getFolderCallback); } //If the getDocumentList function can't find the documents, then the id is for a folder that doesn't exist and we need to get the new id.
		//End of Start.
		if(callback) callback(); //!!! Added callback()
	}
	
	var updateFoldersCallback = function() {
		console.log('gdocs.start updateFoldersCallback');
		gdocs.getDocumentList(); //Get the first folder, no callback.
	}
	
	
	//TODO: Do we need to check for the new folder every time, or can we speed this up?
	/*if (bgPage.cat[0]) {
		console.log('bgPage.cat[0] has id');
		url = bgPage.DOCLIST_FEED + bgPage.cat[0].resourceId + '/contents';
		gdocs.getDocumentList(url, getDocumentListCallback); 
	} else {*/
		console.log('bgPage.cat[0] does not have id');
		gdocs.getFolder(0, getFolderCallback);
	//}
}