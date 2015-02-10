/*

webcompat-site-tester app

*/


require('./lib/WMLCheck.js').checkURL('http://127.0.0.1:8888/').then(function(testresult){
    console.log(testresult);
});

/*
var bzurl = 'https://bugzilla.mozilla.org/buglist.cgi?bug_id=635121,880439,1073463,1121275,1012202,1095359,571755,975929,1068831,463639,1111375,1043592,679428';
var bugdata = require('./lib/BugdataExtractor.js').extractFromURL(bzurl).then(function (data) {
    console.log(data);
});
*/