/*
Extract data from bug search URL
*/
var extractFromURL = exports.extractFromURL = function (url) {

    var promise = require('promise');
    var request = promise.denodeify(require('request'));
    var fs = require('fs');
    /* Input check */
    var bugtracker = null;
    if(/^https:\/\/bugzilla.mozilla.org/i.test(url)){
        bugtracker = 'bugzilla';
    }else if(/^https:\/\/webcompat.com/i.test(url)){
        bugtracker = 'webcompat';
    }else if(/^https:\/\/github.com/i.test(url)){
        bugtracker = 'github';
    }

    if(!bugtracker){
        throw 'This URL is not from a known bug tracker!';
    }
    /* IMO reading very small files sync is fine.. :-p */
    var site_aliases = JSON.parse(fs.readFileSync('./data/aliases.json'));
    /*
        It's easier to massage the URL a bit to make the bug system output raw data..
    */
    var data_url = url;
    if (bugtracker === 'bugzilla' && data_url.indexOf('/rest/bug') === -1) {
        data_url = data_url.replace('buglist.cgi?', 'rest/bug?include_fields=id,platform,op_sys,summary,status,resolution,whiteboard,url,priority&');
    }else if(bugtracker === 'webcompat'){
        // TODO
    }else if(bugtracker === 'github'){
        // TODO
        data_url = data_url.replace('://github.com', '://api.github.com')
    }

    return new promise(function(ok, fail){
        request(data_url).done(function(res){
            var data = JSON.parse(res.body);
            ok(data);
        })
    });

    function massageBzData(data){
        for(var i=0; i<data.length; i++){
            data.urlhints = hostsFromSummary(data[i].summary);
            data[i].uahints = [];
            if(data[i].summary.indexOf('B2G')>-1 || /firefox os/i.test(data[i].summary) || data[i].op_sys.indexOf('Gonk')>-1){
                data[i].uahints.push('FirefoxOS');
            }
            if(/android/i.test(data[i].summary) || data[i].op_sys.indexOf('Android')>-1){
                data[i].uahints.push('FirefoxAndroid');
            }
            data[i].testType = testTypeHeuristics(data[i].summary);
        }
        return data;
    }

    function testTypeHeuristics(summary){
        if(/(wap|wml)/i.test(summary)){
            return 'xhr';
        }
        if(/mixed content/i.test(summary)){
            return 'mixed-content-blocking';
        }
        return 'standard';
    }

    function hostsFromSummary(summary){
        /*  We need to extract any hosts names mentioned in
        #    a) URL field
        #    b) Summary
        #    c) Alias words from aliases.json (i.e. "Hotmail" in summary -> file under live.com)
        #  Also, we want domain names without subdomains (no www. or m. prefixes, for example)
        #  This is a generic method to extract one or more domain names from a text string - the argument can be a URL or some text with a host name mentioned
        */
        var text = summary.trim().toLowerCase();
        var hosts = [];
        var parts = text.split(/\s/);

        for(var i = 0; i<parts.length; i++){
            var word = parts[i].replace(/[.()!?,\[\]]$/, '');
            word = word.strip('.()!?,[]') // make sure we don't assume a random 'foo.' is a domain due to a sentence-delimiting dot in summary.. Also removing some other characters that might be adjacent..
            if(word.indexOf('.')>-1 && word.indexOf('][') === -1){
                // now go on to assume the first white-space separated string that contains at least one internal period is a domain name
                // above if excludes words that contain ][ to avoid grabbing parts of the [foo][e.me] labels used in bugzilla
                if(hosts.indexOf(word) === -1){
                    hosts.push(word)
                }
            }else{
                for(var hostname in site_aliases){
                    if(word.indexOf(site_aliases[hostname])>-1){
                        if(hosts.indexOf(hostname)==-1){
                            hosts.push(hostname);
                        }
                    }
                }
            }
        }
        return hosts;
    }
}