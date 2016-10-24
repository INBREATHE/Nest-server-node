var database = require('./../db');
var storage = require("./../storage");
var moment = require("moment");

exports.init = function(req, res) {
	res.render('backup', { title: "Backup Data" });
}

exports.now = function(req, res) {
	var today 	= new Date();
	var dd 		= today.getDate();
	var mm 		= today.getMonth()+1; //January is 0!
	var yyyy 	= today.getFullYear();
	
	var daystring = dd+"/"+mm+"/"+yyyy;
	var startdaytime = Number(moment(new Date(yyyy, mm, dd))) * 0.0010; // .tz("Europe/Moscow")
	const isFunction = typeof res == "function";
	
	var __applyResponce = function(status, message) {
		if(res) {
        	if(isFunction) res(status, message);
        	else res.status(400).json({ status:status, message:message });
        }
	}

	if(storage.isREADY) {
    	database.getMany("events", { time: { $gte: startdaytime } }, function(status, cursor) 
    	{
			console.log("Backup now: " + daystring, startdaytime, status);
			if(status === database.STATUS_OK) {
				cursor.toArray(function(err, result) { 
					console.log("RESULT:", result.length);
					if(!err) {			
						if(result.length > 0) storage.backupFromCollectionAtDate("events", yyyy, mm, dd, result, res);
						else __applyResponce(storage.STATUS_ERROR, "Nothing to store array is empty");
					} else __applyResponce(storage.STATUS_ERROR, err)
				})
			} else __applyResponce(storage.STATUS_ERROR, "Database Error");
		})
	} else __applyResponce(storage.STATUS_ERROR, "Storage not ready");
}