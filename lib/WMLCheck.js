/*
Check if WML content is returned for a given URL and UA
*/
var checkURL = exports.checkURL = function (url, ua) {
    var promise = require('promise');
    var request = promise.denodeify(require('request'));
    return new promise(function(ok, fail){
        headers = {'User-Agent': ua}
        request({uri:url, headers:headers}).done(function(res){
            ok(!/text\/vnd\.wap\.wml/i.test(res.headers['content-type']));
        })
    });


}
