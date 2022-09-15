const userRouter = require('./user.routes')
const roomRouter = require('./room.routes')
const authRouter = require('./auth.routes')

function route(app) {
    // app.use(function (req, res, next) {
    //     res.header(
    //         "Access-Control-Allow-Headers",
    //         "x-access-token, Origin, Content-Type, Accept"
    //     );
    //     next();
    // });

    app.use('/user', userRouter);
    app.use('/room', roomRouter);
    app.use('/auth', authRouter);
}

module.exports = route;