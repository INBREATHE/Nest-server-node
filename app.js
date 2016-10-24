var pmx = require('pmx').init({
  http          : true, // HTTP routes logging (default: true)
  errors        : true, // Exceptions loggin (default: true)
  custom_probes : true, // Custom probes (default: true)
  network       : true, // Traffic usage monitoring (default: false)
  ports         : true  // Shows which ports your app is listening on (default: false)
});

var       express        = require('express')
     ,    http           = require('http')
     ,    fs             = require('fs')
     ,    path           = require('path')
     ,    logger         = require('morgan')
     ,    Agenda         = require('agenda')
     ,    jsonfile       = require('jsonfile')
     ,    bodyParser     = require('body-parser')
     ,    cookieParser   = require('cookie-parser')
     ,    favicon        = require('serve-favicon')
     ,    less           = require('less-middleware')
     ,    debug          = require('debug')('playwordslogic')
;

var db = require("./db");
var storage = require("./storage");
var backup = require("./routes/backup");

var       Mongo          = require('mongodb')
     ,    MongoDB        = Mongo.MongoClient
     ,    ObjectID       = Mongo.ObjectID
     ,    MongoConnect   = {}
     ,    MongoReports   = {}
     ,    MongoMails     = {}
     ,    MongoUsers     = {}
     ,    MongoGame      = {}
     ;

var app = express();
var mongourl = db.mongourl(app);

module.exports = app;

function InitializeMongo() {
// ================================================
// CONNECT TO MONGO
// ================================================
     MongoDB.connect (
          mongourl, { safe: true, auto_reconnect: true, native_parser: false },
          function(err, conn) {
               if(err) console.log("MONGO ERROR when CONNECT : ", err);
               else {
                    MongoConnect   = conn;
                    MongoReports   = MongoConnect.collection('reports');
                    MongoUsers     = MongoConnect.collection('users');
                    MongoMails     = MongoConnect.collection('mails');
                    MongoGame      = MongoConnect.collection('game');
                    
                    /*********************************************/
                    /***********/ InitializeApp(); /**************/
                    /*********************************************/
               }
          }
     );
// ================================================
// END CONNECT TO DB
// ================================================
}

function InitializeAgenda(callback) {
     var agenda = new Agenda();
     agenda.name("Backups").database(mongourl, "agenda");
     agenda.define('backup_events', function(job, done) {
          console.log("> Backup Events: Job Starts at", new Date());
          backup.now(null, function(status, message){
               pmx.emit("BackupComplite", { status:status, message:message });
               done();
          });
     });
     agenda.jobs({ name: 'backup_events'}, function(err, jobs) {
          // console.log(jobs);
          if(jobs.length == 0) {
               var job = agenda.create('backup_events');
               job.repeatAt('0:01am');
               // job.repeatEvery('one days');
               job.save();
          }
          else {
               jobs[0].repeatAt('0:01am');
               // jobs[0].run();
          }
          console.log(" > AGENDA is SETUP");
          agenda.start();
          callback();
     });
}

function InitializeApp () {

     // view engine setup
     app.set('port'          , process.env.PORT || 3000);
     app.set('views'         , path.join(__dirname, 'views'));
     app.set('view engine'   , 'hbs');
     app.set('x-powered-by'  , false);

     app.set('reports'       , MongoReports);
     app.set('users'         , MongoUsers);
     app.set('mails'         , MongoMails);
     app.set('game'          , MongoGame);
     // app.set('mails'         , UserMails); // Depricated

     app.use(logger('dev'));
     app.use(bodyParser.json());
     app.use(cookieParser());
     app.use(bodyParser.urlencoded({ extended: false }));
     app.use(less(path.join(__dirname, 'public')));
     app.use(express.static(path.join(__dirname, 'public')));

     require('./routes/_router')(app);

     // error handlers
     app.use(pmx.expressErrorHandler());
     app.use(HandleError404); // catch 404 and forward to error handler
     app.use(HandleErrorRender); // production error handler, no stacktraces leaked to user

     app.listen(app.get('port'), function(server) {
          console.log('Express server listening on port ' + app.get('port'));
     });
}

function HandleError404(req, res, next) {
     var err = new Error('Not Found');
     err.status = 404;
     next(err);
}
function HandleErrorRender(err, req, res, next) {
     console.log("ERROR:", err.status, err.message)
     res.status(err.status || 500);
     res.render('error', { message: err.message, error: err.status });
}

InitializeMongo();
