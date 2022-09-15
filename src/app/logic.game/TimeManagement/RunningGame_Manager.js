let timeManagement = new Map();

const deleteItem = (roomName) => {
    console.log("delete_managerTime_runningGame: ",roomName);
    timeManagement.delete(roomName);
}

const createItem = (roomName) => {
    console.log("create_managerTime_runningGame: ",roomName);
    timeManagement.set(roomName,{
        time: 15,
        countDown: null,
    });
}

module.exports = {
    timeManagement,
    deleteItem,
    createItem,
}