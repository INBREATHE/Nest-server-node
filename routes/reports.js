var database = require('./../db');
var moment = require("moment");

var spattern = /[-#@!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/i;
var npattern = /[0-9]/i;

const ERROR_NAME_NOT_VALID  = { status: "error",    message:"Name is not valid." };
const ERROR_BATCH_STORE     = { status: "error",    message:"Batch Store Error" };
const RESULT_BATCH_SUCCESS  = { status: "ok",       message:'Batch Success'};

var pmx = require('pmx');
var probe = pmx.probe();

var reportsCounter = probe.counter({
    name : 'Reports'
});

var batchReportsCounter = probe.counter({
    name : 'Batches'
});

var Report = function () {
    this.uuid       = "uuid";
    this.name       = "name";
    this.data       = {};
    this.timestamp  = Math.floor(new Date() / 1000);
    this.version    = "version";
    this.time       = 0; // UTC
    this.offset     = 0; // This is timezone offset in minutes
    this.os         = "os";
    this.ip         = "ip";
};

function StoreReport(name, ip, input, callback) {
    var report       = new Report();
    var data        = input.data;
    // console.log("StoreEvent");
    report.ip        = String(ip);
    report.name      = String(name);
    report.uuid      = String(input.uuid);
    report.version   = String(input.version) || "0.0.1";
    report.time      = parseInt(input.time);
    report.offset    = parseInt(input.offset);
    report.data      = Boolean(typeof data == 'string' || data instanceof String) ? JSON.parse(input.data) : data;
    report.os        = String(input.os);

    database.getOne("reports", { uuid: report.uuid, time: report.time, name: report.name }, 
    function(status, item){
        // console.log("SEARCH EVENT: " + status, item);
        if(status == database.STATUS_ERROR || (status == database.STATUS_OK && item == null)) {
            /* ====== Keymetrics staticstics ============= */
                pmx.emit(report.name, report);
                reportsCounter.inc();
            /* =========================================== */
            database.insert( report, "reports", callback );
        } else {
            callback(database.STATUS_OK);
        }
    })
}

function CheckUserExist() {
    
}

function GetRequestIP(req) {
    return req.headers['x-forwarded-for'] || req.ip;
}

function Validate(name) {
    var isString    = Boolean(typeof name == 'string' || name instanceof String);
    var result      = isString;
    if(isString) {
        var isValid     = !Boolean(name.match(spattern)) && name.length > 3;  
        var hasNumber   = Boolean(name.match(npattern));
        result          = isString && isValid && !hasNumber;
        console.log(name + " is string|valid:", isString +"|"+ isValid + "|" + !hasNumber);
    }
    return result;
}

exports.batch = function(req, res)
{
    var ip      = GetRequestIP(req);
    var input   = req.body;
    
    console.log(input);
    
    var reports  = JSON.parse(input.data);
    var repcount = reports.length;
    var body    = {
            data        : {}    
        ,   time        : 0
        ,   uuid        : input.uuid  
        ,   version     : input.version
        ,   os          : input.os
    };
    
       
    if(repcount > 0) {
        pmx.emit("Batch", { 
            length  : repcount
        ,   ip      : ip 
        ,   uuid    : input.uuid 
        ,   os      : input.os
        ,   version : input.version
        });

        // console.log("BATCH: ", database.STATUS_OK, data);
        var processBatch = function(item)
        {
            console.log("\nItem: ", item);
            
            var name = item.name;
            var params = item.params;
            body.time = parseInt(params.time);
            body.data = params;
            
            if(Validate(name)) {
                
                /* Keymetrics staticstics */
                batchReportsCounter.inc();
                /* ======================== */
                
                StoreReport( name, ip, body, function(status){
                    console.log("StoreReport: " + repcount, status);
                    if(status === database.STATUS_OK) {
                        if(--repcount) {
                            processBatch(reports.shift());
                        } else res.status(200).json(RESULT_BATCH_SUCCESS);
                    } else {
                        /* Keymetrics errors */ pmx.notify( ERROR_BATCH_STORE );
                        res.status(400).json( ERROR_BATCH_STORE );
                    }
                });
            } else {
                /* Keymetrics errors */ pmx.notify( ERROR_NAME_NOT_VALID );
                res.status(400).json( ERROR_NAME_NOT_VALID );
            }
        }
        processBatch(reports.shift());
    }
}

exports.post = function(req, res) {
   	var name = req.params.name;
    //res.status(400).json(ERROR_NAME_NOT_VALID);
    console.log("STORE REPORT: " + name);
    if(Validate(name)) StoreReport( name, GetRequestIP(req), req.body, res );
    else {
        /* Keymetrics errors */ pmx.notify( ERROR_NAME_NOT_VALID );
        res.status(400).json( ERROR_NAME_NOT_VALID );
    }
};

