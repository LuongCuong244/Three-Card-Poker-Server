const Room = require('../models/Room');
const PLAYER_KEYS = require('../../variables').PLAYER_KEYS
const timeManagement = require('./TimeManagement/Ready_Manager').timeManagement;
const displayAllRooms = require('../socketIO/modules/DisplayAllRooms');

const cancelCountdown = async (roomSocket, roomName) => {
    let countDown = timeManagement.get(roomName)?.countDown;

    if (countDown) {
        timeManagement.set(roomName, {
            time: 5,
            countDown: null,
        })
        await clearInterval(countDown);
    }
    roomSocket.in(roomName).emit('hide_ready_button');
}

const countdownOfNewGame = async (roomSocket, roomName) => {
    let countDown = timeManagement.get(roomName)?.countDown;
    if (countDown) {
        timeManagement.set(roomName, {
            time: 5,
            countDown: null,
        })
        await clearInterval(countDown);
    }
    let time = timeManagement.get(roomName)?.time || 5;
    timeManagement.get(roomName).countDown = setInterval(() => {
        console.log('time', time);
        if (time <= 0) {
            newGame(roomSocket, roomName);
        } else {
            timeManagement.set(roomName,{
                time: time - 1,
                countDown: timeManagement.get(roomName)?.countDown
            })
            time--;
        }
    }, 1000)
}

const newGame = async (roomSocket, roomName) => {  // được gọi khi tất cả đã sẵn sàng
    let countDown = timeManagement.get(roomName)?.countDown;
    if (countDown) {
        timeManagement.set(roomName, {
            time: 5,
            countDown: null,
        })
        await clearInterval(countDown);
    }
    Room.find({ roomName: roomName })
        .then(async (rooms) => {
            if (rooms.length !== 1) {
                console.log('Tên phòng không là duy nhất! -NewGame-');
                return;
            }
            console.log('New Game');
            let room = rooms[0];
            let totalBet = 0;
            for (let key of PLAYER_KEYS) {
                if (room[key]) {
                    room[key].confirmBet = false;
                    if (key !== 'ownerOfRoom') {
                        totalBet += room[key].bet;
                    }
                    await Room.updateOne({ roomName: roomName }, {
                        [key]: room[key],
                        isRunning: true,
                    })
                }
            }
            if(totalBet > room.ownerOfRoom.coin ){
                totalBet = room.ownerOfRoom.coin;
            }
            roomSocket.in(roomName).emit('hide_ready_button');
            roomSocket.in(roomName).emit('appear_total_bet', totalBet);
            displayAllRooms(roomSocket);
        })
        .catch(err => console.log(err))
}

module.exports = {
    countdownOfNewGame,
    newGame,
    cancelCountdown,
};

