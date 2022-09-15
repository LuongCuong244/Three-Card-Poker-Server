const RoomModel = require('../../models/Room');

const displayAllRooms = (roomSocket) => {
    RoomModel.find({})
        .then((rooms) => {
            let newArray = rooms.map(item => {
                return {
                    roomName: item.roomName,
                    havePassword: item.roomPassword != '' ? 'Yes' : 'No',
                    playersInRoom: item.playersInRoom,
                    ownerOfRoom: item.ownerOfRoom,
                    minBet: item.minBet,
                    isRunning: item.isRunning,
                }
            })
            roomSocket.emit('send_AllRooms', {
                allRooms: newArray,
            })
        })
}

module.exports = displayAllRooms