const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
    userName: { type: String, trim: true, maxlength: 50, required: true, unique: true },
    email: { type: String, trim: true, unique: true, required: true },
    password: { type: String },
    avatar: String,
    coin: { type: Number, required: true }, // lấy theo ID
    diamond: { type: Number, required: true },
    refreshToken: String,
    roles: { type: Array, required: true }
}, {
    timestamps: true,
});

module.exports = mongoose.model('User', User);