/* testing the WML checker */

/* Create the server that will send the responses we need to analyse */
var http = require('http');
var xhtmlchecker = require('../lib/XHTMLCheck.js')
var expect = require('chai').expect;
var promise = require('promise');
var request = require('request');

var mobileUA = 'Mozilla/5.0 (Mobile; rv:26.0) Gecko/26.0 Firefox/26.0';
var desktopUA = 'Mozilla/5.0 (Windows NT 6.3; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0';


http.createServer(function (req, res) {
  var type = '';
  var valid = true;
  if(req.url === '/htmlonly'){
    type = 'html';
  }else if(req.url === '/xhtmlinvalid'){
    type = 'xhtml';
    valid = false;
  }else{
    if (/mobile/i.test(req.headers['user-agent'])) {
        type = 'xhtml';
    }else{
        type = 'html';
    }
  }
  if(type === 'html'){
    res.writeHead(200, {'Content-Type': 'text/html;charset=iso-8859-1'});
    res.end('<html><body><p>Hello World\n</p></body><html>');
  }else if(type === 'xhtml'){
    res.writeHead(200, {'Content-Type': 'application/xhtml+xml;charset=iso-8859-1'});
    if(valid){
        res.end('<?xml version="1.0"?>\n<html><body><p>Hello World\n</p></body><html>');
    }else{
        res.end('<?xml version="1.0"?>\n<html><body><b><p>Hello</b> World\n& friends</p></body><html>');
    }
  }
}).listen(1459, '127.0.0.1');
describe('XHTMLCheck', function(){
    this.timeout(3000);
    describe('checkURL', function(){
        it('returns irrelevant for HTML content', function(done){
            xhtmlchecker.checkURL('http://127.0.0.1:1459/htmlonly', desktopUA).then(function(result){
                expect(false).to.equal(true); // in other words, we should not get here
                done();
            }, function(result){
                expect(result).to.equal('not xhtml, test is irrelevant');
                done();
            });
        });
       it('returns true for valid XHTML content', function(done){
            xhtmlchecker.checkURL('http://127.0.0.1:1459/xhtml', mobileUA).then(function(result){
                expect(result).to.equal(true);
                done();
            }, function(result){console.log(result)
              expect(result).to.equal('');
              done();
            });
        });
       it('It returns false for invalid XHTML content', function(done){
            xhtmlchecker.checkURL('http://127.0.0.1:1459/xhtmlinvalid', mobileUA).then(function(result){
                expect(result).to.equal(false);
                done();
            }, function(){
              expect(false).to.equal(true);
              done()
            });
        });
    });
});

