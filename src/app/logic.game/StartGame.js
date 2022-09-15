const RoomModel = require('../models/Room');
const UserModel = require('../models/User');
const countdownOfRunningGame = require('../logic.game/ShowResultWinOrLost').countdownOfRunningGame;

const PLAYER_KEYS = require('../../variables').PLAYER_KEYS;
const LIST_CARDS = require('../../variables').LIST_CARDS;

const StartGameManager = require('./Manager/StartGameManager');

const distributeCards = async (room, roomName) => {
    console.log("Chia bài");

    let list = [].concat(LIST_CARDS);
    let arr = [];
    let i = 36; // tổng số lá bài 4*9 = 36
    let numberOfCard = 3 * room.playersInRoom.length;
    while (arr.length <= 3 * numberOfCard) {
        let rd = Math.floor(Math.random() * i);
        if (rd >= i) {
            rd = i - 1;
        }
        arr.push(list[rd]);
        list.splice(rd, 1);
        i--;
    }
    let index = 0;
    await PLAYER_KEYS.forEach(async (key) => {
        if (room[key] && !room[key].isWaiting) {
            room[key].firstCard = arr[index];
            room[key].secondCard = arr[index + 1];
            room[key].thirdCard = arr[index + 2];
            room[key].flipFirstCard = false;
            room[key].flipSecondCard = false;
            room[key].flipThirdCard = false;
            index += 3;
            await RoomModel.updateOne({ roomName: roomName }, {
                [key]: room[key],
            })
        }
    })
}

const changeBet = (roomSocket, room, totalBet) => {
    const missingCoins = totalBet - room.ownerOfRoom.coin; // số tiền chủ bàn không đủ.
    let excessCoins = totalBet - ((room.playersInRoom.length - 1) * room.minBet); // tổng số tiền mà người dùng dư so với minBet.

    let res = 0;
    PLAYER_KEYS.forEach((key) => {
        if (room[key] && key !== 'ownerOfRoom') {
            let value = Math.floor(room[key].bet - missingCoins * ((room[key].bet - room.minBet) / excessCoins));
            res += value;

            if(value !== room[key].bet){
                roomSocket.in(room.roomName).emit('update_bet',room[key].userName, value);
            }
            room[key].bet = value;
        }
    })
    return res;
}

const updateCoin = async (roomSocket, room) => {
    let totalBet = 0;
    for (let key of PLAYER_KEYS) {
        if (room[key] && key !== 'ownerOfRoom') {
            totalBet += room[key].bet;
        }
    }

    await UserModel.find({ userName: room.ownerOfRoom.userName })
        .then(async (users) => {
            if (users.length !== 1) {
                console.log("Tên người dùng không là duy nhất -StartGame-");
                return;
            }
            let user = users[0];
            if (totalBet > user.coin) {
                // thuật toán chia tiền ở đây
                totalBet = changeBet(roomSocket, room, totalBet);
            }
            for (let key of PLAYER_KEYS) {
                if (room[key] && key !== 'ownerOfRoom') {
                    await UserModel.find({ userName: room[key].userName })
                        .then(async (users) => {
                            if (users.length !== 1) {
                                console.log("Tên người dùng không là duy nhất -StartGame-");
                                return;
                            }
                            let user = users[0];
                            room[key].coin = user.coin - room[key].bet;
                            await UserModel.updateOne({ userName: room[key].userName }, {
                                coin: user.coin - room[key].bet,
                            })
                        })
                }
            }
            room.ownerOfRoom.coin = user.coin - totalBet;
            await UserModel.updateOne({ userName: room.ownerOfRoom.userName }, {
                coin: user.coin - totalBet
            })
        })
    roomSocket.in(room.roomName).emit('update_coin', room);
}

const startGame = (roomSocket, roomName) => {
    if (StartGameManager.getItem(roomName) === false) {  // người gửi request đầu tiên sẽ kích hoạt chia bài
        StartGameManager.updateItem(roomName, true);
        setTimeout(() => {
            StartGameManager.updateItem(roomName, false);
            console.log("Set chia bài: false");
        }, 2500);
        RoomModel.find({ roomName: roomName })
            .then(async (rooms) => {
                if (rooms.length !== 1) {
                    console.log("Tên bàn không thống nhất!");
                    return;
                }
                let room = rooms[0];

                await updateCoin(roomSocket, room);
                await distributeCards(room, roomName);

                countdownOfRunningGame(roomSocket, roomName); // bắt đầu đếm ngược ở server;

                roomSocket.in(roomName).emit('start_running_game');
                roomSocket.in(roomName).emit('update_entire_room', room); // load lại phòng
            })
            .catch(err => console.log(err))
    }
}

module.exports = startGame;