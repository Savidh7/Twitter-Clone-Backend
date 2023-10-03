const mongoose = require('mongoose');

const app = require('./index');
const constants = require('./private-constants');
const CRON = require('./cron');


mongoose.connect(constants.MONGOURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected with mongodb');
    const PORT = 5000;
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    })
}).catch(err => {
    console.log('Error in connecting with mongo');
})
