var     
     index          = require('./index')
     backup         = require('./backup')
     reports        = require('./reports')
     users          = require('./users')
     game           = require('./game')
;

var pmx = require('pmx');

const ERROR_NOT_IMPLM = 'Not Implemented';
const ERROR_WRONG_API_KEY = 'Wrong API Key';

const HEADER_API_KEY = "x-nest-rest-api-key";
const HEADER_API_VALUE = "mysuperpuperapikey";

exports = module.exports = function(app) {
     
     //front end
     app.route('/').get(index.init);

     // API ALL
     app.all('/api/*', function(req, res, next){
          if(req.headers[HEADER_API_KEY] && req.headers[HEADER_API_KEY] == HEADER_API_VALUE) next();
          else {
               /* Keymetrics errors */ pmx.notify( ERROR_WRONG_API_KEY );
               res.status(500).send({ error: ERROR_WRONG_API_KEY });
          }
     });
     
     /* USERS */
     // after user succesfully registered he gets a mails
     app.route('/api/users/register').post( users.register )
          .get(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .put(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .delete(function(req, res, next)  { res.status(500).send({ error:ERROR_NOT_IMPLM }); });

     /**
     * Return new user mails
     *
     * @param uuid - user identifier
     * @param count - amount already recieved mails 
     *
     * @return [ mail ] - array mails for user 
     */
     app.route('/api/users/mails').get( users.mails )
          .post(function(req, res, next)    { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .put(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM}); })
          .delete(function(req, res, next)  { res.status(500).send({ error:ERROR_NOT_IMPLM}); });

     /**
     * 
     * Save progress in user gametree
     * {
     *      lng: {
     *          type: {
     *              bundle: [ lid ]
     *          }
     *      }
     * }
     * 
     * @param uuid 
     * @param time 
     * @param type  
     * @param bundle  
     * @param lid 
     * @param lng 
     * 
     */
     app.route('/api/users/levelcomplete').post( users.levelcomplete )
          .get(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .put(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM}); })
          .delete(function(req, res, next)  { res.status(500).send({ error:ERROR_NOT_IMPLM}); });

          
     /**
     *
     * @param uuid
     * @param sn 
     *
     */
     app.route('/api/users/socialconnect').post( users.socialconnect )
          .get(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .put(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM}); })
          .delete(function(req, res, next)  { res.status(500).send({ error:ERROR_NOT_IMPLM}); });


     /* BACKUP - NOW */
     app.route('/api/backup/now').get( backup.now )
          .post(function(req, res, next)    { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .put(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .delete(function(req, res, next)  { res.status(500).send({ error:ERROR_NOT_IMPLM }); });

     /* EVENTS - BATCH */
     app.route('/api/report/batch').post( reports.batch )
          .get(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .put(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .delete(function(req, res, next)  { res.status(500).send({ error:ERROR_NOT_IMPLM }); });
          
     /* EVENTS - STORE BY NAME */
     app.route('/api/report/:name').post( reports.post )
          .get(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM }); })
          .put(function(req, res, next)     { res.status(500).send({ error:ERROR_NOT_IMPLM }); } )
          .delete(function(req, res, next)  { res.status(500).send({ error:ERROR_NOT_IMPLM }); });    
}
