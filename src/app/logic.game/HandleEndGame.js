const RoomModel = require('../models/Room');
const UserModel = require('../models/User');
const StatisticalModel = require('../models/Statistical');
const countdownOfNewGame = require('../logic.game/NewGame').countdownOfNewGame;
const RoomManager_Ready = require('../logic.game/TimeManagement/Ready_Manager');
const RoomManager_RunningGame = require('../logic.game/TimeManagement/RunningGame_Manager');
const StartGameManager = require('./Manager/StartGameManager');
const PLAYER_KEYS = require('../../variables').PLAYER_KEYS;
const findANewOwner = require('./Module/FindANewOwner');
const displayAllRooms = require('../socketIO/modules/DisplayAllRooms');

const handleEndGame = (roomSocket, roomName) => {

    console.log("đang xử lý endgame");

    // kiểm tra xem chủ bàn có trong bàn không
    RoomModel.find({ roomName: roomName })
        .then(async (rooms) => {
            if (rooms.length !== 1) {
                console.log("Tên bàn không là duy nhất! - handleEndGame");
                return;
            }
            let room = rooms[0];
            let listUsers = {};

            // lấy thông tin của tất cả người chơi có trong bàn
            await getListUsers(room, listUsers);

            // đặt trạng thái game
            setStatusGame(room);

            // tính tiền
            await handleCoin(roomSocket, room, listUsers);

            // xử lý những người đang đợi, và còn trong bàn
            handleWaiting(room);

            // kiểm tra điều kiện để ở trong bàn
            checkCondition(roomSocket, roomName, room, listUsers);

            // setup lại bài
            setUpCardsStatus(room);

            if (room.playersInRoom.length === 0) {
                console.log("Xóa bàn - handleEndGame");
                await RoomModel.findOneAndRemove({ roomName: roomName });

                RoomManager_RunningGame.deleteItem(roomName);
                RoomManager_Ready.deleteItem(roomName); // xóa trình quản lý thời gian tại server
                StartGameManager.deleteItem(roomName);

                try {
                    displayAllRooms(roomSocket);
                } catch (error) {
                    console.log(error, '-handleEndGame-');
                }
                return;
            }
            // update
            await RoomModel.findOneAndUpdate({ roomName: roomName }, {
                ...room
            });
            roomSocket.in(roomName).emit('update_entire_room', room);

            // kiểm tra xem chủ bàn còn hay mất.
            if (room.ownerOfRoom) {
                if (room.playersInRoom.length > 1) {
                    roomSocket.in(roomName).emit('start_countdown_ofNewGame'); // đếm ngược ở client
                    countdownOfNewGame(roomSocket, roomName); // đếm ngược ở server
                    console.log("game mới");
                }
            } else {
                console.log("Mất chủ bàn! -EndGame-");
                // tìm những người đủ điều kiện làm chủ bàn và gửi
                findANewOwner(roomSocket, room);
            }
            try {
                displayAllRooms(roomSocket);
            } catch (error) {
                console.log(error, '-handleEndGame-');
            }
        })
        .catch(err => console.log(err))

}

async function getListUsers(room, listUsers) {
    for (let key of PLAYER_KEYS) {
        if (!room[key]) {
            continue;
        }
        await UserModel.find({ userName: room[key].userName })
            .then((users) => {
                if (users.length !== 1) {
                    console.log("Tên người chơi không là duy nhất!");
                    return;
                }
                listUsers[key] = users[0];
            })
            .catch(err => console.log(err))
    }
}

function setStatusGame(room) {
    room.isRunning = false;
}

async function handleCoin(roomSocket, room, listUsers) {
    let coinOfOwner = listUsers.ownerOfRoom.coin; // để tính toán xem chủ bàn mất hay được bao nhiêu.

    for (let i = 0; i < 9; i++) {
        let key = PLAYER_KEYS[i];
        if (!room[key]) {
            continue;
        }
        if (room[key].isWaiting) {
            continue;
        }
        switch (room[key].status) {
            case 'Win': {
                await UserModel.updateOne({ userName: room[key].userName }, {
                    coin: listUsers[key].coin + 2 * room[key].bet,
                })
                room[key].coin = listUsers[key].coin + 2 * room[key].bet;
                break;
            }
            case 'Lost': {
                coinOfOwner += 2 * room[key].bet;
                break;
            }
            default: {
                'Lỗi trạng thái game: Không thắng không thua!';
            }
        }
    }
    await UserModel.updateOne({ userName: listUsers.ownerOfRoom.userName }, {
        coin: coinOfOwner,
    })
    room.ownerOfRoom.coin = coinOfOwner;
    roomSocket.in(room.roomName).emit('update_coin', room);
}

function handleWaiting(room) {
    PLAYER_KEYS.forEach((key) => {
        if (room[key]) {
            if (room[key].stillInTheRoom === false) {
                room.playersInRoom.splice(room.playersInRoom.indexOf(room[key].userName), 1); // xóa bỏ phần tử trong danh sách người trong phòng
                room[key] = null;
                return;
            }
            if (room[key].isWaiting) {
                room[key].isWaiting = false;
            }
        }
    })
}

function checkCondition(roomSocket, roomName, room, listUsers) {
    for (let key of PLAYER_KEYS) {
        if (room[key]) {
            if (room[key].coin < room.minBet) {
                roomSocket.in(roomName).emit('kick_off_room', room[key].userName, "Bạn không đủ tiền cược để ở phòng này!");
                continue;
            }
            if (room[key].newBet > room[key].coin) {
                room[key].newBet = room[key].coin;
            }
            room[key].bet = room[key].newBet;
            if (listUsers[key].connected === false) {
                room.playersInRoom.splice(room.playersInRoom.indexOf(room[key].userName), 1); // xóa bỏ phần tử trong danh sách người trong phòng
                room[key] = null;
            }
        }
    }
    if (room.ownerOfRoom) {
        if (room.ownerOfRoom.coin < 9 * room.minBet) { // chủ bàn phải có số tiền ít nhất là 9 lần mức cược nhỏ nhất
            roomSocket.in(roomName).emit('kick_off_room', room.ownerOfRoom.userName, "Bạn bị thoát do không đủ điều kiện làm chủ bàn!");
        }
    }
}

function setUpCardsStatus(room) {
    PLAYER_KEYS.forEach((key) => {
        if (room[key]) {
            room[key].firstCard = null;
            room[key].secondCard = null;
            room[key].thirdCard = null;
            room[key].flipFirstCard = false;
            room[key].flipSecondCard = false;
            room[key].flipThirdCard = false;
            room[key].status = 'No';
        }
    })
}

module.exports = {
    handleEndGame,
}