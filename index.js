var http = require('http');
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var async = require('async');

var _html = '';
var domainUrl = 'http://sucai.redocn.com/tupian/renwutupian/new-2.html';

var q = async.queue(function(task, callback) {
    console.log(task);
    nextRequest(task,function(res){
        if(res == '2'){
            console.log('11111111111111');
            callback();
        }
    })
}, 1);

// assign a callback
q.drain = function() {
    console.log('all items have been processed');
};

function fetchPage(url){
    startRequest(url,function(data){
        console.log('此次抓取数据共'+data.length+'条')
        for(var i=0;i<data.length;i++){
           q.push(data[i], function(err) {
                console.log('finished processing item');
            }); 
        };
    });
}

function startRequest(url,fn){
    http.get(url,function(res){
        res.setEncoding('utf-8');
        res.on('data',function(chunk){
            _html += chunk;
        })
        res.on('end',function(){
            var $ = cheerio.load(_html);
            var articlList = getArticle($);
            fn(articlList);
        }).on('error', function (err) {
            console.log(err);
        });
    })
}

function nextRequest(url,fn){
        http.get(url,function(res){
            res.setEncoding('utf-8');
            res.on('data',function(chunk){
                _html += chunk;
            })
            res.on('end',function(){
                var $ = cheerio.load(_html);
                saveImg($,function(res){
                    if(res == '1'){
                        fn('2') 
                    }
                });
            }).on('error', function (err) {
                console.log(err);
            });
        })

}

function getArticle($){
    var urlList = [];
    $('.thimg>a').each(function(index,item){
        var ArticleUrl = $(item).attr('href');
        urlList.push(ArticleUrl);
    })
    return urlList;
};

function saveImg($,fn){
    $('.good_left img').each(function(index,item){
        var img_title = $(item).attr('title');
        var img_filename = img_title + '.jpg';
        var img_src = $(item).attr('src');
        request.head(img_src,function(err,res,body){
            if(err){
                console.log(err);
            }
        });
        var fileWriteStream = fs.createWriteStream('./image/'+ img_filename);
        request(img_src).pipe(fileWriteStream);
        fileWriteStream.on('close',function(){
            console.log('image had downloaded')
            fn('1');
        })
    })
}

fetchPage(domainUrl);