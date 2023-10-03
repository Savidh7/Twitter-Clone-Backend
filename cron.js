const cron = require('node-cron');
const TweetsSchema = require('./Schemas/Tweets');

function cleanUpDeletedTweets() {

    cron.schedule('0 4 * * *', async () => {

        const dbTweets = await TweetsSchema.aggregate([
            {$match: {isDeleted: true}},
            {$project: {_id: 1, deletionDatetime: 1}}
        ])

        dbTweets = dbTweets[0].data;

        dbTweets.forEach(tweet => {
            const deletionDatetime = new Date(dbTweets.deletionDatetime).getTime();
            const currentDatetime = Date.now();

            const diff = (currentDatetime - deletionDatetime) / (1000*60*60*24);

            if(diff >= 30) {
                TweetsSchema.findOneAndDelete({_id: tweet._id});
            }
        })

        console.log('Deleted tweets cleanup successful');
    }, {
        scheduled: true,
        timezone: "Asia/Colombo"
    })
}

module.exports = { cleanUpDeletedTweets };
