const MessageModel = require('../models/message.js');
const RoomModel = require('../models/room.js');
const UserModel = require('../models/user.js');
const Report = require('../report/report');
const PageSize = 20;

/**get聊天信息start*/
exports.getMessage = function (req, res) {
    new Promise(function (resolve, reject) {
        let page = req.query.page;
        let optFind, optField;
        if (req.session.user && parseInt(req.session.user.level) > 999) {
            optFind = {};
            optField = ['_id', 'from', 'content', 'createAt', 'check'];
        }
        else {
            optFind = {'check': true};
            optField = ['_id', 'from', 'content', 'createAt'];
        }
        MessageModel
            .find(optFind, optField)
            .sort({_id: -1})
            .skip(page * PageSize)
            .limit(PageSize)
            .populate('from', 'name')
            .exec(function (err, messages) {
                if (err) {
                    reject(err)
                }
                resolve(messages);
            })
    })
        .then(function (messages) {
            res.json(messages)
        })
        .catch(function (err) {
            Report.errJSON(res, err)
        })
};
/**get聊天信息end*/

/**get聊天信息start*/
exports.messageList = function (req, res) {
    let totalPageNumPromise=new Promise(function(resolve,reject){
        let totalPageNum;
        MessageModel
            .find({})
            .count(function(err,count){
                if(err){reject(err)}
                totalPageNum = Math.ceil(count/PageSize);
                resolve(totalPageNum)
            })
    });
    let messagesPromise=new Promise(function(resolve,reject){
        let page = req.param.page;
        MessageModel.find({})
            .find({})
            .sort({_id:-1})
            .skip((page-1)*PageSize)
            .limit(PageSize)
            .populate('from','name')
            .populate('verifier','name')
            .populate('room','title')
            .exec(function(err,messages){
                if(err){reject(err)}
                resolve(messages)
            })
    });
    Promise
        .all([totalPageNumPromise,messagesPromise])
        .then(function([totalPageNum,messages]){
            res.render('messageList', {
                title: '聊天列表'
                , messages
                , totalPageNum
            });
        })
        .catch(function(err){
            Report.errPage(res,err)
        });

};
/**get聊天信息end*/


/**save聊天信息start*/
exports.save = function (msg, user, next) {
    let _message = {
        from: {}
    };
    _message.from = user._id;
    _message.content = msg.content;
    _message.room = msg.room;

    let message = new MessageModel(_message);
    message.save(function (err, message) {
        if (err) {
            console.log(err);
        }
        next(
            {
                _id: message._id
                , from: {
                name: user.name
            }
                , content: message.content
                , createAt: message.createAt
            }
        )
    })
};
/**save聊天信息end*/


/**check聊天信息start*/
exports.checkMessage = function (id, user, next) {
    MessageModel.findOne({_id: id})
        .populate('from', 'name')
        .exec(function (err, message) {
            if (err) {
                console.log(err)
            }
            message.check = true;
            message.verifier = user._id;
            message.save(function (err) {
                if (err) {
                    console.log(err);
                }
                next(message, user.name)
            })
        });
};
/**check聊天信息end*/

/**delete聊天信息start*/
exports.delMessage = function (id, user, next) {
    MessageModel.findByIdAndRemove(id, function (err) {
        if (err) {
            console.log(err);
        }
        next({
            _id: id
        })
    })
};
/**delete聊天信息end*/

/**查询首页start*/
exports.messageSearch = function (req, res) {
    let user = req.session.user;
    let findOpt;
    if (parseInt(user.level) > 1000) {
        findOpt = {}
    } else {
        findOpt = {_id: user.room}
    }
    RoomModel
        .find(findOpt)
        .exec(function (err, rooms) {
            if (err) {
                console.log(err)
            }
            console.log(rooms);
            res.render('messageSearch', {
                title: '聊天信息查询',
                rooms: rooms
            })
        });
};
/**查询首页end*/

/**查询结果start*/
exports.query = function (req, res) {
    let search = {};
    let _search = req.body.search;
    let totalPageNum;
    let pageNum = req.params.page;
    for (let key in _search) {
        if (_search[key] !== '') {
            if (key === 'content') {
                search[key] = new RegExp(_search[key], 'gi')
            }
            else if (key === 'timeStart') {
                _search[key] += ' 00:01';
                search['createAt'] = {
                    '$gte': new Date(_search[key])
                }
            }
            else if (key === 'timeEnd') {
                _search[key] += ' 23:59';
                if (search['createAt']) {
                    search['createAt']['$lt'] = new Date(_search[key])
                } else {
                    search['createAt'] = {
                        "$lt": new Date(_search[key])
                    }
                }
            }
            else if (key === 'name') {

            }
            else {
                search[key] = _search[key]
            }
        }
    }
    console.log(search);
    if (_search['name'] !== '') {
        UserModel.findOne({name: _search['name']}, function (err, user) {
            if (err) {
                console.log(err)
            }
            if (!user) {
                res.render('information', {
                    title: '错误提示',
                    information: '未查找到此人'
                });
                return;
            }
            search['from'] = user._id;

            MessageModel.count(search, function (err, count) {
                totalPageNum = Math.ceil(count / PageSize);
                MessageModel.find(search)
                    .populate('from', 'name')
                    .populate('verifier', 'name')
                    .skip((pageNum - 1) * PageSize)
                    .limit(PageSize)
                    .exec(function (err, messages) {
                        if (err) {
                            console.log(err)
                        }
                        res.render('messageQuery', {
                            title: '聊天列表'
                            , messages
                            , totalPageNum
                            , search: _search
                        });
                    });
            });
        })
    } else {
        MessageModel.count(search, function (err, count) {
            totalPageNum = Math.ceil(count / PageSize);
            MessageModel.find(search)
                .populate('from', 'name')
                .populate('verifier', 'name')
                .skip((pageNum - 1) * PageSize)
                .limit(PageSize)
                .exec(function (err, messages) {
                    if (err) {
                        console.log(err)
                    }
                    res.render('messageQuery', {
                        title: '聊天列表'
                        , messages
                        , totalPageNum
                        , search: _search
                    });
                });
        });
    }
};
/**查询结果end*/

exports.roomMessageList = function (req, res) {
    let room = req.params.room;
    let page = req.params.page;
    let count = new Promise(function (resolve, reject) {
        MessageModel
            .find({room: room})
            .count(function (err, count) {
                let totalPageNum;
                if (err) {
                    reject(err)
                }
                totalPageNum = Math.ceil(count / PageSize);
                resolve(totalPageNum);
            });
    });
    let messages = new Promise(function (resolve, reject) {
        MessageModel
            .find({room: room})
            .sort({_id: -1})
            .skip((page - 1) * PageSize)
            .limit(PageSize)
            .populate('from', 'name')
            .populate('verifier', 'name')
            .populate('room', 'title')
            .exec(function (err, messages) {
                if (err) {
                    reject(err)
                }
                resolve(messages);
            })
    });
    Promise.all([count, messages])
        .then(function ([totalPageNum, messages]) {
            res.render('messageList', {
                title: '聊天列表',
                totalPageNum: totalPageNum,
                messages: messages
            })
        })
        .catch(function (err) {
            res.render('wrongWay', {
                title: '发生错误',
                err: err
            })
        });
};
