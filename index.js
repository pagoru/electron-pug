'use strict';

const {app, protocol} = require('electron');
const fs = require('fs');
const path = require('path');
const pug = require('pug');
const {_extend: extend} = require('util');
const mime = require('mime');
const less = require('less');


/**
 * Returns path for file from given URL.
 *
 * 'url' module is internally used to parse URLs. For *nix file
 * system URLs 'pathname' of parsed object is used. For Window,
 * however, local files start with a slash if no host is given
 * and this functions simply drops that leading slash with no
 * further complicated logic.
 *
 * @param  {String} url URL denoting file
 * @return {String} path to file
 */
const getPath = url => {
    let parsed = require('url').parse(url);
    let result = decodeURIComponent(parsed.pathname);

    // Local files in windows start with slash if no host is given
    // file:///c:/something.pug
    if(process.platform === 'win32' && !parsed.host.trim()) {
        result = result.substr(1);
    }

    return result;
};

/**
 * Callback handler for 'interceptBufferProtocol'.
 * It simply logs to output if intercepting the protocol
 * has succeeded or failed.
 *
 * @param {Error} error not undefined if any error happens
 */
const interceptCB = error => {
    if (!error) {
        console.log('Pug & less interceptor registered successfully');
    } else {
        console.error('Pug & less interceptor failed:', error);
    }
};

module.exports = (pugOptions, locals) => {
    app.on('ready', () => {
        let options = extend({}, pugOptions || {});

        protocol.interceptBufferProtocol('file', (request, callback) => {
            let file = getPath(request.url);

            // See if file actually exists
            try {
                let content = fs.readFileSync(file);

                let ext = path.extname(file);

                switch (ext){
                    case '.pug':
                        let compiled = pug.compileFile(file, pugOptions)(locals);

                        return callback({data: new Buffer(compiled), mimeType:'text/html'});
                    case '.less':
                        less.render(content.toString(), (error, compiled) => {
                            if(error) callback(error);
                            return callback({data: new Buffer(compiled.css), mimeType:'text/css'});
                        });
                        break;
                    default:
                        return callback({data: content, mimeType: mime.lookup(ext)});
                }
            } catch (e) {
                return callback(e);
            }
        }, interceptCB);
    });
};
