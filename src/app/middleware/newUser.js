const User = require('../models/User');

checkUserNameExists = (req, res, next) => {
    console.log(req.body);
    if(!req.body.email || !req.body.userName){
        return res.json({
            error: {
                title: "No userName or email!",
                message: "Dữ liệu không hợp lệ!"
            },
        })
    }
    User.find({ userName: req.body.userName })
        .then((users) => {
            if(users.length > 0){
                return res.json({
                    error: {
                        title: "UserName already exists!",
                        message: "Tên người dùng đã tồn tại!"
                    },
                })
            }
            next();
        })
};

const newUser = {
    checkUserNameExists,
};
module.exports = newUser;
