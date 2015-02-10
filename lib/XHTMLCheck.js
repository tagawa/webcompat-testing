/*
Check if invalid XHTML content is returned for a given URL and UA
*/
var checkURL = exports.checkURL = function (url, ua) {
    var promise = require('promise');
    var request = promise.denodeify(require('request'));
    var xml_lite = require('node-xml-lite');
    return new promise(function(ok, fail){
        headers = {'User-Agent': ua}
        request({uri:url, headers:headers}).then(function(res){
            if (!/xhtml/i.test(res.headers['content-type'])) {
                fail('not xhtml, test is irrelevant');
            };
            var valid_xhtml = true;
            try{
                xml_lite.parseString(res.body);
            }catch(e){
                valid_xhtml = false;
            }
            ok(valid_xhtml);
        })
    });
}
