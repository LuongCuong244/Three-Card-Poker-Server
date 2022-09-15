let startGameManager = new Map();

const deleteItem = (roomName) => {
    console.log("deleteStartGameManager: ", roomName);
    startGameManager.delete(roomName);
}

const createItem = (roomName) => {
    console.log("createStartGameManager: ", roomName);
    startGameManager.set(roomName, {
        isHandingOutCard: false,
    });
}

const updateItem = (roomName,value) => {
    startGameManager.set(roomName, {
        isHandingOutCard: value,
    });
}

const getItem = (roomName) =>{
    return startGameManager.get(roomName)?.isHandingOutCard;
}

module.exports = {
    startGameManager,
    deleteItem,
    createItem,
    updateItem,
    getItem
}