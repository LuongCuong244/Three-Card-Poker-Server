let timeManagement = new Map();

const deleteItem = (roomName) => {
    console.log("delete_managerTime_ready: ", roomName);
    timeManagement.delete(roomName);
}

const createItem = (roomName) => {
    console.log("create_managerTime_ready: ", roomName);
    timeManagement.set(roomName, {
        time: 5,
        countDown: null,
    });
    console.log(timeManagement.get(roomName));
}

module.exports = {
    timeManagement,
    deleteItem,
    createItem,
}