phantom.injectJs('data/sitedata.js');

/*
So.. I want an "experimental" mode where the script is given a URL and just
runs all the helper methods and returns the results. As well as (naturally) keeping the old mode
for regression testing.
*/

/*
page.evaluate returnerar null??
rydd opp og separer "loop over tester"-kode og "kjør denne testen"-kode

1: "dumb down" her. om is_testing, returner 500 feil på kommando
2: legg til "req id" i protokollen?
3: implementer "poll test result" for å unngå sync-krav og laaange kommando-ventinger?
 Kommunikasjonsmønsteret blir da:
 1) "Test boss" sender "{type:init,url:..}". Evt {type:init, bug:.., testdata:{}}? Server vil svare {status:ok, req_id:..} (evt. error 500 om travel)
 2) "Test boss" sender 1 eller fl "{type:poll, req_id:..}"
 3) Poll vil returnere resultat når dette er klart, boss kan kjøre neste test
 4) Boss kan kommandere/polle mange maskiner samtidig

*/


var date = new Date();
var outfile = 'results-'+date.getFullYear()+'-'+leadZ(date.getMonth()+1)+'-'+leadZ(date.getDate())+'.csv';
var fs = require('fs');
var results=[];
var uadata = {}
uadata = JSON.parse(fs.read('data/uadata.json'));

var mode = 'regression';
var ua, consoleMessages = [];
var page = createPage();
var httpResources=[];
var testQueue = [];
var testsInProgress = false;
if(phantom.args.length > 0){
    if(phantom.args.length > 1)console.log('Will run tests for input '+phantom.args)
    testQueue = phantom.args.slice(0); // we can pass in a bug number on the command line to run that test only..
}
var testHelperCode=fs.read('lib/stdTests.js');
var bugIdx=-1, currentTest=0, bug;
var bugs = Object.keys(bugdata);
// temporary hack to start from given bug..
var startAtBugID = null; //"971576";
if(startAtBugID && ! testQueue.length){
    bugIdx = bugs.indexOf(startAtBugID)-1;
}
var jobFallbackTimeout;
function jobTime(doJob, delay, arg){
    //console.log('scheduling ' + doJob.name + ' in ' + delay + 'ms')
    delay = delay || 500;
    clearTimeout(jobFallbackTimeout);
    jobFallbackTimeout = setTimeout(doJob, delay, arg);
}

/* This method tries to find regression testing data relevant to input, whether input is a bug number or URL */
function bugDataLookup(input){
    if(/^\d+$/.test(input)){ // bug number mode
        if (input in bugdata) {
            return bugdata[input];
        }else{
            throw 'bug data given as input, but no known regression data in sitedata.js'
        }
    }else if(typeof input === 'string'){ // URL mode?
        // Is it useful to pull out regression testing data?
        // Or is this just blurring the line between "regression" and "discovery" testing?
        // TODO: decide

    }
    return null;
}

function initTest(input, reportResultsCallback){
    if(testsInProgress){
        testQueue.push(input);
    }else{
        var data = bugDataLookup(input);
        loadSite(input, data, reportResultsCallback);
    }
}

/* This is where we get the job started if we have command line arguments
TODO: should this script even accept command line arguments?
*/
jobTime(function(){
    if(testQueue.length){
        initTest(testQueue.shift(), finalizeTest);
    }
}, 100);


function loadSite(bugnumberOrUrl, data, reportResultsCallback){
    mode = /^\d+$/.test(bugnumberOrUrl) ? 'regression' : 'exploration';
    if (mode === 'regression' && typeof(data) !== 'object') {
        throw 'Expected data argument to be object with regression testing information, not ' + data;
    }else if(mode === 'exploration'){
        data = {
            url: bugnumberOrUrl,
            testType: 'exploration'
        }
    }
    testsInProgress = true;
    consoleMessages = []; // per-site, clear them before loading the next one
    httpResources = []; // also per-site
    jobTime(function(){
        console.log('TIMEOUT! for '+bug);
        if (page.url.indexOf(data.url)>-1) { // we're not done loading, but let's try to run those tests anyway..
            runTestStep();
        }else{
            reportResultsCallback(data, bugnumberOrUrl, 'TIMEOUT - page did not load');
        }
    }, 60000); // backup timeout in case we get stuck at some point..
    console.log('Now opening '+data.url)
    page.open(data.url, function (status) {
        if(status == 'success'){
            //console.log('success for '+page.url);
            if(bug && data && data.testType === 'mixed-content-blocking'){
                // let's check this test result in onLoadFinished for the main URL to make sure we catch late-loading HTTP resources
            }else{
                injectJSIntoPage(page, testHelperCode);
                jobTime(runTestStep, 100, reportResultsCallback);
            }
        }else{
            console.log(page.url)
        }
         /*else{
            // for some reason you might get a "fail" message even though the page will load fine eventually..
            // why? and what to do about it??
            console.log('Failed to load site for '+bug+' '+data.url);
            registerTestResult(false, 'Site failed to load: '+status); // Sites fail due to for example redirect problems, better label them as failures..
            bugIdx++;
            jobTime(nextBug,10); // move on
        }*/
    });
}
var retryCount=0
function runTestStep (reportResultsCallback) {
    jobTime(runTestStep, 30000, reportResultsCallback); // backup timeout in case we get stuck at some point..
    if(bugdata[bug].testType === 'mixed-content-blocking')return; // handled elsewhere..
    if(page.title === 'Page Load Error')return finalizeTest(false, '', reportResultsCallback); // assume failure for loading errors (and fail early because

    if(mode === 'regression'){
        //sometimes we're not allowed to inject JS into the error document)
        // we may have to switch to the right frame before running the test
        if (bugdata[bug].steps.length>currentTest && bugdata[bug].stepInFrame && bugdata[bug].stepInFrame[currentTest]) {
            if (bugdata[bug].stepInFrame[currentTest] === 'focused frame') {
                page.switchToFocusedFrame();
            }else{
                console.log('will try to switch from frame "' + page.focusedFrameName + '" to ' + bugdata[bug].stepInFrame[currentTest]);
                page.switchToFrame(bugdata[bug].stepInFrame[currentTest]);
                console.log(page.evaluate(function(){return location.href}));
            }
        };
        if (page.evaluate(function(){return typeof hasViewportMeta === "function"})){
            if (bugdata[bug] && bugdata[bug].steps.length>currentTest){
                try{
                    page.evaluate(function(){
                        window.unsafeWindow=window;
                    });
                    //console.log('('+bugdata[bug].steps[currentTest].toString()+')()')
                    //result = page.evaluateJavaScript('try{('+bugdata[bug].steps[currentTest].toString()+')()}catch(e){"EXCEPTION: "+e}');
                    result = page.evaluate(bugdata[bug].steps[currentTest]);
                    // Somewhat unexpectedly, evaluateJavaScript doesn't throw if the script throws..
                    //console.log('********************************************* result now '+result)
                    if(/^EXCEPTION:/.test(result))throw result;

                    if(result == 'delay-and-retry'){
                        if(retryCount<10){
                            jobTime(runTestStep, 2500);
                            console.log('scheduling new attempt, page is not ready.. '+retryCount+'/10');
                            retryCount++
                            return;
                        }else{
                            finalizeTest(false, 'TIMEOUT - page ready test failed after 10 attempts', reportResultsCallback);
                            return;
                        }
                    }
                    currentTest++;
                    retryCount=0;
                    if (bugdata[bug].steps[currentTest]) { // We have more steps to do before completing this test..
                        // can we get back to this?
                        // TODO: do something more clever than a timeout..
                        console.log('will wait for next test..');
                        return setTimeout(runTestStep, 500)
                    }else{ // We're done with all steps - consider us (nearly) done testing for this bug
                        // However, we also handle mobNavElm where applicable. The idea is to simplify tests by specifying just a selector
                        // that is expected to match something in a complete mobile page but won't in a desktop page
                        // A typical example is a "burger menu" icon
                        if (bugdata[bug].mobNavElm){
                            var elmtestresult = page.evaluate(function(selector){
                                var elm = document.querySelector(selector);
                                var cs = elm && getComputedStyle(elm, '');
                                return elm && cs.display!='none' && cs.visibility != 'hidden' ? true : false;
                            }, bugdata[bug].mobNavElm);
                            if(!elmtestresult)console.log('ELMTEST FAILURE' + elmtestresult);
                            if(typeof(result) === 'boolean'){
                                result = result && elmtestresult;
                            }else{ // result is a string or will soon be stringified anyway
                                result += (elmtestresult ? ', mobNavElm was found' : ', mobNavElm was NOT found');
                            }
                        };
                        finalizeTest(result, '', reportResultsCallback);
                        jobTime(nextBug, 10);
                    }
                }catch(e){
                    result = e;
                    finalizeTest(result, '', reportResultsCallback);
                    jobTime(nextBug, 10);
                }
            };
        }else{
            //console.log('needs to include test file')
            injectJSIntoPage(page, testHelperCode);
            jobTime(runTestStep);
        }
    }else{ // exploration mode
        injectJSIntoPage(page, testHelperCode);
        console.log(testHelperCode)
        var methods = {hasHandheldFriendlyMeta:'not run', hasViewportMeta:'not run', hasMobileOptimizedMeta: 'not run', mobileLinkOrScriptUrl: 'not run', hasVideoTags: 'not run', pageWidthFitsScreen: 'not run', hasHtmlOrBodyMobileClass: 'not run'};
        var str = '';
        for(var method in methods){
            str += method + ': ' + page.evaluate(function(method){
                return window[method]();
            }, method) + ', ';
        }
        finalizeTest(str, '', reportResultsCallback);
    }
}

    function datetime(){
        var date = new Date();
        return date.getFullYear()+'-'+leadZ(date.getMonth()+1)+'-'+leadZ(date.getDate())+ ' '+leadZ(date.getHours())+':'+leadZ(date.getMinutes())+':'+leadZ(date.getSeconds()); // YYYY-MM-DD HH:MM:SS
    }
    function leadZ(num){
        return ('0'+num).slice(-2);
    }

function finalizeTest(result, comment, reportResultsCallback){
    reportResultsCallback(result, comment);
    testsInProgress = false;
    if(testQueue.length){
        initTest(testQueue.shift());
    }
}

function registerTestResult (result, comment) {
    if(mode === 'regression' && bugdata[bug]){
        console.log(bug+' result: '+result+' '+(bugdata[bug].title||'')+' '+(comment||''));
        results.push([bug, datetime(), ua, result, bugdata[bug].title, comment]);
    }else if(mode === 'exploration'){
        results.push([bug, datetime(), '', result, bugdata[bug].url]);
    }
    writeResultsToFile();
}

function writeResultsToFile(){
    // all done!?
    var csvStr = '';
    if(results.length>0){
        for(var i=0; i<results.length; i++){
            csvStr+='"'+(results[i].join('","'))+'"';
            csvStr+='\n';
        }
    }

    var f = fs.open(outfile, 'w');
    f.write(csvStr);
    f.close();
    if(testQueue && testQueue.length === 0){
        console.log(results);
        //setTimeout( function(){ phantom.exit(); }, 1000);
    }
}
function injectJS(page, ua){
    if(page.title === 'Page Load Error')return;
    try{
        //SlimerJS or Gecko has a bug where navigator.userAgent doesn't actually reflect the HTTP UA header..
        page.evaluate(function(ua){
            navigator.__defineGetter__("userAgent", function(){return ua})
        }, ua);
        // pretend touch is enabled..
        page.evaluate(function(){
            window.ontouchstart = function(){}
        });
        // pretend we're using a small screen
        page.evaluate(function(){ window.screen.__defineGetter__("width", function(){return 360})});
        page.evaluate(function(){window.screen.__defineGetter__("height", function(){return 640})});
        page.evaluate(function(){ window.__defineGetter__("devicePixelRatio", function(){return 1.5})});
        if(bug && bugdata[bug] && bugdata[bug].injectScript){
            //console.log('injecting: '+bugdata[bug].injectScript)
            page.evaluate(bugdata[bug].injectScript);
        }
    }catch(e){
        //console.log(e);
    }
}

function injectJSIntoPage(page, js){
    // compat issue between slimer and phantom: slimer does not support anonymous functions passed to evaluateJavaScript
    // while phantom requires them. Here I want to inject some functions into the web page's global scope.
    // Hence we avoid using evaluateJavaScript and add a SCRIPT element instead
    if(typeof slimer == 'object'){
        page.evaluateJavaScript(js);
    }else{
        page.evaluate(function(js){
            var script = document.createElement('script');
            document.documentElement.appendChild(script).appendChild(document.createTextNode(js));
            setTimeout(function(){script.parentNode.removeChild(script)}, 10);
        }, js);
    }
}

function createPage(){
    var page = require('webpage').create();
    ua = page.settings.userAgent = "Mozilla/5.0 (Mobile; rv:26.0) Gecko/26.0 Firefox/26.0";
    page.customHeaders = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-us,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive"
    };
    page.viewportSize = { width:360, height:525 };
    page.onInitialized = function (req) {
        injectJS(page, ua);
    };
    page.onError = function(msg, line, source){
        //console.log('ERROR reported to slimertester.js: '+msg+' '+line+' '+source);
        //console.log(JSON.stringify(line));
        consoleMessages.push(msg);
    }

    page.onResourceError = function (res) {
        var desc = 'resource error - received: '+res.url+'\n '+res.contentType;
        //console.log('received: ' + desc);
        if(/http:\/\//.test(res.url)){
            //console.log('HTTP URL! '+res.url);
            httpResources.push(res.url);
        }
    }
    page.onResourceReceived = function (res) {
        if(res.status == 301 || res.status == 302)return; // this is just an intermediate redirect response, wait for the real deal
        //console.log(JSON.stringify(res, null, 4))
        //injectJS(page, ua);
        }else if(/http:\/\//.test(res.url)){
            httpResources.push(res.url);
            //console.log('HTTP URL! '+res.url);
        }
    };

    page.onLoadFinished = function (status, url, isFrame) {
        //console.log('onLoadFinished '+status+' '+url+' '+isFrame);
        if(bugdata[bug] && bugdata[bug].testType === 'mixed-content-blocking'){
            setTimeout(function(){
                finalizeTest(!httpResources.length,  (httpResources.length ? httpResources.length + ' http: resources loaded on this https: page' : ''));
                nextBug();
            }, 2000)
        }else{
            if(!isFrame)jobTime(runTestStep, 800);
        }
    }

    page.onAlert = page.onPrompt = page.onConfirm = function (str) {console.log(str);return true;}
    return page;
}

var commandServer = require("webserver").create();
commandServer.listen(8384, function(request, response){
    console.log('request: ' + request.url);
    //for(var prop in request){
    //  console.log(prop + ': '+ request[prop]);
    //}
    if (request.url == '/') {
        response.statusCode = 200;
        response.write('<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>Simple tester UI</title></head><body>')
        response.write('<form action="/load/">Open URL (discover problems): <input type="url" name="url"><button>&gt;</button></form>')
        response.write('<form action="/bug/">Test bug (regression test): <input type="number" name="bug"><button>&gt;</button></form>')
        response.write('</body></html>');
        response.close();
    }else if(request.url.match(/\/(load|bug)\//)){
        testQueue = testQueue.concat(decodeURIComponent(request.queryString).substr(4).split(/\s+/))
        if(!testsInProgress){
            bugIdx--;
            jobTime(nextBug, 200);
        }
        response.statusCode = 301;
        response.setHeader('Location', 'http://127.0.0.1:8384/');
        response.write('<a href="/">Go back here</a>')
    }
});

