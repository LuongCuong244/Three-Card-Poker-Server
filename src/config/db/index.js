const mongoose = require('mongoose');

async function connect(){
    try {
        await mongoose.connect('mongodb+srv://luongcuong:cuong10112002@cluster0.woo9s0o.mongodb.net/?retryWrites=true&w=majority')
        console.log('Connect mongodb successfully!');
    } catch (error) {
        console.log('Connect mongodb failure!');
    }
}

module.exports = {connect};