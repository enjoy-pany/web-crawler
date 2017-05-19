var http = require('http');
var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var async = require('async'); //异步执行模块
var iconv = require('iconv-lite');

var domainUrl = 'http://sucai.redocn.com/tupian/renwutupian/new-';

//任务队列
var q = async.queue(function(task, callback) {
    console.log('抓取' + task + '中的数据');
    nextRequest(task, function(res) {
        if (res == '2') {
            callback();
        } else {
            console.log(res)
        }
    })
}, 1);

//请求 转码
function loadPage(link, cb) {
    request
        .get({
            url: link,
            gzip: true,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, sdch',
                'Accept-Language': 'zh-CN,zh;q=0.8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Pragma': 'no-cache',
                'Referer': 'https://www.google.com',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
            }

        })
        .on('error', function(err) {
            console.error('fail', link);
            cb(err);
        })
        .pipe(iconv.decodeStream('gbk'))
        .pipe(iconv.encodeStream('utf8'))
        .collect(function(err, data) {
            if (err) {
                console.error(err);
                return cb(err);
            }
            if (Buffer.isBuffer(data)) data = data.toString();
            cb(null, data);
        });

}

//测试 抓取一页数据
function fetchPage(url) {
    startRequest(url, function(data) {
        console.log('此次抓取数据共' + data.length + '条')
        for (var i = 0; i < data.length; i++) {
            q.push(data[i], function(err) {
                console.log('finished processing item');
            });
        };
    });
}

//初始化入口程序
var initPage = function(url,startPage,maxPage){
    if(startPage > maxPage){
        console.log(maxPage+' 页的数据已经抓取完毕！')
        return 1
    }else{
        startRequest(url+startPage+'.html', function(data) {
            console.log('第'+startPage+'页抓取数据共' + data.length + '条')
            for (var i = 0; i < data.length; i++) {
                q.push(data[i], function(err) {
                    console.log('finished processing item');
                });
            };
        });
        // assign a callback
        q.drain = function() {
            console.log('Page'+startPage+' all items have been processed');
            return initPage(url,startPage + 1,maxPage)
        };
    }
}

//抓取列表页服务
function startRequest(url, fn) {
    var _html = '';
    http.get(url, function(res) {
        res.setEncoding('utf-8');
        res.on('data', function(chunk) {
            _html += chunk;
        })
        res.on('end', function() {
            var $ = cheerio.load(_html);
            var articlList = getArticle($);
            fn(articlList);
        }).on('error', function(err) {
            console.log(err);
        });
    })
}

//抓取内容页
function nextRequest(url, fn) {
    loadPage(url,function(err, data){
        if (err) return console.error(err);
        var $ = cheerio.load(data);
        saveImg($, function(res) {
            if (res == '1') {
                fn('2')
            }
        });
        saveContent($,function(res){
            if(res== '1'){
                console.log('text has uploaded')
            }
        });
    })

}

//抓取列表页 url 部分
function getArticle($) {
    var urlList = [];
    $('.thimg>a').each(function(index, item) {
        var ArticleUrl = $(item).attr('href');
        urlList.push(ArticleUrl);
    })
    return urlList;
};

//抓取内容页 image 部分
function saveImg($, fn) {
    $('.good_left img').each(function(index, item) {
        var _title = $(item).attr('title');
        var img_filename = _title + '.jpg';
        var img_src = $(item).attr('src');
        request.head(img_src, function(err, res, body) {
            if (err) {
                console.log(err);
            }
        });
        var fileWriteStream = fs.createWriteStream('./image/' + img_filename);
        request(img_src).pipe(fileWriteStream);
        fileWriteStream.on('close', function() {
            console.log('image had downloaded')
            fn('1');
        })
    })
}

//抓取内容页 text 部分
function saveContent($,fn){
    var Mess = {
        name: $('.good_right h1').text(),
        num: $('.canshu_nub').text(),
        date: $('.add_time_li').text()
    };
    console.log(Mess)
    var text = Mess.name+','+Mess.num+','+Mess.date;
    fs.appendFile('./data/' + Mess.name + '.txt', text, 'utf-8', function (err) {
        if (err) {
            console.log(err);
        }else{
            fn('1')
        }
    });
}

initPage(domainUrl,1,3)

//-----------------test-----------------//

//fetchPage(domainUrl);
// loadPage('http://sucai.redocn.com/tupian/renwutupian/new-2.html', function(err, data) {
//     if (err) return console.error(err);
//     console.log(data);
// })