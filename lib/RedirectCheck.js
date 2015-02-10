/* Check if a given URL is redirected. Follows redirect chains (but without looping) */

var checkURL = exports.checkURL = function (url, ua1, ua2) {
    var promise = require('promise');
    var request = promise.denodeify(require('request'));
    function listRedirectTargets(url, ua, targets){
        /* we must fake browser headers convincingly for this purpose.. */
        var headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-us;q=0.8,en;q=0.5,fr;q=0.3",
        "Accept-Encoding": "gzip, deflate",
        "DNT": "1",
        "Referer": url
        }
        return new promise(function(ok, fail){
            request({uri: url, headers: headers, followRedirect: false}).then(function(res){
                if(res.statusCode === 200){
                    ok(targets);
                }else if([301, 302, 303, 307].indexOf(res.statusCode) > -1){
                    if(targets.indexOf(res.headers.location) === -1){ // loop protection
                        targets.push(res.headers.location);
                        ok(listRedirectTargets(res.headers.location, ua, targets));
                    }else{
                        // Hm.. looping?!? Let's pass it on to check the state of stuff..
                        fail('Loop detected');
                    }
                }
                //console.log(res.headers.location);
            })
        });
    }
    return new promise(function(ok, fail){
        promise.all([listRedirectTargets(url, ua1, []), listRedirectTargets(url, ua2, [])]).then(function(results){
            var redirects1 = results[0];
            var redirects2 = results[1];
            if (redirects1.length != redirects2.length){
                fail('different lengths for redirect chains');
            };
            for(var i=0; i<redirects1.length; i++){
                if (redirects1[i] !== redirects2[i]) {
                    fail('entry ' + i + ' different in redirect chain');
                };
            }
            ok(true); // exacly same redirects for either UA string
        }, function(res){
            fail(res);
        });
    });

}
