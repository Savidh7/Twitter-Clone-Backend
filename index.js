// Package imports
const express = require('express');
const session = require('express-session');
const MongoDbSession = require('connect-mongodb-session')(session);

// Files imports
const constants = require('./private-constants');

// Controllers
const AuthRouter = require('./Controllers/Auth');
const TweetsRouter = require('./Controllers/Tweet');
const FollowRouter = require('./Controllers/Follow');

const app = express();

const store = new MongoDbSession({
    uri: constants.MONGOURI,
    collection: 'tb_sessions'
})

// Middlewares
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: constants.SESSIONSECRETKEY,
    resave: false,
    saveUninitialized: false,
    store: store
}))
const cors=require("cors");
const corsOptions ={
   origin:'*',
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
}

app.use(cors(corsOptions))
// Routes
app.use('/auth', AuthRouter);
app.use('/tweet', TweetsRouter);
app.use('/follow', FollowRouter);


app.get('/', (req, res) => {
    res.send({
        status: 200,
        message: "Welcome"
    })
});

app.get('/home',(req,res)=>{
  res.send({
      status: 201,
      message: "Welcome"
  });
})

module.exports = app;
