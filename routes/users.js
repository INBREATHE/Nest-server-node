var Q           = require('q');
var pmx         = require('pmx');
var database    = require('./../db');
var app         = require('./../app');

var probe = pmx.probe();

var usersCounter = probe.counter({
    name : 'Users'
});

const ERROR_DATABASE_UPDATE     = "Error #101: Database Update Error";
const ERROR_DATABASE_STORE      = "Error #102: Database Store Error";
const ERROR_DATABASE_GETMAIL    = "Error #102.1: Database Get Mail Error";
const ERROR_DATABASE_GETUSER    = "Error #102.2: Database Get User Error";
const ERROR_DATABASE_GETTOKENS  = "Error #102.3: Database Get Tokens Error";
const ERROR_WRONG_INPUT         = "Error #103: Wrong Input Data";
const ERROR_USER_EXIST          = "Error #104.1: User Already Exist";
const ERROR_NO_USER             = "Error #104.2: User Does Not Exist";
const ERROR_GET_MAILS           = "Error #105: Get Active Mails from DB";
const ERROR_MAILS_COUNT         = "Error #106: Get Active Mails from DB";
const ERROR_CURSOR              = "Error #107: Cursor error from DB";


const SUCCESS                   = 'Success';
const SUCCESS_USER_REGISTERED   = 'User registered. Store Success';

var User = function () {
    this.uuid           = "uuid";
    this.firstname      = "FirstName";
    this.lastname       = "LastName";
    this.gametree       = {};
    this.complete       = {};
    this.playtime       = 0;
    this.lastplaytime   = 0;
    this.version        = "version";
    this.lng            = "";
    this.os             = "os";
    this.ip             = "ip";
    this.socialhronized = false;
    this.social         = {};
    this.token          = "";
    this.mails          = 1; 
};

function SendError(res, message) {
    console.log(message);
    res.status(500).send({ status: database.STATUS_ERROR, message: message });
}

function SendSuccess(res, message, data) {
    console.log(message);
    res.status(200).json({ status: database.STATUS_OK, message: message, data:data });
}

exports.mails = function(req, res) {
    var input   = req.query;
    var uuid    = input["uuid"];
    var lamid   = parseInt(input["lamid"]) // lastActiveMailID 
    var lng     = String(input["lng"]);
    console.log(input);
    console.log("USER ID | COUNT | LNG:", uuid, lamid, lng, typeof lamid == "number", typeof uuid == "string");
    if( uuid && (typeof uuid == "string") && (typeof lamid == "number") && lamid >= 0 && Boolean(typeof lng == 'string' && lng.length == 2)) {
        database.getOne("users", { uuid:uuid }, function(status, user) {
            // Only if user exist
            // And we have mails for him
            console.log(user);
            if( status == database.STATUS_OK && user != null) {
                database.getMany("mails", { isActive: true, lng:lng, id: { $gt: lamid } },
                function (status1, cursor) {
                    if( status1 === database.STATUS_OK ) {
                        cursor.count(function(err, mails_count) {
                            console.log("RESULT:", mails_count);
                            if(err) SendError(res, ERROR_MAILS_COUNT );
                            else {
                                if(mails_count > 0) {
                                    cursor.toArray(function(err, result) { 
                                        if(err) SendError(res, ERROR_CURSOR );
                                        else database.update("users", { uuid:uuid }, { $set: { mails: (lamid + mails_count) } },
                                        function(status2, message) {
                                            console.log("status2", status2)
                                            if(status2 === database.STATUS_OK)
                                                    SendSuccess(res, SUCCESS, result );
                                            else    SendError(res, ERROR_DATABASE_UPDATE );
                                        }); /* USER UPDATE */
                                    }); /* CURSOR TOARRAY */
                                } else /* NO NEW MAILS */ res.status(200).send({ status:database.STATUS_OK, message: "No New Mails", data: null });
                            } 
                        }); /* CURSOR COUNT */
                    } else /* ERROR CURSOR */ SendError(res, ERROR_GET_MAILS );
                }); /* DATABASE GET MANY */
            } else /* USER NULL */ SendError(res, user == null ? ERROR_NO_USER : ERROR_DATABASE_GETUSER );
        }); /* DATABASE GET ONE */
    } else /* WRONG INPUT */ SendError(res, ERROR_WRONG_INPUT ); 
}


/**
 * 	uuid 	: userUUID
,	time	: new Date().getTime()
,	type	: levelVO.type		
,	bundle	: levelVO.bundle		
,	lid		: levelVO.lid
,	lng		: levelVO.lng
 */
exports.levelcomplete = function(req, res){
    var input      = req.body;
    
    console.log("levelcomplete", input);
    
    var uuid       = String(input.uuid);
    var	time	   = parseInt(input.time);
    var	gtype	   = String(input.type);	
    var	bundle	   = String(input.bundle);		
    var	lid		   = parseInt(input.lid);
    var	lng		   = String(input.lng);
    
    if(uuid && time > 0 && gtype && bundle && lid > 0 && lng) 
    {
        database.getOne("users", { uuid:uuid }, function(status, user) {
            console.log("get user:", status);
            if( status == database.STATUS_OK && user != null ) {
                // Save completed level
                var complete = user.complete;
                if(complete == null) complete = { }
                if(!complete[lng]) {
                    complete[lng] = {}
                    complete[lng][gtype] = {};
                    complete[lng][gtype][bundle] = [lid];
                } else {
                    // Check if level already completed
                    if(complete[lng][gtype][bundle][lid - 1] == null) {
                        complete[lng][gtype][bundle].push(lid);
                        complete[lng][gtype][bundle].sort(function(a, b){return a-b})
                    } else {
                        console.log("LEVEL Already completed: ", lid)
                    }
                }
                
                var gametree = user.gametree;
                if(gametree == null) gametree = { }
                if(!gametree[lng]) {
                    gametree[lng] = {}
                    gametree[lng][gtype] = {};
                    gametree[lng][gtype][bundle] = [lid];
                } else {
                    if(gametree[lng][gtype][bundle][lid - 1] == null) {
                        gametree[lng][gtype][bundle].push(lid);
                        gametree[lng][gtype][bundle].sort(function(a, b){return a-b})
                    } else {
                        console.log("LEVEL Already in place: ", lid)
                    }
                }
                
                console.log('user complete:', complete);
                console.log('user gametree:', gametree);
                
                database.update("users", { uuid: uuid }, { 
                    $set : { 
                        complete: complete, 
                        gametree: gametree 
                    } 
                });
                SendSuccess(res, SUCCESS);
            } else SendError(res, user==null ? ERROR_NO_USER : ERROR_DATABASE_GETUSER);
        });
    } else SendError(res, ERROR_WRONG_INPUT);
}


function Combine_User_GameTree(targetUser, sourceUser) {
    var gtTarget = targetUser.gametree;
    var gtSource = sourceUser.gametree;
    
    console.log('targetUser gametree:', gtTarget);
    console.log('sourceUser gametree:', gtSource);
    
    var strSourceLang, strSourceType, strSourceBundle;
    var sourceLang, sourceType, sourceBundle;
    var targetLang, targetType, targetBundle;
    
    if(gtSource != null) {
        for(strSourceLang in gtSource) {
            sourceLang = gtSource[strSourceLang];
            targetLang = gtTarget[strSourceLang];
            if(targetLang != null) {
                // If language exists
                for(strSourceType in sourceLang) {
                    sourceType = sourceLang[strSourceType];
                    targetType = targetLang[strSourceType];
                    if(targetType != null) {
                        for(strSourceBundle in sourceType) {
                            sourceBundle = sourceType[strSourceBundle];
                            targetBundle = targetType[strSourceBundle] || [];
                            if(targetBundle != null) {
                                sourceBundle = sourceBundle.concat(targetBundle.filter(function (item) {
                                    return sourceBundle.indexOf(item) < 0;
                                }));
                                sourceBundle.sort(function(a, b){return a-b});
                            } // targetBundle
                            console.log(strSourceLang, strSourceType, strSourceBundle, sourceBundle )
                            console.log(strSourceLang, strSourceType, strSourceBundle, targetBundle )
                            gtTarget[strSourceLang][strSourceType][strSourceBundle] = sourceBundle
                        }    
                    } // targetType
                    else {
                        gtTarget[strSourceLang][strSourceType] = sourceType;
                    }
                }
            } // targetLang
            else {
                gtTarget[strSourceLang] = sourceLang;
            }
        }            
    } else {
        
    }
    /*
    var _mergeRecursive = function(obj1, obj2) {
        //iterate over all the properties in the object which is being consumed
        for (var p in obj2) {
            // Property in destination object set; update its value.
            if ( obj2.hasOwnProperty(p) && typeof obj1[p] !== "undefined" ) {
                _mergeRecursive(obj1[p], obj2[p]);
            } else {
                //We don't have that level in the heirarchy so add it
                obj1[p] = obj2[p];
            }
        }
    }
    */
}

exports.socialconnect = function(req, res) {
    var input       = req.body;
    var userid     	= String(input.uuid);
    var token       = String(input.token);
    var socialInfo  = Object(input.social);
    
    /**
     * Token
     */
    
    if(userid && socialInfo != null && token != null && token != "") 
    {
        console.log("userid , socialInfo", userid, socialInfo);
        database.getOne("users", { uuid: userid }, function( user_uuid_status, user_uuid ) {
            console.log("get user:", user_uuid_status, user_uuid);
            if( user_uuid_status == database.STATUS_OK && user_uuid != null) 
            {
                database.getMany("users", { token: token }, 
                function(users_token_status, users_cursor) {
                    if( users_token_status == database.STATUS_OK && users_cursor != null) 
                    {
                        users_cursor.toArray(function(err, users) { 
                        if(err) SendError(res, ERROR_CURSOR );
                        else {
                            console.log("USER with token COUNT: ", users.length);
                            if(users.length > 0) {
                                users.forEach(function( user_token, index, arr ) {
                                    if(user_token.uuid != userid) {
                                        Combine_User_GameTree( user_token, user_uuid );
                                        // Combine_User_Complete( user_token, user_uuid );
                                        database.update("users", { uuid : user_token.uuid }, { $set : {
                                            gametree    : user_token.gametree
                                        ,   complete    : user_token.complete
                                        }});
                                    }
                                });
                                var user_from_tokens = users[0];
                                database.update("users", { uuid : userid }, 
                                { 
                                    $set : 
                                    { 
                                        social      : socialInfo, 
                                        token       : token,
                                        gametree    : user_from_tokens.gametree, 
                                        complete    : user_from_tokens.complete,
                                        socialhronized : true 
                                    }
                                },  function( update_status ) {
                                    console.log(update_status)
                                    if( update_status == database.STATUS_OK ) {
                                        SendSuccess(res, SUCCESS, { 
                                            gametree    : user_from_tokens.gametree
                                        ,   complete    : user_from_tokens.complete
                                        });
                                    }
                                    else SendError(res, ERROR_DATABASE_UPDATE);
                                });
                                
                            } else {
                                database.update("users", { uuid : userid }, { 
                                    $set : 
                                    { 
                                        social          : socialInfo, 
                                        token           : token,
                                        socialhronized  : true
                                    }
                                }, 
                                function(update_status, message) {
                                    console.log("update_status", update_status)
                                    if(update_status == database.STATUS_OK) 
                                            SendSuccess(res, SUCCESS, null); 
                                    else    SendError(res, ERROR_DATABASE_UPDATE);
                                });
                            }
                        }}); // database.getMany
                    } else SendError(res, ERROR_DATABASE_GETTOKENS );
                });
            } else SendError(res, user_uuid == null ? ERROR_NO_USER : ERROR_DATABASE_GETUSER);
        });
    } 
    else SendError(res, ERROR_WRONG_INPUT);
}

exports.register = function(req, res) {
	var input       = req.body;
	var lng         = String(input.lng);
    var user        = new User();
    
    user.firstname  = String(input.firstname);
    user.lastname   = String(input.lastname);
	user.uuid     	= String(input.uuid);
    user.gametree   = input.gametree;
    user.token      = String(input.token) || "";
    
    if(user.token != "") {
        user.social = input.social;
        user.socialhronized = true;
    }
    
    user.os         = String(input.os);
    user.ip 		= String(req.ip);
    user.lng        = String(lng);
    user.version    = String(input.version) || "0.0.1";
    
	console.log("REGISTER USER:", input);
    console.log(input.gametree);
    
    database.getOne("users", { uuid:user.uuid }, function(user_status, data) {
        console.log("get user:", user_status, data);
        if( user_status == database.STATUS_OK && data == null) 
        {
            database.insert(user, "users", function( insert_status, message ) {
                //console.log("User register status:", status.result, user.mails); 
                if(insert_status === database.STATUS_ERROR) {
                    /* Keymetrics errors */ pmx.notify( ERROR_DATABASE_STORE );
                    SendError(res, ERROR_DATABASE_STORE );
                } else {
                    database.getOne("mails", { id:1, lng:lng }, function(mails_status, result) {
                        console.log("LANG MAILS:", result);
                        if(mails_status === database.STATUS_OK) {
                            
                            res.status(200).json({ 
                                status:     database.STATUS_OK, 
                                message:    SUCCESS_USER_REGISTERED, 
                                data:       [ result ]
                            });
        
                            /* Keymetrics staticstics */
                            pmx.emit("UserRegistered", user);
                            usersCounter.inc();
                            /* ======================== */
                        } else SendError(res, ERROR_DATABASE_GETMAIL );
                    })
                }
            });
        }
        else SendError(res, data == null ? "" : ERROR_USER_EXIST );
    });
}


function Combine_User_Complete(sourceUser, targetUser) {
    
    
    
    // var complete = user.complete;
    // if(complete == null) complete = { }
    // if(!complete[lng]) {
    //     complete[lng] = {}
    //     complete[lng][gtype] = {};
    //     complete[lng][gtype][bundle] = [lid];
    // } else {
    //     // Проверяем чтобы дважды нельзя было пройти уровень
    //     if(complete[lng][gtype][bundle][lid - 1] == null) {
    //         complete[lng][gtype][bundle].push(lid);
    //         Array(complete[lng][gtype][bundle]).sort(function(a, b){return a-b})
    //     } else {
    //         console.log("LEVEL Already in complete: ", lid)
    //     }
    // }
                
                
                
                console.log('user complete:', complete);
                
    
}