const multiparty=require('connect-multiparty');

const Index = require('../controllers/index');
const User = require('../controllers/user');
const Message = require('../controllers/message');
const Picture = require('../controllers/picture');
const Room=require('../controllers/room');
const Admin = require('../controllers/admin');

module.exports = function (app, io) {
    let tourists=0;
    let users=[];
    let rooms=[];

    /*pre handle user*/
    app.use(function (req, res, next) {
        app.locals.admin = req.session.admin;
        next();
    });

    /*Index*/
    app.get('/', Index.index);//PAGE：主页
    app.get('/room/:room', Index.room);//PAGE：房间主页
    app.get('/test', Index.test);//PAGE：测试用

    /*User*/
    app.post('/user/signin', User.signIn);//JSON：登录
    app.get('/user/signout', User.signOut);//JSON：登出

    /*Message*/
    app.get('/message/getmessage',Message.getMessage);//JSON:信息

    /*Admin*/
    app.get('/admin/login', Admin.login);//PAGE:登录
    app.post('/admin/signin', Admin.signIn);//PAGE:登录
    app.get('/admin/welcome',Admin.adminRequired, Admin.welcome); //PAGE:欢迎
    app.get('/admin/test',Admin.adminRequired, Admin.test); //PAGE:测试

    /*Admin-Room*/
    app.get('/admin/roomlist', Admin.adminRequired, Room.roomList);//PAGE：房间列表
    app.get('/admin/roomnew', Admin.adminRequired, Room.roomNew);//PAGE：房间新增
    app.get('/admin/roomdetail/:id', Admin.adminRequired, Room.roomDetail);//PAGE：房间详情
    app.get('/admin/roomupdate/:id', Admin.adminRequired, Room.roomUpdate);//PAGE：房间更新
    app.post('/admin/room/add', Admin.adminRequired, Room.add);//FORM：房间增加
    app.post('/admin/room/update', Admin.adminRequired, Room.update);//FORM：房间更新
    app.delete('/admin/room/delete', Admin.adminRequired, Room.delete);//JSON：房间删除

    /*Admin-User*/
    app.get('/admin/userlist/:room_id/:page', Admin.adminRequired, User.userList);//PAGE:用户列表
    app.get('/admin/usersignup/:room_id', Admin.adminRequired, User.userSignUp);//PAGE:用户注册
    app.get('/admin/userdetail/:id', Admin.adminRequired, User.userDetail);//PAGE:用户详情
    app.get('/admin/userupdate/:id', Admin.adminRequired, User.userUpdate);//PAGE:用户更新
    app.get('/admin/usersearch/:room_id', Admin.adminRequired, User.userSearch);//PAGE：用户检索
    app.post('/admin/userquery/:page', Admin.adminRequired, User.userQuery);//PAGE:用户查询
    app.post('/admin/user/signup', Admin.adminRequired, User.signUp);//FORM：用户注册
    app.post('/admin/user/update', Admin.adminRequired, User.update);//FORM：用户更新
    app.delete('/admin/user/delete', Admin.adminRequired, User.delete);//JSON：用户删除
    app.get('/admin/user/forbidden', Admin.adminRequired, User.forbidden);//JSON：用户禁止

    /*Admin-Message*/
    app.get('/admin/messagelist/:page', Admin.adminRequired, Message.messageList);//PAGE：信息列表
    app.get('/admin/messagesearch', Admin.adminRequired,Message.messageSearch);//PAG：信息检索
    app.post('/admin/messagequery/:page', Admin.adminRequired, Message.query);//PAGE：信息查询

    app.get('/admin/room/messagelist/:room/:page',Admin.adminRequired,Message.roomMessageList);//PAGE:所选房间，所选页面的信息查询

    /*Admin-Picture*/
    app.get('/admin/pictureroom/:id', Admin.adminRequired, Picture.pictureList);//PAGE:图片列表
    app.get('/admin/pictureupload/:room', Admin.adminRequired, Picture.pictureUpload);//PAGE:图片上传
    app.get('/admin/pictureupdate/:img', Admin.adminRequired, Picture.pictureUpdate);//PAGE:图片更新
    app.post('/admin/picture/update', Admin.adminRequired, multiparty(),Picture.savePic,Picture.update);//PAGE:图片更新
    app.delete('/admin/picture/delete', Admin.adminRequired, Picture.delete);//JSON：图片删除

    app.use(function(req, res) {
        res.status(404).send('Sorry cant find that!');
    });

    app.use(function(err, req, res,next) {
        if(err.stack){
            res.status(500).send('Something broke!<br>'+err.stack.replace(/[\n]+/g,'<br>'));
        }
        else if(err.state==='fail'){
            res.json(err)
        }
        else{
            res.status(500).send(err)
        }
    });

    /*socket.io*/
    io.on('connection', function (socket) {
        let user;
        let room;

        /*房间人员增加*/
        if (socket.request.session.admin) {
            user = socket.request.session.admin;
            User.onLine(user._id, function (err) {
                if(err){
                    console.log(err)
                }
                users.push(user._id);
                io.emit('usersAdd', user._id);
            });
        }else{
            tourists++;
        }


        /*房间分组*/
        if(user&&user.room){
            room=user.room;
            if(rooms[room]){
                rooms[room]++;
            }else{
                rooms[room]=1;
            }
            socket.join(room);
        }


        io.to(room).emit('online', (tourists+rooms[room]));

        socket.on('message', function (msg) {
            Message.save(msg,user, function (message) {
                socket.broadcast.to(room).emit('message', message);
                socket.emit('selfBack',message);
            });
        });

        socket.on('checkMessage',function(msg){
            Message.checkMessage(msg,user,function(message,checker){
                io.to(room).emit('checkedMessage',message,checker);
            })
        });

        socket.on('delMessage',function(msg){
            Message.delMessage(msg,user,function(message){
                io.to(room).emit('delMessage',message);
            })
        });

        socket.on('disconnect', function () {
            let delNum;
            if (user) {
                delNum=users.indexOf(user._id);
                users.splice(delNum, 1);
                User.offLine(user._id, function () {
                    io.emit('usersMinus', user._id)
                });

                if(room){
                    socket.leave(room);
                    rooms[room]--;
                    if(rooms[room]===0){
                        rooms[room]=undefined;
                    }
                }
            }else{
                tourists--;
            }
            io.to(room).emit('online', (tourists+rooms[room]));
        });

    })
};
