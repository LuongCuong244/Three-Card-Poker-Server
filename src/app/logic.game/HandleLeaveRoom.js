const RoomModel = require('../models/Room');
const UserModel = require('../models/User');
const cancelCountdown = require('./NewGame').cancelCountdown;
const countdownOfNewGame = require('./NewGame').countdownOfNewGame;
const RoomManager_RunningGame = require('../logic.game/TimeManagement/RunningGame_Manager');
const RoomManager_Ready = require('../logic.game/TimeManagement/Ready_Manager');
const StartGameManager = require('./Manager/StartGameManager');
const findANewOwner = require('./Module/FindANewOwner');
const displayAllRooms = require('../socketIO/modules/DisplayAllRooms');

const PLAYER_KEYS = require('../../variables').PLAYER_KEYS;

const handelLeaveRoom = (roomSocket, roomName, userName) => {

    RoomModel.find({ roomName: roomName })
        .then(async (rooms) => {
            if (rooms.length !== 1) {
                console.log("Tên bàn không là duy nhất! - HandleLeaveRoom");
                return;
            }

            console.log("Rời bàn!");

            let room = rooms[0];

            if (room.isRunning) {  // game đang chạy
                for (let key of PLAYER_KEYS) {
                    if (room[key]) {
                        if (room[key].userName === userName) {
                            if (room[key].isWaiting) {
                                room.playersInRoom.splice(room.playersInRoom.indexOf(room[key].userName), 1);
                                room[key] = null;
                                roomSocket.in(roomName).emit('set_user_null', key);
                            } else {
                                room[key].stillInTheRoom = false;
                            }
                            await RoomModel.updateOne({ roomName: roomName }, {
                                [key]: room[key],
                                playersInRoom: room.playersInRoom
                            })
                            roomSocket.in(roomName).emit('game_room_update', {
                                [key]: room[key],
                            })
                            break;
                        }
                    }
                }
            } else {
                if (room.playersInRoom.length === 1) { // còn có 1 đứa mà nó cũng đi
                    await RoomModel.findOneAndRemove({ roomName: roomName });
                    console.log("Xóa HandleLeaveRoom-1");
                    RoomManager_RunningGame.deleteItem(roomName); // xóa trình quản lý thời gian tại server
                    RoomManager_Ready.deleteItem(roomName);
                    StartGameManager.deleteItem(roomName);
                } else {

                    for (let key of PLAYER_KEYS) {
                        if (room[key]) {
                            if (room[key].userName === userName) {
                                room.playersInRoom.splice(room.playersInRoom.indexOf(room[key].userName), 1); // xóa người chơi
                                room[key] = null;
                                await RoomModel.updateOne({ roomName: roomName }, {
                                    [key]: room[key],
                                    playersInRoom: room.playersInRoom
                                })
                                roomSocket.in(roomName).emit('set_user_null', key);

                                let numberUsers = room.playersInRoom.length;

                                if (numberUsers === 1) {
                                    cancelCountdown(roomSocket, roomName); // hủy đếm ngược ở server.
                                    roomSocket.in(roomName).emit('hide_ready_button'); // hủy đếm ngược ở client.
                                    if (!room.ownerOfRoom) {
                                        // kiểm tra người chơi còn lại xứng đáng làm chủ bàn không, nếu sai thì kích
                                        for (let key of PLAYER_KEYS) {
                                            if (room[key]) {
                                                if (room[key].coin < 9 * room.minBet) {
                                                    roomSocket.in(roomName).emit('kick_off_room', room[key].userName, "Bạn bị thoát do không đủ điều kiện làm chủ bàn!");
                                                    // xóa phòng
                                                    await RoomModel.findOneAndRemove({ roomName: roomName });
                                                    console.log("Xóa HandleLeaveRoom-2");
                                                    RoomManager_RunningGame.deleteItem(roomName); // xóa trình quản lý thời gian tại server
                                                    RoomManager_Ready.deleteItem(roomName);
                                                    StartGameManager.deleteItem(roomName);
                                                    break;
                                                } else {
                                                    console.log("Mất chủ bàn!");
                                                    // tìm những người đủ điều kiện làm chủ bàn và gửi
                                                    findANewOwner(roomSocket, room);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                } else if (numberUsers > 1) {
                                    if (room.ownerOfRoom) {
                                        roomSocket.in(roomName).emit('start_countdown_ofNewGame'); // restart ở client
                                        countdownOfNewGame(roomSocket, roomName); // restart ở server
                                    } else {
                                        cancelCountdown(roomSocket, roomName); // hủy đếm ngược ở server.
                                        roomSocket.in(roomName).emit('hide_ready_button'); // hủy đếm ngược ở client.

                                        console.log("Mất chủ bàn!");
                                        // tìm những người đủ điều kiện làm chủ bàn và gửi
                                        findANewOwner(roomSocket, room);
                                    }
                                } else {
                                    console.log('Game lỗi! - HandleLeaveRoom');
                                }
                            } else {
                                if (room[key].confirmBet) {
                                    room[key].confirmBet = false;
                                    await RoomModel.updateOne({ roomName: roomName }, {
                                        [key]: room[key],
                                    })
                                }
                            }
                        }
                    }
                }
            }
            displayAllRooms(roomSocket);
        })
        .catch(err => console.log(err))
}

module.exports = {
    handelLeaveRoom
};