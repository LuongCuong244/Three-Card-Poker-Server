const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Statistical = new Schema({
    userName: {type: String, trim: true, maxlength: 50, required: true, unique: true},
    numberOfGamesPlayed: {type: Number, default: 0},
    numberOfGamesWon: {type: Number, default: 0},
    numberOfGamesDraw: {type: Number, default: 0},
    currentWinStreak: {type: Number, default: 0},
    longestWinStreak: {type: Number, default: 0},
    getTenScore: {type: Number, default: 0},
    getOneScore: {type: Number, default: 0},
},{
    timestamps: true,
});

module.exports =  mongoose.model('Statistical',Statistical);