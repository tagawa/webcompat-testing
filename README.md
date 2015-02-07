
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


ROADMAP:
* Module (py or Node) to create bug:URL list from bug search – for example BugdataExtractor.extractFromURL('https://..').then()
* Module to check if wap content is served – WAPCheck.check(url, ua).then() (This check does not require or invoke a full browser)
* Module to check XHTML parsing with a real XML parser (This check does not require or invoke a full browser)
* Module to check redirects (This check does not require or invoke a full browser, given that we emulate a browser's request headers well enough)
* Import and refactor Hallvord's slimertester.js, add a web server that can accept commands
* Module (py or Node) to send commands to the script that controls SlimerJS/PhantomJS
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

