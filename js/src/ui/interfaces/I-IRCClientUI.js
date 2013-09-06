
(function() {

//expects to be implemented with windowsui
ui.IIRCClient = new Class({
    Implements: [ui.IWindows],

    clients: {},
    clientId: 0,

    newClient: function(client) {
        client.id = this.clientId++;

        var windows = this.windows[client.id] = {};
        this.clients[client.id] = client;
        var win = this.newWindow(client, ui.WINDOW.status, STATUS);
        this.selectWindow(win);

        addClientEvents.call(this, client, windows);

        return win;
    },
    logout: function() {
        if (!auth.loggedin)
            return;
        if (confirm("Log out?")) {
            _.each(this.clients, function(client) {
                client.quit(lang.logOut.message);
            });

            (function() {
                document.location = qwebirc.global.dynamicBaseURL + "auth?logout=1";
            }).delay(500);
        }
    },

    nickChange: util.noop,
});
var broadcast_re = /MSG|TOPIC|(CHAN|PRIV)NOTICE/i;
function formatChans(data) {
    var chans = data.channels;
    return chans && _.isObject(chans) ? _.keys(chans) : Array.from(chans || data.channel);
}
function addClientEvents(client, windows) { // mi gusta xD
    if(! client instanceof irc.IRCClient) return;
    var ui_ = this;
    function formatData(type, _data) {
        var data = _.extend({
            c: _data.channel || STATUS,
            n: _data.nick,
            m: _data.message,
            h: _data.host,
            t: type,
            type: type
        }, _data);
        data.channel = data.c;
        if (!(ui_.uiOptions2.get("nick_ov_status"))){
            delete data["@"];
        }
        return data;
    }

    function lineParser(type, data) {
        data = formatData(type, data);
        
        _.each(formatChans(data), function(channel) {
            data.channel = data.c = channel;
            var win = (data.c === ACTIVE) ? ui_.getActiveWindow() : ui_.getWindow(client, channel);
            if(!win) return;
            if(_.isArray(data.message)) {
                _.each(data.message, function(msg) {
                    data.message = data.m = msg;
                    parser(type, data, win);
                });
            }
            else {
                parser(type, data, win);
            }
        });
    }

    function parser(type, data, win, channel) {
        type = data.type || data.t || type;
        channel = data.channel || STATUS;

        win.addLine(data.type, data);

        if(!util.isBaseWindow(data.channel) && broadcast_re.test(type)) {
            var data2 = _.clone(data);
            data2.nick = data2.n = util.isChannel(data.c) ? data.n + data.c ://chanmsg
                                                            data.n + ">" + data.c;//pm
            ui_.windows.brouhaha.addLine(data.type, data2);
        }
    }

    function updateTopic(type, data) {
        ui_.getWindow(client, data.channel).updateTopic(data.topic);
        if(!data.initial) {
            data.message = data.topic;
            lineParser("topic", data);
        }
    }

    function joinPart(type, data) {
        if ((data.thisclient && data.type != "PART" && data.type != "QUIT") ||
                !(ui_.uiOptions2.get("hide_joinparts"))) {
            data = _.clone(data);
            data.channels = _.reject(formatChans(data),  util.isBaseWindow);
            lineParser(type, data);
        }
    }

    function partKick(type, data) {
        if(data.thisclient) {
            var win = ui_.getWindow(client, data.channel);
            if(win) win.close();
        } else {
            joinPart(type,data);
        }
    }

    client.addEvents({
        "connect": lineParser,
        // "disconnect": lineParser,
        "error": lineParser,
        "info": lineParser,

        "chanAction": lineParser,
        "chanTopic": updateTopic,
        "chanMessage": lineParser,
        "chanNotice": lineParser,
        "chanCTCP": lineParser,

        "userJoined": function(type, data) {
            if(data.thisclient) {
                var win = ui_.newWindow(client, ui.WINDOW.channel, data.channel);//this is client scope
                if(data.select) {
                    win.select();
                }
            }
            joinPart(data.thisclient ? "ourJoin" : "join", data);
        },

        openWindow: function(type, data) {//create? and select window
            var win = ui_.getWindow(data.window);
            if(!win) {
                if(data.type === ui.WINDOW.custom) {
                    win = ui_[data.window]();
                } else {
                    win = ui_.newWindow(client, data.type, data.window);
                }
            }
            win.select();
        },

        "away": lineParser,
        "part": partKick,
        "quit": partKick,
        "kick": partKick,
        "invite": lineParser,
        "privAction": lineParser,
        "privCTCP": lineParser,
        "ctcpReply": lineParser,
        "userMode": lineParser,
        "nickChange": function(type, data) {
            ui_.nickChange(data);
            lineParser(type, data);
        },
        "privNotice": lineParser,

        "query": function(type, data) {//queries
            data = formatData(type, data);
            var win = ui_.newWindow(client, ui.WINDOW.query, data.channel); //get or create
            if(ui_.uiOptions2.get("auto_open_pm")) {
                ui_.selectWindow(win);
            }
            parser(type, data, win);
        },

        "awayStatus": lineParser,
        "mode": function(type, data) {
            var win = ui_.getWindow(data.channel);
            if(win) {
                win.updatePrefix(data);
            }
            lineParser(type, data);
        },
        "serverMessage": lineParser,
        "serverNotice": lineParser,
        "whois": function(type, data) {
            _.each(data.msgs, function(msg) {
                lineParser(type, _.extend({}, data, msg));
            });
        },
        "wallops": lineParser,
        "raw": function(type, args) {
            lineParser(type, args);
        }
    });
}

})();