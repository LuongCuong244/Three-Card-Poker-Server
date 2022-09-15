const Room = require("../models/Room");
const Statistical = require('../models/Statistical');
const handleEndGame = require('../logic.game/HandleEndGame').handleEndGame;
const PLAYER_KEYS = require('../../variables').PLAYER_KEYS;
const timeManagement = require('./TimeManagement/RunningGame_Manager').timeManagement;

const countdownOfRunningGame = async (roomSocket, roomName) => {
    let countDown = timeManagement.get(roomName).countDown;
    if (countDown) {
        timeManagement.set(roomName, {
            time: 15,
            countDown: null,
        })
        await clearInterval(countDown);
    }
    let time = timeManagement.get(roomName).time;
    timeManagement.get(roomName).countDown = setInterval(() => {
        if (time <= 0) {
            // lật hết lá bài
            Room.find({ roomName: roomName })
                .then(async (rooms) => {
                    if (rooms.length !== 1) {
                        console.log("Tên bàn không là duy nhất! -countdownOfRunningGame");
                        return;
                    }
                    let room = rooms[0];
                    for (let key of PLAYER_KEYS) {
                        if (room[key]?.isWaiting === false) {
                            room[key].flipFirstCard = true;
                            room[key].flipSecondCard = true;
                            room[key].flipThirdCard = true;
                            await Room.updateOne({ roomName: roomName }, {
                                [key]: room[key]
                            })
                        }
                    }
                    showResult(roomSocket, roomName);
                })
                .catch(err => console.log(err));
        } else {
            timeManagement.set(roomName, {
                time: time - 1,
                countDown: timeManagement.get(roomName).countDown
            })
            time--;
        }
    }, 1000)
}

let isShowResult = false;

const showResult = async (roomSocket, roomName) => {
    let countDown = timeManagement.get(roomName).countDown;
    if (countDown) {
        timeManagement.set(roomName, {
            time: 15,
            countDown: null,
        })
        await clearInterval(countDown);
    }
    console.log('hiển thị kết quả!');
    if (isShowResult) {
        return;
    }
    isShowResult = true;
    setTimeout(() => {
        isShowResult = false;
    }, 3000);

    Room.find({ roomName: roomName })
        .then(async (rooms) => {
            if (rooms.length !== 1) {
                console.log("Tên bàn không là duy nhất! -showResult");
                return;
            }
            let room = rooms[0];

            let totalWin = 0;
            let totalLost = 0;
            let cardOwner_1 = room.ownerOfRoom.firstCard;
            let cardOwner_2 = room.ownerOfRoom.secondCard;
            let cardOwner_3 = room.ownerOfRoom.thirdCard;
            let scoreOwner_1 = parseInt(cardOwner_1.charAt(cardOwner_1.length - 1));
            let scoreOwner_2 = parseInt(cardOwner_2.charAt(cardOwner_2.length - 1));
            let scoreOwner_3 = parseInt(cardOwner_3.charAt(cardOwner_3.length - 1));
            let scoreOwner = (scoreOwner_1 + scoreOwner_2 + scoreOwner_3) % 10;
            if (scoreOwner === 0) {
                scoreOwner = 10;
            }
            let response = {};
            for (let key of PLAYER_KEYS) {
                if (room[key] && key != 'ownerOfRoom' && room[key].isWaiting === false) {
                    let res = compareScore(room[key], room.ownerOfRoom);
                    if (res[0] === 'Win') {
                        totalLost++;
                    } else {
                        totalWin++;
                    }
                    room[key].status = res[0];
                    handleStatistical(room[key].userName, room[key].status, res[1]);
                    await Room.updateOne({ roomName: roomName }, {
                        [key]: room[key]
                    })
                    response[key] = room[key];
                }
            }
            handleStatistical(
                room.ownerOfRoom.userName,
                totalWin - totalLost > 0 ? 'Win' : 'Lost', // nếu thắng nhiều người chơi hơn thua thì chủ phòng thắng
                scoreOwner,
                totalWin - totalLost, // nếu === 0 thì là hòa
            )
            roomSocket.in(roomName).emit('hide_countdown');
            roomSocket.in(roomName).emit('update_entire_room', {
                ...response,
                'ownerOfRoom': room.ownerOfRoom
            });
            setTimeout(() => {
                handleEndGame(roomSocket, roomName);
            }, 3000)
        })
        .catch(err => console.log(err))
}

const compareScore = (guest, owner) => {

    let cardGuest_1 = guest.firstCard;
    let cardGuest_2 = guest.secondCard;
    let cardGuest_3 = guest.thirdCard;
    let cardOwner_1 = owner.firstCard;
    let cardOwner_2 = owner.secondCard;
    let cardOwner_3 = owner.thirdCard;

    let scoreGuest_1 = parseInt(cardGuest_1.charAt(cardGuest_1.length - 1));
    let scoreGuest_2 = parseInt(cardGuest_2.charAt(cardGuest_2.length - 1));
    let scoreGuest_3 = parseInt(cardGuest_3.charAt(cardGuest_3.length - 1));
    let scoreOwner_1 = parseInt(cardOwner_1.charAt(cardOwner_1.length - 1));
    let scoreOwner_2 = parseInt(cardOwner_2.charAt(cardOwner_2.length - 1));
    let scoreOwner_3 = parseInt(cardOwner_3.charAt(cardOwner_3.length - 1));


    let scoreGuest = (scoreGuest_1 + scoreGuest_2 + scoreGuest_3) % 10;
    let scoreOwner = (scoreOwner_1 + scoreOwner_2 + scoreOwner_3) % 10;

    if (scoreGuest === 0) {
        scoreGuest = 10;
    }
    if (scoreOwner === 0) {
        scoreOwner = 10;
    }

    if (scoreGuest > scoreOwner) {
        return ['Win', scoreGuest];
    }
    if (scoreGuest < scoreOwner) {
        return ['Lost', scoreGuest];
    }

    // Thuật toán:
    /*
        rô: score*1000 (nếu là 1 thì score*10) -> phổ điểm {2000,3000,4000,5000,6000,7000,8000,9000,10000}
        cơ: score*100 (nếu là 1 thì score*10) -> phổ điểm {200,300,400,500,600,700,800,900,1000}
        tép: score*10 (nếu là 1 thì score*10) -> phổ điểm {20,30,40,50,60,70,80,90,100}
        bích: giữ nguyên (nếu là 1 thì score*10) -> phổ điểm {2,3,4,5,6,7,,9,10}
    */
    let object = {
        'ro': 1000,
        'co': 100,
        'tep': 10,
        'bich': 1
    }
    let arr = Object.keys(object);
    let maxGuest_1, maxGuest_2, maxGuest_3;
    let maxOwner_1, maxOwner_2, maxOwner_3;
    for (let item of arr) {
        if (cardGuest_1.startsWith(item)) {
            maxGuest_1 = scoreGuest_1 * object[item];
        }
        if (cardGuest_2.startsWith(item)) {
            maxGuest_2 = scoreGuest_2 * object[item];
        }
        if (cardGuest_3.startsWith(item)) {
            maxGuest_3 = scoreGuest_3 * object[item];
        }
        if (cardOwner_1.startsWith(item)) {
            maxOwner_1 = scoreOwner_1 * object[item];
        }
        if (cardOwner_2.startsWith(item)) {
            maxOwner_2 = scoreOwner_2 * object[item];
        }
        if (cardOwner_3.startsWith(item)) {
            maxOwner_3 = scoreOwner_3 * object[item];
        }
    }
    if (Math.max(maxGuest_1, maxGuest_2, maxGuest_3) > Math.max(maxOwner_1, maxOwner_2, maxOwner_3)) {
        return ['Win', scoreGuest];
    } else {
        return ['Lost', scoreGuest];
    }
}

const handleStatistical = async (userName, status, score, differenceOfTwoNumbers) => {

    Statistical.find({ userName: userName })
        .then(async (resQuery) => {
            if (resQuery.length !== 1) {
                console.log("Thống kê không là duy nhất!");
                return;
            }
            let update = {
                numberOfGamesPlayed: resQuery[0].numberOfGamesPlayed + 1,
                numberOfGamesWon: status === 'Win' ? resQuery[0].numberOfGamesWon + 1 : resQuery[0].numberOfGamesWon,
                currentWinStreak: status === 'Win' ? resQuery[0].currentWinStreak + 1 : 0,
                getTenScore: score === 10 ? resQuery[0].getTenScore + 1 : resQuery[0].getTenScore,
                getOneScore: score === 1 ? resQuery[0].getOneScore + 1 : resQuery[0].getOneScore,
            }
            if (update.currentWinStreak > resQuery[0].longestWinStreak) {
                update.longestWinStreak = update.currentWinStreak;
            }
            if (differenceOfTwoNumbers === 0) {
                update.numberOfGamesDraw = resQuery[0].numberOfGamesDraw + 1;
            }
            await Statistical.updateOne({ userName: userName }, update);
        })
        .catch(err => console.log(err, ' - handleStatistical - ', 'ShowResultWinOrLost'))
}

module.exports = {
    countdownOfRunningGame,
    showResult,
}