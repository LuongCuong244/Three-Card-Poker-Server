const PLAYER_KEYS = require('../../../variables').PLAYER_KEYS;
const FindOwnerCountdown = require('../TimeManagement/FindOwnerCountdown');
const RoomManager_RunningGame = require('../TimeManagement/RunningGame_Manager');
const RoomManager_Ready = require('../TimeManagement/Ready_Manager');
const StartGameManager = require('../Manager/StartGameManager');
const RoomModel = require('../../models/Room');

const cancelCountdownNewOwner = async (roomName) => {
    let countDown = FindOwnerCountdown.getItem(roomName)?.countDown;
    if (countDown) {
        FindOwnerCountdown.setItem(roomName, {
            time: 5,
            countDown: null,
        })
        await clearInterval(countDown);
    }
}

const countdownNewOwner = async (roomSocket, roomName) => {
    let countDown = FindOwnerCountdown.getItem(roomName)?.countDown;
    if (countDown) {
        await FindOwnerCountdown.setItem(roomName, {
            time: 5,
            countDown: null,
        })
    }
    let time = FindOwnerCountdown.getItem(roomName)?.time;
    FindOwnerCountdown.getItem(roomName).countDown = setInterval(() => {
        if (time <= 0) {
            // kiểm tra xem có chủ bàn chưa và emit
            try {
                RoomModel.find({ roomName: roomName })
                    .then((rooms) => {
                        if (rooms.length !== 1) {
                            FindOwnerCountdown.deleteItem(roomName);
                            console.log("Tên bàn không là duy nhất -FindANewOwner-");
                            return;
                        }
                        if (!rooms[0].ownerOfRoom) {
                            roomSocket.in(roomName).emit('kick_off_room', 'All', "Người chơi bị thoát vì không có ai chấp nhận làm chủ phòng!");
                        }
                    })
                    .catch(err => console.log(err));
                cancelCountdownNewOwner(roomName);
            } catch (error) {
                console.log(error);
            }
        } else {
            console.log(time);
            try {
                FindOwnerCountdown.setItem(roomName, {
                    time: time - 1,
                    countDown: FindOwnerCountdown.getItem(roomName)?.countDown
                })
            } catch (error) {
                console.log(error);
            }
            time--;
        }
    }, 1000)
}

const findANewOwner = async (roomSocket, room) => {
    let qualifiedToOwnerRoom = [];
    let roomName = room.roomName;
    for (let keyItem of PLAYER_KEYS) {
        if (room[keyItem]) {
            if (room.playersInRoom.length === 1) {
                if (room[keyItem].coin < 9 * room.minBet) {
                    roomSocket.in(roomName).emit('kick_off_room', room[keyItem].userName, "Bạn bị thoát do không đủ điều kiện làm chủ bàn!");
                    // xóa phòng
                    await RoomModel.findOneAndRemove({ roomName: roomName });
                    RoomManager_RunningGame.deleteItem(roomName); // xóa trình quản lý thời gian tại server
                    RoomManager_Ready.deleteItem(roomName);
                    StartGameManager.deleteItem(roomName);
                    FindOwnerCountdown.deleteItem(roomName);
                    return;
                }
            }
            if (room[keyItem].coin >= 9 * room.minBet) {
                qualifiedToOwnerRoom.push(room[keyItem].userName);
            }
        }
    }
    roomSocket.in(roomName).emit('show_find_owner_room', qualifiedToOwnerRoom);
    countdownNewOwner(roomSocket, roomName);
}

module.exports = findANewOwner;