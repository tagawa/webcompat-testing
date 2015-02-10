/* Testing redirect checker */

/* Create the server that will send the responses we need to analyse */
var http = require('http');
var redirchecker = require('../lib/RedirectCheck.js')
var expect = require('chai').expect;

var mobileUA = 'Mozilla/5.0 (Mobile; rv:26.0) Gecko/26.0 Firefox/26.0';
var desktopUA = 'Mozilla/5.0 (Windows NT 6.3; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0';


http.createServer(function (req, res) {
  var redirectTo = '';
  var server = 'http://127.0.0.1:1458';
  if(req.url === '/step1of2'){
    redirectTo = server + '/step2of2';
  }else if(req.url === '/loop1'){
    redirectTo = server + '/loop2';
  }else if(req.url === '/loop2'){
    redirectTo = server + '/loop1';
  }else if(req.url === '/uadependent2'){
    redirectTo = server + '/uadependent3';
  }else if(req.url === '/uadependent' || req.url === '/uadependent3'){
    if (/mobile/i.test(req.headers['user-agent'])) {
        redirectTo = server + '/foo';
    }else{
        redirectTo = server + '/bar';
    }
  }
  if(redirectTo === ''){
    res.writeHead(200, {'Content-Type': 'text/html;charset=iso-8859-1'});
    res.end('<html><body><p>Hello World\n</p></body><html>');
  }else if(redirectTo !== ''){
    res.writeHead(301, {'Location': redirectTo});
    res.end();
  }
}).listen(1458, '127.0.0.1');

describe('RedirectCheck', function(){
    this.timeout(5000);
    describe('checkURL', function(){
        it('returns true for no redirect', function(done){
            redirchecker.checkURL('http://127.0.0.1:1458/noredirect', desktopUA, mobileUA).then(function(result){
                expect(result).to.equal(true);
                done();
            });
        });
        it('returns true for same redirect', function(done){
            redirchecker.checkURL('http://127.0.0.1:1458/step1of2', desktopUA, mobileUA).then(function(result){
                expect(result).to.equal(true);
                done();
            });
        });
       it('returns false for UA dependent logic', function(done){
            redirchecker.checkURL('http://127.0.0.1:1458/uadependent', desktopUA, mobileUA).then(function(result){
                expect(true).to.equal(false);
            }, function(result){
                expect(result).to.equal('entry 0 different in redirect chain')
                done();
            });
        });
       it('returns false for UA dependent logic - second step', function(done){
            redirchecker.checkURL('http://127.0.0.1:1458/uadependent2', desktopUA, mobileUA).then(function(result){
                expect(true).to.equal(false);
                done();
            }, function(result){
                expect(result).to.equal('entry 1 different in redirect chain')
                done();
            });
        });
       it('Loop protection', function(done){
            redirchecker.checkURL('http://127.0.0.1:1458/loop1', desktopUA, mobileUA).then(function(result){
                expect(false).to.equal(true); // should not get here
            }, function(res){
                expect(res).to.equal('Loop detected')
                done();
            });
        });
    });
});


