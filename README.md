
There are various compatibility problems on the web - from outdated JavaScript-libraries, via poor encryption, to too much reliance on vendor-prefixed CSS.

This Node.js project attempts to simplify 
* Discovery of such problems
* Triage of bug reports dealing with such problems
* Regression testing to check if former issues have re-surfaced when a website is updated

We will define a server/service that can run in the background or on a dedicated machine. This service will accept
* One or more URLs for exploratory testing
* One or more bug numbers for regression testing
* JSON data for regression testing
* Link to a bug search for regression testing and/or status updates (initial support for Bugzilla, webcompat.com, GitHub)

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
* Module to check redirects (This check does not require or invoke a full browser, given that we emulate a browser's request headers well enough)

ROADMAP:
* Import and refactor Hallvord's slimertester.js, add a web server that can accept commands
* Module to send commands to the script that controls SlimerJS/PhantomJS (to said web server via http)
* Module to keep track of a batch of URLs/bug numbers/test data and open the next one when client is ready – client.is_busy().then()
* Result comparison module – outputs a webcomptest JSON fragment for human review and future regression testing. Referring to "bad problems" above, the result comparison should output a "pass/fail" and a fragment of JSON and/or JS code that can be used to re-verify the pass or failure in a single-instance test.

COMMANDS THE SERVICE SHOULD SUPPORT:
* load_url_regression_test(url, bugdata) - tests only in one instance (SlimerJS or PhantomJS), according to bugdata
* load_url_exploration_test(url)  - tests both in SlimerJS and PhantomJS, returns test_id that can be passed to many of the other methods
* click(selector)
* scroll(x,y)
* is_busy() - false only when both devices are done testing
* get_testresults(test_id)   true/false, comment - MAYBE. We should perhaps rather have get_data() and leave the "result" part to the comparison module?
* get_last_test_id()
* get_screenshots(test_id)  - returns {slimer:'data:image/png;base64,..', phantom:'data:..'}
* get_mixedcontentresults(test_id) - for https only, a list of http resources included
* get_pluginresults(test_id) - all results from the plugin architecture in a JSON format
* get_cssresults(test_id) - data from the algorithm for detecting specific CSS issues
* get_consoleresults(test_id) - data from the console log (i.e. JS errors) 

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

