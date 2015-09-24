var fs = require('fs');
var path = require('path');
var url = require('url');
var rootPath = require('app-root-path').path;

/*
 * optinos
 * options.category
 * options.resource
 * options.method
 * options.data
 * options.params
 */
module.exports.callApi = function (req, res, next, options, callback) {

    var category = options.category;
    var resource = options.resource;
    var method = options.method;

    var coreApi = path.resolve(rootPath, './core/apis/' + category + "/" + resource);
    var appApi = path.resolve(rootPath, './app/apis/' + category + "/" + resource);

    function call(apiPath) {
        var assembly = require(apiPath + "/" + resource + ".assembly");

        var cachedCallback = req.callback;
        var body = req.body;
        var query = req.query;
        var params = req.params;

        method = method.toLowerCase();
        if (method == 'get' || method == 'gets') {
            req.query = options.data;
        } else {
            req.body = options.data;
        }

        req.params = options.params;

        req.callback = function (status, data) {
            req.callback = cachedCallback;

            req.body = body;
            req.query = query;
            req.params = params;

            if (!req.loadedApis) req.loadedApis = {};
            if (!req.loadedApis[category]) req.loadedApis[category] = {};
            if (!req.loadedApis[category][resource]) req.loadedApis[category][resource] = {};
            if (!req.loadedApis[category][resource][method]) req.loadedApis[category][resource][method] = [];

            if (data) {
                req.loadedApis[category][resource][method].push(data);
            }

            callback(status, data);
        };
        assembly.api[method]()(req, res, next);
    }

    fs.exists(appApi, function (exists) {
        if (!exists) {
            fs.exists(coreApi, function (exists) {
                if (!exists) {
                    return callback(404);
                } else {
                    call(coreApi);
                }
            });
        } else {
            call(appApi);
        }
    });
};

module.exports.prepareParam = function (contentName) {
    return function (req, res, next) {
        req.preparedParam = {
            params: {
                contentName: contentName || "",
                data: req.loadedApis,
                meta: req.meta,
                url: url.parse(req.protocol + '://' + req.get('host') + req.originalUrl),
                headers: req.headers,
                language: (req.params && req.params.language) || (req.user && req.user.language) || req.language,
                country: (req.params && req.params.country) || (req.user && req.user.country) || req.country
            }
        };
        next();
    };
};