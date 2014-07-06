//In the app's launch page:
var bgPage; 
chrome.runtime.getBackgroundPage(function(ref){
	bgPage = ref;
}); 

//Run toggleAuth when the constructor is called to kick everything off.
//stored in backgroundpage for persistance and universal access within the app.
//Inital function fired on page load.
window.onload = function(){
	bgPage.toggleAuth(true,function(){
		startup();
	});
};


var startup = function(){
	console.log('startup');
}