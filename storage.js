const mega = require('mega');
const fs = require('fs');

const MEGA_ACCOUNT = "email";
const MEGA_PASSWORD = "password";
const MEGA_STORAGE = [(process.env.NODE_ENV || "local"), "collection", "year", "month","day"];

const STATUS_OK = "ok"
const STATUS_ERROR = "error"

var isREADY = false;
var storage;

function MakeDirAtPathWithID(name, path, parentId, callback) {
     path = path ? path + "/" + name : name;
     fs.mkdirSync(path);
     var opt = parentId ? {
          name: name
     ,    target: parentId 
     } : name;
     storage.mkdir(opt, function(err, file){
          if(err) throw new Error("MakeDirAtPathWithID error:", err);
          fs.writeFileSync(path + "/nodeId", file.nodeId);
          callback(file.nodeId, path);
     });
}

function CreateFolderFromPathIfNotExist(name, fpath, cb) {
     var buffer = fs.readFileSync(fpath + "/nodeId")
     var nodeId = buffer.toString();
     var path = fpath + "/" + name;
     if(fs.existsSync(path)) {
          buffer = fs.readFileSync(path + "/nodeId");
          nodeId = buffer.toString();
          cb(nodeId, path);
     } else {
          MakeDirAtPathWithID(name, fpath, nodeId, cb)
     }
}

function CheckCloudFolderStructureExistForDate(date, folder, callback) {
     var mm         = String(date.getMonth()); //January is 0!
     var yyyy       = String(date.getFullYear());
     
     if(fs.existsSync("storage")) {
          CreateFolderFromPathIfNotExist(yyyy, "storage/" + folder, function(idYear, pathYear){
               console.log("FolderID YEAR:", idYear, pathYear);
               CreateFolderFromPathIfNotExist(mm, pathYear, function(idMonth, pathMonth) {
                    console.log("FolderID MONTH:", idMonth, pathMonth);
                    callback(idMonth, pathMonth);
               });
          });
     } else {
          MakeDirAtPathWithID("storage", null, null, function(id1, path1){
               console.log("FolderID:", id1);
               MakeDirAtPathWithID(folder, path1, id1, function(id2, path2){
                    console.log("FolderID:", id2, path2);
                    MakeDirAtPathWithID(yyyy, path2, id2, function(id3, path3){
                         console.log("FolderID:", id3, path3);
                         MakeDirAtPathWithID(mm, path3, id3, function(id4, path4){
                              console.log("FolderID:", id4, path4);
                              callback(id4, path4);
                         })
                    })
               })
          });
     }
}

/*************************************************************************
* STORAGE API
*/
module.exports = this;
exports.STATUS_OK = STATUS_OK;
exports.STATUS_ERROR = STATUS_ERROR;
exports.isREADY = function(){
     return isREADY;
};

exports.init = function(callback){
     storage = mega({
               email     :    MEGA_ACCOUNT
          ,    password  :    MEGA_PASSWORD
          }, function(error) {
               if(!error) {
                    console.log(" > STORAGE is READY");
                    isREADY = true;
                    callback();
               } 
          }
     );
};

exports.backupFromCollectionAtDate = function(collection, year, month, day, array, res ) {
     MEGA_STORAGE[1] = collection;
     MEGA_STORAGE[2] = year;
     MEGA_STORAGE[3] = month;
     MEGA_STORAGE[4] = day;
     const alength = array.length;
     const text = JSON.stringify(array);
     const isFunction = typeof res == "function";
     const storagePath = MEGA_STORAGE.join("-");
     const buf = new Buffer(text, 'utf8');
     console.log(" - FILENAME", storagePath);
     CheckCloudFolderStructureExistForDate(new Date(year, month, day), "nest", function(id, path){
          console.log("SAVE TO FOLDER", id, path);
          CreateFolderFromPathIfNotExist(collection, path, function(folderID, folderPATH) {
               console.log("BACKUP", buf.length, folderID, folderPATH );
               storage.upload({
                    name: storagePath + '.json'
               ,    target: folderID    
               ,    size: buf.length   
               }, buf, function(err, file) {
                    if(!err) {
                         console.log("BACKUP COMPLETE!");
                         if(isFunction) res( STATUS_OK, alength )
                         else res.status(200).json({ status:STATUS_OK, message:"Backup Complete", count:alength })
                    } else {
                         console.log("BACKUP ERROR:", err);
                         if(isFunction) res( STATUS_ERROR, alength )
                         else res.status(400).json({ status:STATUS_ERROR, message:"Backup Error" })
                    }
               })
          })
     });
}
/*
**************************************************************************/

