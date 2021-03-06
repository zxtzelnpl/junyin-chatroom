const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const bcrypt = require('bcryptjs');
const SALT_WORK_FACTOR = 10;


let UserSchema = new Schema({
    name: {
        unique: true
        , type: String
    }
    , nickName: String
    , password: String
    , phone: String
    , email: String
    , sex: String
    , level: {
        type: String
        , default: 0
    }
    ,online:{
        type:Boolean
        ,default:false
    }
    , createAt: {
        type: Date
        , default: Date.now
    }
    , updateAt: {
        type: Date
        , default: Date.now
    }
    , forbidden: {
        type: Boolean
        , default: false
    }
    , room:{
        type:ObjectId,
        ref:'Room'
    }
});

UserSchema.pre('save', function (next) {
    const user = this;
    if (user.isNew) {
        user.createAt = this.updateAt = Date.now()
    } else {
        user.updateAt = Date.now();
    }
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) {
            return next(err)
        }
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) {
                return next(err)
            }
            user.password = hash;
            next()
        })
    })
});

UserSchema.methods = {
    comparePassword: function (_password) {
        return bcrypt.compare(_password, this.password)
    }
};

module.exports = UserSchema;
