// Protected namespaces.
var util = {};

/**
 * Sets up a future poll for the user's document list.
 */
util.scheduleRequest = function() {
  var exponent = Math.pow(2, requestFailureCount);
  var delay = Math.min(bgPage.pollIntervalMin * exponent,
                       pollIntervalMax);
  delay = Math.round(delay);

  if (bgPage.oauth.hasToken()) {
    var req = bgPage.window.setTimeout(function() {
      gdocs.getDocumentList(); //Get the first folder, no callback.
      util.scheduleRequest();
    }, delay);
    bgPage.requests.push(req);
  }
};

/**
 * Urlencodes a JSON object of key/value query parameters.
 * @param {Object} parameters Key value pairs representing URL parameters.
 * @return {string} query parameters concatenated together.
 */
util.stringify = function(parameters) {
  var params = [];
  for(var p in parameters) {
    params.push(encodeURIComponent(p) + '=' +
                encodeURIComponent(parameters[p]));
  }
  return params.join('&');
};

/**
 * Creates a JSON object of key/value pairs
 * @param {string} paramStr A string of Url query parmeters.
 *    For example: max-results=5&startindex=2&showfolders=true
 * @return {Object} The query parameters as key/value pairs.
 */
util.unstringify = function(paramStr) {
  var parts = paramStr.split('&');

  var params = {};
  for (var i = 0, pair; pair = parts[i]; ++i) {
    var param = pair.split('=');
    params[decodeURIComponent(param[0])] = decodeURIComponent(param[1]);
  }
  return params;
};

/**
 * Utility for displaying a message to the user.
 * @param {string} msg The message.
 */
util.displayMsg = function(msg) {
  $('#butter').removeClass('error').text(msg).show();
};

/**
 * Utility for removing any messages currently showing to the user.
 */
util.hideMsg = function() {
  $('#butter').fadeOut(1500);
};

/**
 * Utility for displaying an error to the user.
 * @param {string} msg The message.
 */
util.displayError = function(msg) {
  util.displayMsg(msg);
  $('#butter').addClass('error');
};

/**
 * A generic error handler for failed XHR requests.
 * @param {XMLHttpRequest} xhr The xhr request that failed.
 * @param {string} textStatus The server's returned status.
 */
gdocs.handleError = function(xhr, textStatus) {
  //util.hideMsg();
  if(xhr.status != 0){
  	util.displayError(xhr.status, ' ', xhr.statusText);
  } else {
  	util.displayError("No internet connection.");
  }
  ++requestFailureCount;
};