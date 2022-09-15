const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Room = new Schema({
    roomName: {type: String, trim: true, maxlength: 50, required: true, unique: true},
    roomPassword: {type: String, trim: true, maxlength: 50},
    minBet: {type: Number, default: 1000},
    messages: [Object],
    ownerOfRoom: Object,
    firstPlayer: Object,
    secondPlayer: Object,
    thirdPlayer: Object,
    fourthPlayer: Object,
    fifthPlayer: Object,
    sixthPlayer: Object,
    seventhPlayer: Object,
    eighthPlayer: Object,
    ninthPlayer: Object,
    playersInRoom: [String],
    viewersInRoom: [String],
    isRunning: Boolean,
},{
    timestamps: true,
});

module.exports =  mongoose.model('Room',Room);