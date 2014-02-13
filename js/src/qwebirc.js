/* qwebirc -- Copyright (C) 2008-2011 Chris Porter and the qwebirc project --- All rights reserved. */
// ; (function(window, Epitome, undefined) {

//wrapped in iife during grunt build
/* jshint globalstrict:true */
"use strict";

var DEBUG = <%= build.debug %>; //will be removed as dead code if false

//cache common globals in scope
var $ = document.id,
    $$ = document.getElements,
    Class = window.Class,
    Options = window.Options,
    Events = window.Events,
    _ = window._,
    Epitome = window.Epitome;


//global object
var qwebirc = window.qwebirc = _.merge(window.qwebirc || {}, {
    irc: {},
    ui: {
        themes: {}
    },
    util: {
        crypto: {}
    },
    global: {
        dynamicBaseURL: "/",
        staticBaseURL: "/"
    },
    config: {},
    auth: {
        loggedin: false,
        enabled: false,

        passAuth: Function.from(true),
        bouncerAuth: Function.from(false)
    },
    sound: {},
    lang: {
        windowNames: {}
    },
    constants: {},
    templates: {},
    cookies: {
        "options": "qweb-options",
        "history": "qweb-hist",
        "settings": "qweb-settings"
    },
    VERSION: "<%= pkg.version %>"
});

var irc = qwebirc.irc,

    util = qwebirc.util,
    crypto = util.crypto,

    config = qwebirc.config,
    auth = qwebirc.auth,

    ui = qwebirc.ui,
    themes = ui.themes,

    cookies = qwebirc.cookies,

    sound = qwebirc.sound,

    lang = qwebirc.lang,
    windowNames = lang.windowNames,

    templates = qwebirc.templates,

    constants = qwebirc.constants;