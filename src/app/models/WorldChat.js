const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WorldChat = new Schema({
    messages: [Object],
    name: {type: String, default: 'WorldChat'},
},{
    timestamps: true,
});

module.exports =  mongoose.model('WorldChat',WorldChat);