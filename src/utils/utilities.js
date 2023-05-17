const ejs = require('ejs');
const path = require("path");

class Utilities {

    static renderEJS(file, response, data = {}){

        ejs.renderFile(path.resolve(__dirname + '/../views/' + file), data,

            function (err, data){

            if(err){
                console.log(err);
                response.end('An internal error occured.');
            }
            else{
                response.end(data);
            }

        });

    }

}

module.exports = Utilities;