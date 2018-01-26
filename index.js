"use strict";

var debug = require('debug')('body-parser:msgpack')

const read = require("body-parser/lib/read");
const msgpack = require("msgpack5")();
const bytes = require('bytes');
const typeIs = require('type-is');

function typeChecker(type) {
    return function checkType(req) {
        return Boolean(typeIs(req, type))
    }
}

module.exports = function(bodyParser) {
    if(bodyParser.msgpack)
        return;

    function extension(options) {
        var opts = options || {};

        var inflate = opts.inflate !== false;
        var limit = typeof opts.limit !== 'number'
            ? bytes.parse(opts.limit || '100kb')
            : opts.limit;
        var type = opts.type || 'application/msgpack';
        var verify = opts.verify || false;

        if (verify !== false && typeof verify !== 'function') {
            throw new TypeError('option verify must be function')
        }

        // create the appropriate type checking function
        var shouldParse = typeof type !== 'function'
            ? typeChecker(type)
            : type;

        function parse(buf) {
            if (buf.length === 0) {
                debug('buffer is zero');
                return {}
            }

            debug('parsing message-pack content');
            return msgpack.decode(buf);
        }

        return function middleware(req, res, next) {
            if (req._body) {
                debug('body already parsed');
                return next();
            }

            req.body = req.body || {};

            // skip requests without bodies
            if (!typeIs.hasBody(req)) {
                debug('skip empty body');
                return  next();
            }

            debug('content-type %j', req.headers['content-type']);

            // determine if request should be parsed
            if (!shouldParse(req)) {
                debug('skip parsing');
                return next();
            }

            // read
            read(req, res, next, parse, debug, {
                encoding: null,
                inflate: inflate,
                limit: limit,
                verify: verify
            })
        }
    }

    Object.defineProperty(bodyParser, 'msgpack', {
        configurable: true,
        enumerable: true,
        get: function() {
            return extension;
        }
    });
};