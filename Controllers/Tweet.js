const express = require('express');
const tweetsRouter = express.Router();

const Tweets = require('../Models/Tweet');
const User = require('../Models/User');
const { isAuth } = require('../Utils/Auth');
const { getFeedFollowingList } = require('../Utils/Tweet');

tweetsRouter.post('/create-tweet',isAuth, async (req, res) => {
  
    const { title, bodyText } = req.body;
    const { userId } = req.session.user;

    if(!title || !bodyText) {
        return res.send({
            status: 500,
            message: "Parameters missing"
        })
    }

    if(!userId) {
        return res.send({
            status: 401,
            message: "Invalid UserId"
        })
    }

    if(typeof(title) !== 'string' || typeof(bodyText) !== 'string') {
        return res.send({
            status: 400,
            message: "Title and BodyText should be only text"
        })
    }

    if(title.length > 200 || bodyText > 1000) {
        return res.send({
            status: 401,
            message: "Title and bodytext too long. Allowed chars for title is 200 and bodytext is 1000."
        })
    }

    const creationDatetime = new Date();

    const Tweet = new Tweets({title, bodyText, creationDatetime, userId});

    try {
        const dbTweet = await Tweet.createTweet();

        return res.send({
            status: 200,
            message: "Tweet created Successfully.",
            data: dbTweet
        })
    }
    catch(err) {
        return res.send({
            status: 404,
            message: "Database error",
            error: err
        })
    }
})


tweetsRouter.get('/feed', isAuth, async (req, res) => {

    const offset = req.query.offset || 0;
    const userId = req.session.user.userId;

    try {

        const followingUserIds = await getFeedFollowingList(userId);
        //const dbTweets = await Tweets.getTweets2(offset);

        const dbTweets = await Tweets.getTweets(offset, followingUserIds);

        return res.send({
            status: 200,
            message: "Read Successful",
            data: dbTweets
        })
    }
    catch(err) {
        return res.send({
            status: 400,
            message: "Read Unsuccessful",
            error: err
        })
    }
})

tweetsRouter.get('/my-tweets', isAuth, async (req, res) => {

    const offset = req.query.offset || 0;
    const userId = req.session.user.userId;

    if(!userId) {
        return res.send({
            status: 400,
            message: "User not found"
        })
    }

    try {
        const dbTweets = await Tweets.getMyTweets(offset, userId);

        return res.send({
            status: 200,
            message: "Read Successful",
            data: dbTweets
        })
    }
    catch(err) {
        return res.send({
            status: 400,
            message: "Internal error. Please try again",
            error: err
        })
    }
})


tweetsRouter.get('/user-profile', isAuth, async (req, res) => {

    const offset = req.query.offset || 0;
    const userId = req.query.userId;

    if(!userId) {
        return res.send({
            status: 400,
            message: "User not found"
        })
    }

    try {
        const dbTweets = await Tweets.getMyTweets(offset, userId);
        const dbUser = await User.findUserWithUserId(userId);

        return res.send({
            status: 200,
            message: "Read Successful",
            data: {
                user: dbUser,
                tweets: dbTweets
            }
        })
    }
    catch(err) {
        return res.send({
            status: 400,
            message: "Internal error. Please try again",
            error: err
        })
    }
})

tweetsRouter.post('/edit-tweet', isAuth, async (req, res) => {

    if(!req.body.tweetId || !req.body.data) {
        return res.send({
            status: 500,
            message: "Parameters Missing"
        })
    }

    const { tweetId, data: {title, bodyText} } = req.body;
    const { userId } = req.session.user;

    if(!title && !bodyText) {
        return res.send({
            status: 400,
            message: "Invalid data",
            error: "Missing title and bodytext"
        })
    }

    if(title && typeof(title) !== 'string') {
        return res.send({
            status: 400,
            message: "Title should be only text"
        })
    }

    if(bodyText && typeof(bodyText) !== 'string') {
        return res.send({
            status: 400,
            message: "Bodytext should be only text"
        })
    }

    if(title.length > 200 || bodyText > 1000) {
        return res.send({
            status: 401,
            message: "Title and bodytext too long. Allowed chars for title is 200 and bodytext is 1000."
        })
    }

    try {
        // Check whether this tweet actually belongs to the user
        const tweet = new Tweets({title, bodyText, tweetId});
        const tweetData = await tweet.getTweetDatafromTweetId();

        if(tweetData.isDeleted) {
            return res.send({
                status: 401,
                message: "Cannot edit a deleted tweet"
            })
        }


        if(userId.toString() !== tweetData.userId.toString()) {
            return res.send({
                status: 400,
                message: "Edit not allowed. Tweet is owned by some other user."
            })
        }

        // Verify the creation datetime

        const currentDatetime = Date.now();
        const creationDatetime = new Date(tweetData.creationDatetime);
        const diff = ( currentDatetime - creationDatetime.getTime() ) / ( 1000*60 ); // diff in minutes

        if(diff > 30) {
            return res.send({
                status: 400,
                message: "Edit not allowed after 30 minutes of tweeting"
            })
        }

        // Update the tweet in db

        const tweetDb = await tweet.editTweet();

        return res.send({
            status: 200,
            message: "Edit successful",
            data: tweetDb
        })

    }
    catch(err) {
        return res.send({
            status: 401,
            message: "Internal Error",
            error: err
        })
    }

})

tweetsRouter.post('/delete-tweet', isAuth, async (req, res) => {

    const { tweetId } = req.body;

    if(!tweetId) {
        return res.send({
            status: 400,
            message: "Invalid Tweet Id"
        })
    }

    const userId = req.session.user.userId;

    // Check if user is authorised to perform the action
    let dbTweet;
    try {
        const tweet = new Tweets({tweetId});
        dbTweet = await tweet.getTweetDatafromTweetId();
    }
    catch(err) {
        return res.send({
            status: 400,
            message: "Internal server error. Please try again",
            error: err
        })
    }

    if(!dbTweet) {
        return res.send({
            status: 400,
            message: "Tweet not found. Please try again with a valid tweet id"
        })
    }

    if(dbTweet.isDeleted) {
        return res.send({
            status: 401,
            message: "Tweet is already deleted"
        })
    }

    if(userId.toString() !== dbTweet.userId.toString()) {
        return res.send({
            status: 400,
            message: "Delete unsuccessful",
            error: "User not authorised to perform the action. Tweet does not belong to the user."
        })
    }

    // Delete the tweet
    const tweet = new Tweets({tweetId});

    try {
        const dbTweet = await tweet.deleteTweet();

        return res.send({
            status: 200,
            message: "Delete successful",
            data: dbTweet
        })
    }
    catch(err) {
        return res.send({
            status: 400,
            message: "Delete Unsuccessful",
            error: err
        })
    }
})

module.exports = tweetsRouter;
