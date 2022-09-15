const RoomModel = require('../../models/Room');
const UserModel = require('../../models/User');
const WorldChatModel = require('../../models/WorldChat');
const moduleNewGame = require('../../logic.game/NewGame');
const startGame = require('../../logic.game/StartGame');
const PLAYER_KEYS = require('../../../variables').PLAYER_KEYS;
const showResult = require('../../logic.game/ShowResultWinOrLost').showResult;
const handelLeaveRoom = require('../../logic.game/HandleLeaveRoom').handelLeaveRoom;
const countdownOfNewGame = require('../../logic.game/NewGame').countdownOfNewGame;
const timeManagement = require('../../logic.game/TimeManagement/RunningGame_Manager').timeManagement;
const RoomManager_RunningGame = require('../../logic.game/TimeManagement/RunningGame_Manager');
const RoomManager_Ready = require('../../logic.game/TimeManagement/Ready_Manager');
const StartGameManager = require('../../logic.game/Manager/StartGameManager');
const FindOwnerCountdown = require('../../logic.game/TimeManagement/FindOwnerCountdown');
const displayAllRooms = require('../modules/DisplayAllRooms');
const findANewOwner = require('../../logic.game/Module/FindANewOwner');

class RoomSocketController {

    // _userReconnect(io, socket, roomName, userName, playerKey) {
    //     socket.join(roomName);
    //     socket.emit('set_game_time', timeManagement.get(roomName)?.time);
    //     RoomModel.findOne({roomName: roomName})
    //         .then((room) => {
    //             if(!room){
    //                 return console.log("Phòng không tồn tại: -userReconnect");  
    //             }
    //             console.log("???", playerKey);
    //             if(!room[playerKey]){
    //                 console.log('The Game Has Finished!');
    //                 return;
    //             }
    //             room[playerKey].stillInTheRoom = true;
    //             RoomModel.updateOne({roomName: roomName}, {
    //                 [playerKey]: room[playerKey],
    //             })
    //         })
    //         .catch(err => console.log(err))
    // }

    _displayAllRooms(io) {
        displayAllRooms(io);
    }

    _resetReadyCounter(io, socket, roomName, data) {

        // socket.rooms trả về 1 set

        if (!socket.rooms.has(roomName)) { // kiểm tra xem có trong phòng chưa
            socket.join(roomName);
        }
        io.in(roomName).emit('update_entire_room', data);
    }

    _joinRoom(socket, roomName) {
        socket.join(roomName);
    }

    _leaveRoom(io, socket, roomName, userName) {
        socket.leave(roomName);
        handelLeaveRoom(io, roomName, userName);
    }

    _ready(io, roomName, playerKey) {
        RoomModel.find({ roomName: roomName })
            .then(async (rooms) => {
                if (rooms.length !== 1) {
                    return;
                }
                let room = rooms[0];
                room[playerKey].confirmBet = true;
                await RoomModel.updateOne({ roomName: roomName }, {
                    [playerKey]: room[playerKey],
                })
                let count = 0;
                PLAYER_KEYS.forEach((playerKey) => {
                    if (room[playerKey]) {
                        if (room[playerKey].confirmBet) {
                            count++;
                        }
                    }
                })
                console.log(playerKey);
                io.in(roomName).emit('game_room_update', {
                    [playerKey]: room[playerKey]
                });
                if (count === room.playersInRoom.length) {
                    moduleNewGame.newGame(io, roomName);
                }
            })
    }

    _countdownOfNewGame(io, roomName) {
        io.in(roomName).emit('start_countdown_ofNewGame');
        moduleNewGame.countdownOfNewGame(io, roomName);
    }

    _startGame(io, roomName) { // được gọi khi kết thúc hiển thị thanh tổng cược.
        startGame(io, roomName);
    }

    _flipCard(io, roomName, oderOfCard, playerKey) {
        RoomModel.find({ roomName: roomName })
            .then(async (rooms) => {
                if (rooms.length !== 1) {
                    console.log("Tên bàn không là duy nhất - _flipCard");
                    return;
                }
                let room = rooms[0];
                if (!room[playerKey].firstCard) {
                    return;
                }
                switch (oderOfCard) {
                    case 'First': {
                        room[playerKey].flipFirstCard = true;
                        break;
                    }
                    case 'Second': {
                        room[playerKey].flipSecondCard = true;
                        break;
                    }
                    case 'Third': {
                        room[playerKey].flipThirdCard = true;
                        break;
                    }
                    case 'All': {
                        room[playerKey].flipFirstCard = true;
                        room[playerKey].flipSecondCard = true;
                        room[playerKey].flipThirdCard = true;
                        break;
                    }
                    default: {
                        console.log("OderOfCard không khớp giá trị với client");
                        room[playerKey].flipFirstCard = true;
                        room[playerKey].flipSecondCard = true;
                        room[playerKey].flipThirdCard = true;
                        break;
                    }
                }
                await RoomModel.updateOne({ roomName: roomName }, {
                    [playerKey]: room[playerKey]
                })
                io.in(roomName).emit('game_room_update', {
                    [playerKey]: room[playerKey]
                })

                if (room[playerKey].flipFirstCard && room[playerKey].flipSecondCard && room[playerKey].flipThirdCard) {  // nếu đúng thì kiểm tra xem endGame được chưa.
                    for (let keyItem of PLAYER_KEYS) {
                        if (room[keyItem] && room[keyItem].isWaiting === false) {
                            if (!room[keyItem].flipFirstCard || !room[keyItem].flipSecondCard || !room[keyItem].flipThirdCard) {
                                return;
                            }
                        }
                    }
                    io.in(roomName).emit('hide_countdown');
                    showResult(io, roomName);
                }
            })
            .catch(err => console.log(err));
    }

    _setOwnerRoom(io, roomName, position) {
        RoomModel.find({ roomName: roomName })
            .then(async (rooms) => {
                if (rooms.length !== 1) {
                    console.log("Tên bàn không là duy nhất! -RoomSocketController.js _setOwnerRoom");
                    return;
                }
                if (rooms[0].ownerOfRoom) {
                    console.log("Đã có chủ bàn");
                    return;
                }
                let room = rooms[0];
                let key = PLAYER_KEYS[position - 1];
                if (room[key]) {
                    room.ownerOfRoom = {
                        ...room[key]
                    };
                    room[key] = null;
                    await RoomModel.updateOne({ roomName: roomName }, {
                        [key]: null,
                        ownerOfRoom: room.ownerOfRoom,
                    })
                    io.in(roomName).emit('set_position', room.ownerOfRoom.userName, 10);
                    io.in(roomName).emit('update_entire_room', room);
                    io.in(roomName).emit('hide_confirm_owner_room', room.ownerOfRoom.userName);
                    displayAllRooms(io);

                    console.log("Chủ bàn mới!");
                    if (room.playersInRoom.length > 1) {
                        io.in(roomName).emit('start_countdown_ofNewGame'); // đếm ngược ở client
                        countdownOfNewGame(io, roomName); // đếm ngược ở server
                        console.log("game mới");
                    }
                } else {
                    console.log("Vị trí không phù hợp -RoomSocketController-");
                }
            })
            .catch(err => console.log(err, '_setOwnerRoom', ' - RoomSocketController'))
    }

    _updateChangeBet(io, roomName, playerKey) {
        RoomModel.find({ roomName: roomName })
            .then((rooms) => {
                if (rooms.length !== 1) {
                    console.log("Tên bàn không là duy nhất! -RoomSocketController.js _updateChangeBet");
                    return;
                }
                let room = rooms[0];
                io.in(roomName).emit('game_room_update', {
                    [playerKey]: room[playerKey],
                });
            })
            .catch(err => console.log(err, '_updateChangeBet', ' - RoomSocketController _updateChangeBet'))
    }

    _getMessagesWorldChat(socket) {
        WorldChatModel.find({})
            .then(async (resQuery) => {
                if (resQuery.length < 1) {
                    let createWC = {
                        name: 'WorldChat',
                        messages: [],
                    }
                    await WorldChatModel.create(createWC, (err) => {
                        if (err) {
                            console.log("Lỗi khi khởi tạo WC: ", err);
                        }
                    })
                    console.log("Không có tin nhắn nào! -RoomSocketController.js");
                    return;
                }
                let allMessages = resQuery[0].messages;
                if (allMessages.length > 100) {
                    let size = allMessages.length;
                    allMessages.splice(size - 100, 100);  // chỉ lấy 100 tin nhắn.
                    await WorldChatModel.updateOne({ name: 'WorldChat' }, {
                        messages: allMessages,
                    })
                }
                socket.emit('all_mes_world_chat', allMessages);
            })
            .catch(err => console.log(err, '_getMessagesWorldChat', ' - RoomSocketController'))
    }

    _sendingMessageToWorldChat(io, message) {
        WorldChatModel.find({})
            .then(async (resQuery) => {
                if (resQuery.length < 1) {
                    let createWC = {
                        name: 'WorldChat',
                        messages: [],
                    }
                    await WorldChatModel.create(createWC, (err) => {
                        console.log("Lỗi khi khởi tạo WC: ", err);
                    })
                    console.log("Không có tin nhắn nào! -RoomSocketController.js");
                    return;
                }
                let allMessages = resQuery[0].messages;
                allMessages.push(message);
                await WorldChatModel.updateOne({ name: "WorldChat" }, {
                    messages: allMessages,
                })

                io.emit('update_messages_in_world_chat', message);
                io.emit('update_unseen_messages_number_world_chat');
            })
            .catch(err => console.log(err, '_sendingMessageToWorldChat', ' - RoomSocketController'))
    }

    _getAllMesChatRoom(socket, roomName) {
        RoomModel.find({ roomName: roomName })
            .then(async (resQuery) => {
                if (resQuery.length < 1) {
                    let createChatRoom = {
                        messages: [],
                    }
                    await RoomModel.create(createChatRoom, (err) => {
                        if (err) {
                            console.log("Lỗi khi khởi tạo chat room: ", err);
                        }
                    })
                    console.log("Không có tin nhắn nào! -RoomSocketController.js");
                    return;
                }
                let allMessages = resQuery[0].messages;
                if (allMessages.length > 100) {
                    let size = allMessages.length;
                    allMessages.splice(size - 100, 100);  // chỉ lấy 100 tin nhắn.
                    await RoomModel.updateOne({ roomName: roomName }, {
                        messages: allMessages,
                    })
                }
                socket.emit('all_mes_chat_room', allMessages);
            })
            .catch(err => console.log(err, '_getMessages', ' - RoomSocketController'))
    }

    _sendingMessageToRoom(io, message, roomName) {
        RoomModel.find({ roomName: roomName })
            .then(async (resQuery) => {
                if (resQuery.length < 1) {
                    let createWC = {
                        name: 'WorldChat',
                        messages: [],
                    }
                    await RoomModel.create(createWC, (err) => {
                        console.log("Lỗi khi khởi tạo chat room: ", err);
                    })
                    console.log("Không có tin nhắn nào! -RoomSocketController.js");
                    return;
                }
                let allMessages = resQuery[0].messages;
                allMessages.push(message);
                await RoomModel.updateOne({ roomName: roomName }, {
                    messages: allMessages,
                })
                io.in(roomName).emit('update_messages_chat_room', message);
                io.in(roomName).emit('update_unseen_messages_number');
            })
            .catch(err => console.log(err, '_sendingMessageToRoom', ' - RoomSocketController'))
    }

    _updateCoin(socket, userName) {
        UserModel.find({ userName: userName })
            .then((users) => {
                if (users.length !== 1) {
                    console.log("Người dùng không tồn tại! - RoomSocketController.js");
                    return;
                }
                socket.emit('res_update_coin', users[0].coin);
                socket.emit('update_coin_home', users[0].coin);
            })
            .catch(err => console.log(err, '_updateCoin', ' - RoomSocketController'))
    }

    // async _updateState(io, socket, userName) {
    //     await UserModel.updateOne({ userName: userName }, {
    //         connected: true,
    //     })
    //     //kiểm tra xem có đang trong phòng nào không, nếu có thì update,
    //     try {
    //         RoomModel.find({})
    //             .then((rooms) => {
    //                 let i;
    //                 let size = rooms.length;
    //                 for (i = 0; i < size; i++) {
    //                     if (rooms[i].playersInRoom.indexOf(userName) !== -1) {
    //                         let roomName = rooms[i].roomName;
    //                         console.log("Người chơi đang ở trong phòng:", roomName);
    //                         socket.join(roomName); // vào lại phòng
    //                         socket.emit('back_to_the_room', timeManagement.get(roomName).time);
    //                         io.in(roomName).emit('update_entire_room', rooms[i]);
    //                         return;
    //                     }
    //                 }
    //             })
    //             .catch(err => console.log(err))
    //     } catch (error) {
    //         console.log(error);
    //     }
    // }

    async _userDisconnect(io, userName) {
        await UserModel.updateOne({ userName: userName }, {
            connected: false,
        })
        //kiểm tra xem có đang trong phòng nào không, nếu có thì update
        try {
            RoomModel.find({})
                .then((rooms) => {
                    rooms.forEach(async (room) => {
                        if (room.playersInRoom.indexOf(userName) !== -1) {
                            const roomName = room.roomName;
                            console.log("Người chơi đã rời phòng:", roomName);
                            if (room.playersInRoom.length === 1) {
                                // xóa phòng
                                await RoomModel.deleteOne({ roomName: roomName });
                                RoomManager_RunningGame.deleteItem(roomName); // xóa trình quản lý thời gian tại server
                                RoomManager_Ready.deleteItem(roomName);
                                StartGameManager.deleteItem(roomName);
                                FindOwnerCountdown.deleteItem(roomName);
                                console.log("Xóa phòng!");
                            } else {
                                PLAYER_KEYS.forEach(async (key) => {
                                    if (room[key]?.userName === userName) {

                                        if (room.isRunning) {
                                            room[key].stillInTheRoom = false;
                                            room[key].isWaiting = false;
                                            console.log(userName, "không còn trong bàn!");
                                            await RoomModel.updateOne({ roomName: roomName }, {
                                                [key]: room[key],
                                            })
                                            return;
                                        }
                                        room.playersInRoom.splice(room.playersInRoom.indexOf(room[key].userName), 1);
                                        room[key] = null;
                                        await RoomModel.updateOne({ roomName: roomName }, {
                                            [key]: null,
                                            playersInRoom: room.playersInRoom,
                                        });
                                        if (room.ownerOfRoom) {
                                            if (room.playersInRoom.length === 1) {
                                                io.in(roomName).emit('hide_ready_button'); // hủy đếm ngược ở client.
                                                moduleNewGame.cancelCountdown(io, roomName); // hủy đếm ngược ở server.
                                            } else {
                                                io.in(roomName).emit('start_countdown_ofNewGame'); // restart ở client
                                                moduleNewGame.countdownOfNewGame(io, roomName); // restart ở server
                                            }
                                        } else {
                                            moduleNewGame.cancelCountdown(io, roomName);
                                            console.log("Mất chủ bàn!");
                                            // tìm những người đủ điều kiện làm chủ bàn và gửi
                                            findANewOwner(io, room);
                                        }
                                        io.in(roomName).emit('set_user_null', key);
                                    }
                                })
                            }
                            displayAllRooms(io);
                            return;
                        }
                    })
                })
                .catch(err => console.log(err))
        } catch (error) {
            console.log(error);
        }
    }
}

module.exports = new RoomSocketController();