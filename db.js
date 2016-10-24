
// ================================================
// INSTALL MongoDB for use with CloudFoundry || Heroku
// process.env.VCAP_SERVICES - this is for CloudFoundry
// ================================================
var Q = require('q');
var mongo = {};
var APP = {};

// NEW: db.createUser({user:"vladimirminkin", pwd:"dqvsra020387", roles:[ { role:"userAdmin", db:"playwordslogiclite"}] })
// NEW: db.createUser({user:"vladimirminkin", pwd:"dqvsra020387", roles:[ { role:"userAdmin", db:"playwordslogiclite-dev"}] })
if(process.env.VCAP_SERVICES){
     var env = JSON.parse(process.env.VCAP_SERVICES);
     console.log("VCAP SERVICE:" , env);
     mongo = env['mongodb-2.0'] ? env['mongodb-2.0'][0]['credentials'] : env['mongodb-1.8'][0]['credentials'];
} else {
     mongo = {
              hostname        : "localhost"
         ,    port            : 27017
         ,    db              : (process.env.NODE_ENV == "production" ? "nest" : "nest-dev")
         ,    safe            : true
     }
}


const STATUS_OK = "ok";
const STATUS_ERROR = "error";

function DeferredProcess(actor, process, options, params) {
    var deferred = Q.defer();
    var resolve = deferred.resolve;
    var reject = deferred.reject;
    var callback = function (error, data) {
        if (error) reject(new Error(error));
        else {
            if(params != null) data.params = params
            resolve(data);
        }
    };
    options = options !== null ? (options instanceof Array ? options : [ options ]) : [];
    options.push(callback);
    actor[process].apply(actor, options)
    return deferred.promise;
};

function ProcessDatabase( to, command, data, res, message ) {
    var isFunction = typeof res == "function";
    Q.invoke(APP, "get", to)
    .fail( function ( error ) { if(res) isFunction ? res.status(400).json( { status: STATUS_ERROR, message:error } ) : res.call(STATUS_ERROR); })
    .then( function ( collection ) { return DeferredProcess(collection, command, data); })
    .then( function ( result, err ) {
        if(res == null) return;
        else if(isFunction) res.apply( null, err ? [ STATUS_ERROR, err ] : [ STATUS_OK, result ]);
        else {
            if(err) res.status(400).json({ status: STATUS_ERROR, message: err });
            else res.status(200).json({ status: STATUS_OK, message: message });
        }
    });
}

module.exports = this;

exports.mongourl = function(app) {
    APP = app;
    var result = "";
    if( mongo.username && mongo.password ) {
        result = "mongodb://" + mongo.username + ":" + mongo.password + "@" + mongo.hostname + ":" + mongo.port + "/" + mongo.db;
    } else {
        result =     process.env.MONGOHQ_URL        // for Heroku service MongoHQ
                ||   process.env.MONGOLAB_URI       // for Heroku service: MongoLab
                ||  "mongodb://" + mongo.hostname + ":" + mongo.port + "/" + mongo.db;
    }
    console.log("MONGO params : hostname = "     + mongo.hostname);
    console.log("MONGO params : port = "         + mongo.port);
    console.log("MONGO params : db = "           + mongo.db);
    console.log("MONGO_HQ params  = "            + process.env.MONGOHQ_URL);
    console.log("MONGO_LAB params = "            + process.env.MONGOLAB_URI);
    console.log("mongourl = " + result);
    return result;
}

exports.STATUS_OK = STATUS_OK;
exports.STATUS_ERROR = STATUS_ERROR;

/*************************************************************************
* DATABASE API
*/
exports.insert = function( data, to, res ) {
    ProcessDatabase( to, "insert", data, res, 'Store Success' );
}

exports.getOne = function( from, criteria, res ) {
    ProcessDatabase( from, "findOne", criteria, res, 'User Ready' );
}

exports.getMany = function( from, criteria, res ) {
    ProcessDatabase( from, "find", criteria, res, 'Data Ready' );
}

exports.update = function( from, criteria, data, res ) {
    ProcessDatabase( from, "update", [ criteria, data ], res, 'User Updated' );
}

/*
**************************************************************************/
