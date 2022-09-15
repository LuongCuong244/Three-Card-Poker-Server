let findOwnerCountdown = new Map();

const deleteItem = (roomName) => {
    console.log("delete_find_owner: ",roomName);
    findOwnerCountdown.delete(roomName);
}

const createItem = (roomName) => {
    console.log("create_find_owner: ",roomName);
    findOwnerCountdown.set(roomName,{
        time: 5,
        countDown: null,
    });
}

const getItem = (roomName) => {
    return findOwnerCountdown.get(roomName);
}

const setItem = (roomName, value) => {
    findOwnerCountdown.set(roomName,value);
}

module.exports = {
    deleteItem,
    createItem,
    getItem,
    setItem
}