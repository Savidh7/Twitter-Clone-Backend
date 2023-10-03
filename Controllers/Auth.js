const express = require('express');

const { cleanUpAndValidate, isAuth } = require('../Utils/Auth');
const User  = require('../Models/User');

const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {

    const { username, email, name, password, phone } = req.body;

    // Validate the data for errors
    cleanUpAndValidate({username, email, name, password, phone}).then(async () => {
        try {
            await User.verifyUsernameAndEmailExists({username, email});
        }
        catch(err) {
            return res.send({
                status: 401,
                message: err
            })
        }
        // Create and register user
        const user = new User({name, password, username, email, phone});

        try {
            const dbUser = await user.registerUser();

            return res.send({
                status: 200,
                message: "Registration Successful",
                data: dbUser
            })
        }
        catch(err) {
            return res.send({
                status: 401,
                message: "Database Error. Please try again",
                err: err
            })
        }
    })
    .catch(err => {
        return res.send({
            status: 401,
            message: err
        })
    });
})

authRouter.post('/login', async (req, res) => {

    const { loginId, password } = req.body;

    if(!loginId || !password) {
        return res.send({
            status: 500,
            message: "Parameters missing"
        })
    }

    try {
        const dbUser = await User.loginUser({loginId, password});

        req.session.isAuth = true;
        req.session.user = {
            email: dbUser.email,
            username: dbUser.username,
            name: dbUser.name,
            userId: dbUser._id
        }

        return res.send({
            status: 200,
            message: "Logged in Successfully",
            data: {
                email: dbUser.email,
                username: dbUser.username,
                name: dbUser.name,
                _id: dbUser._id
            }
        })
    }
    catch(err) {
        return res.send({
            status: 404,
            message: "Error occured",
            error: err
        })
    }
})

authRouter.post('/logout', isAuth, (req, res) => {

    const userData = req.session.user;

    req.session.destroy(err => {
        if(err) {
            return res.send({
                status: 404,
                message: "Loggout unsuccessful. Please try again.",
                error: err
            })
        }
        return res.send({
            status: 200,
            message: "Loggout successful",
            data: userData
        })
    })
})

authRouter.post('/logout_from_all_devices', async (req, res) => {

    const userId = req.session.user.userId;

    try {
        const sessionDb = await User.logoutFromAllDevices(userId);

        return res.send({
            status: 200,
            message: "Logged out from all devices",
            data: sessionDb
        })
    }
    catch(err) {
        return res.send({
            status: 200,
            message: "Internal server error. Logout failed.",
            error: err
        })
    }

})

module.exports = authRouter;
