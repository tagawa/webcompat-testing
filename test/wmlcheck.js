/* testing the WML checker */

/* Create the server that will send the responses we need to analyse */
var http = require('http');
var wmlchecker = require('../lib/WMLCheck.js')
var expect = require('chai').expect;

var mobileUA = 'Mozilla/5.0 (Mobile; rv:26.0) Gecko/26.0 Firefox/26.0';
var desktopUA = 'Mozilla/5.0 (Windows NT 6.3; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0';


http.createServer(function (req, res) {
  var type = '';
  if(req.url === '/htmlonly'){
    type = 'html';
  }else if(req.url === '/wmlonly'){
    type = 'wml';
  }else{
    if (/mobile/i.test(req.headers['user-agent'])) {
        type = 'wml';
    }else{
        type = 'html';
    }
  }
  if(type === 'html'){
    res.writeHead(200, {'Content-Type': 'text/html;charset=iso-8859-1'});
    res.end('<html><body><p>Hello World\n</p></body><html>');
  }else if(type === 'wml'){
    res.writeHead(200, {'Content-Type': 'text/vnd.wap.wml;charset=iso-8859-1'});
    res.end('<?xml version="1.0"?>\n<!DOCTYPE wml PUBLIC "-//WAPFORUM//DTD WML 1.1//EN" "http://www.wapforum.org/DTD/wml_1.1.xml">\n<wml>\n  <card id="main" title="Hello">\n    <p mode="wrap">Hello world.</p>\n  </card>\n</wml>');
  }
}).listen(1457, '127.0.0.1');
// using promises makes i tricky to know when the tests are all finished - not necessarily in the written order..
describe('WMLCheck', function(){
    this.timeout(5000);
    describe('checkURL', function(){
        it('returns true for HTML content', function(done){
            wmlchecker.checkURL('http://127.0.0.1:1457/htmlonly', desktopUA).then(function(result){
                expect(result).to.equal(true);
                wmlchecker.checkURL('http://127.0.0.1:1457/htmlonly', mobileUA).then(function(result){
                    expect(result).to.equal(true);
                    done();
                });
            });
        });
       it('returns false for WML content', function(done){
            wmlchecker.checkURL('http://127.0.0.1:1457/wmlonly', desktopUA).then(function(result){
                expect(result).to.equal(false);
                wmlchecker.checkURL('http://127.0.0.1:1457/wmlonly', mobileUA).then(function(result){
                    expect(result).to.equal(false);
                    done();
                });
            });
        });
       it('User-Agent makes a difference for some WML content', function(done){
            wmlchecker.checkURL('http://127.0.0.1:1457/wmlsometimes', desktopUA).then(function(result){
                expect(result).to.equal(true);
                wmlchecker.checkURL('http://127.0.0.1:1457/wmlsometimes', mobileUA).then(function(result){
                    expect(result).to.equal(false);
                    done();
                });
            });
        });
    });
});

