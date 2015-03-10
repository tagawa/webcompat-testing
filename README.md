
There are various compatibility problems on the web - from outdated JavaScript-libraries, via poor encryption, to too much reliance on vendor-prefixed CSS.

This Node.js project attempts to simplify 
* Discovery of such problems
* Triage of bug reports dealing with such problems
* Regression testing to check if former issues have re-surfaced when a website is updated

We will define a server/service that can run in the background or on a dedicated machine. This service will accept
* An URLs for exploratory testing
* A bug number for regression testing
* JSON data for regression testing

A master script controlling the testing will additionally accept
* Text file of URLs for batch exploratory testing
* List of bug numbers for batch regression testing
* Link to a bug search for regression testing and/or analysis (and/or status updates) (initial support should include Bugzilla, webcompat.com, GitHub)

The service will run SlimerJS or PhantomJS to be able to run tests on a fully fledged web browser. The service must be able to spoof the User-Agent and emulate mobile screen sizes.

(Issue: should we rather use CasperJS as an intermediary controlling Slimer/Phantom? Casper has a library for tests. What, if anything, would that dependency give us?)

The service will support commands for some limited simulation of interaction with the website. It will support logging in automatically with test user credentials to a number of high-profile sites.

The service will support generating screenshots.

We define a set of "bad" problems that will cause a site to get classified as failed. These include at least:

* flexbox webkit stuff w/o equivalents in a selector that is applied on any of the pages we visit
* JavaScript errors thrown in a browser we care about that do not occur with a different engine
* Dependency on Flash content or other plugin stuff w/o equivalents (i.e. OBJECT w/o VIDEO tag)
* If a page has a video, it must play without errors
* WAP served with a WAP-specific MIME type
* Invalid XHTML causing parse errors
* Custom written tests with a plug-in architecture to check for i.e. buggy versions of specific scripts

DONE:
* Module to create bug:URL list from bug search – for example BugdataExtractor.extractFromURL('https://..').then()
* Module to check if wap content is served – WAPCheck.check(url, ua).then() (This check does not require or invoke a full browser)
* Module to check XHTML parsing with a real XML parser (This check does not require or invoke a full browser)
* Module to check redirects (This check does not require or invoke a full browser, but it does assume that we can emulate a browser's request headers well enough)

ROADMAP:
* Import and refactor Hallvord's slimertester.js, add a web server that can accept commands from Node controller
 - Issue: can we pass messages directly to the SlimerJS/PhantomJS process? Would that be better than adding a web server?
* Module to send commands to the script that controls SlimerJS/PhantomJS (to said web server via http)
- Issue: steps in slimertester.js need to be async. Response of web server can't (presumably) wait for all the async stuff to finish, neither can the (limited) web server implementation in SlimerJS/PhantomJS keep fetching data from an on-going testing and send back to the master as server-sent events or similar. Requires polling.
* Module ("Node controller" to keep track of a batch of URLs/bug numbers/test data and open the next one when client is ready – client.is_done().then()? Knows how to run different test types - i.e. will use WMLCheck or RedirectCheck directly. Might combine different tests but should report results with as much granularity as possible.
* Add light web server w/UI to send commands to the Node controller?
* Result comparison module + 
* Result snapshoting module - outputs a webcomptest JSON fragment for human review and future regression testing. Referring to "bad problems" above, the result comparison should output a "pass/fail" and a fragment of JSON and/or JS code that can be used to re-verify the pass or failure in a single-instance test. The problem with generating static tests is always the amount of noise in test results due to changing sites. If "generating" the test is semi-automated and the test itself only needs re-generating and a light human review when the site changes without fixing the issue, this is no longer a big problem.
* Database storage of results - particularly things like URLs of HTTP resources blocked on HTTPS pages, JavaScript errors, -web-kit styles that need replacements - with a good database, even complicated new problems might be easily classified if we've seen a similar thing before.


COMMANDS THE SLIMER/PHANTOM SERVICE SHOULD SUPPORT:
* load_url_regression_test(url, bugdata) - tests only in one instance (SlimerJS or PhantomJS), according to bugdata, returns req_id that can be passed to many of the other methods
* load_url_exploration_test(url)  - tests both in SlimerJS and PhantomJS, returns req_id that can be passed to many of the other methods
* click(selector)
* scroll(x,y)
* is_done() - true only when both devices are done testing
* get_testresults(req_id)   true/false, comment - MAYBE. We should perhaps rather have get_data() and leave the "result" part to the comparison module?
* get_last_req_id()
* get_screenshots(req_id)  - returns {slimer:'data:image/png;base64,..', phantom:'data:..'}
* get_mixedcontentresults(req_id) - for https only, a list of http resources included
* get_pluginresults(req_id) - all results from the plugin architecture in a JSON format
* get_cssresults(req_id) - data from the algorithm for detecting specific CSS issues
* get_consoleresults(req_id) - data from the console log (i.e. JS errors) 

WEB COMPATIBILITY TEST DATA FORMAT

The data format will resemble the one being used for the site compat tester extension and related scripts:

    "1073297": {
        "url": "http://instagram.com/therock/",
        "steps": [
            function(){return pageWidthFitsScreen() && mobileLinkOrScriptUrl();}
        ],
        "ua": "FirefoxOS",
        "title": "[Instagram] When tapping an image or video, the image/video will not display properly (Firefox OS gets desktop content)",
        stepInFrame:{2:'bankid_iframe_I_presume'},
        "mobNavElm": "button.navbar-toggle"
    }

See [sitecomptester-extension's README](https://github.com/hallvors/sitecomptester-extension/blob/master/README.md) for further details. However, in the new model some of the information that's now inside a JS function will be properties instead - pageWidthFitsScreen will be a boolean property in the returned JSON rather than a part of a script function. It will still be possible to define test steps and include JS.

(Note to self: these are the scripts I want to steal code/logic/functionality from:

slimertester.js: 

Supports misc test types 
    * XHR/WAP
    * mixed content
    * regression
    * exploration
Reads webcomptest JSON format.
Can track console errors.
Outputs test results.
Batch mode for regression tests
Can run both SlimerJS and PhantomJS (but not really control them.. yet)

testsites.py:
* Generates, compares, splices screenshots.
* Outputs test results.
* Generates webcomptest JSON format.
* Automated login.
* Load, spoof, click.

marionette_remote_control.py
* Web server accepts commands.
* Controls device and/or browser.

dualdriver.py
* Accepts bug search URL as input.
* Interacts with bug trackers.
* Finds contact points.
* Does header check.

Compatipede 1
* Batch operation over many URLs.
* Headless.
* Plugins.
* Interesting CSS logic.

Compatipede 2?
?

css-fixme:
CSS logic here is probably more refined than in Compatipede 1 (and written in JS, whereas the logic in Compatipede 1 is in Python). Should be compared though.

)

