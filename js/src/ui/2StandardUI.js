
ui.StandardUI = new Class({
    Extends: ui.BaseUI,
    Binds: ["__handleHotkey", "optionsWindow", "embeddedWindow", "urlDispatcher", "resetTabComplete", "whoisURL"],

    UICommands: ui.UI_COMMANDS,
    initialize: function(parentElement, windowClass, uiName, options) {
        this.parent(parentElement, windowClass, uiName, options);

        this.tabCompleter = new ui.TabCompleterFactory(this);
        // this.uiOptions = new ui.DefaultOptionsClass(this, options.uiOptionsArg);
        this.uiOptions2 = new config.OptionModel({
            defaults: options.uiOptionsArg
        });
        this.uiOptions2.on("change:style_hue", function(hue) {
            this.setModifiableStylesheetValues({
                hue: hue
            });
        }.bind(this));



        this.customWindows = {};

        this.__styleValues = {
            hue: this.options.hue || this.uiOptions2.get("style_hue"),
            saturation: this.options.saturation || this.uiOptions2.get("style_saturation"),
            lightness: this.options.lightness || this.uiOptions2.get("style_brightness")
        };

        var ev = Browser.Engine.trident ? "keydown" : "keypress";
        document.addEvent(ev, this.__handleHotkey);
    },
    __handleHotkey: function(x) {
        if (!x.alt || x.control) {
            if (x.key === "backspace" || x.key === "/")
                if (!this.getInputFocused(x))
                    x.stop();
            return;
        }
        var success = false;
        if (x.key.match(/a/i)) {
            var highestNum = 0;
            var highestIndex = -1;
            success = true;

            x.stop();
            //good place for foldr no?
            this.windowArray.each(function(win, indx){
                var h = win.hilighted;
                if (h > highestNum) {
                    highestIndex = indx;
                    highestNum = h;
                }
            });
            if (highestIndex !== -1)
                this.selectWindow(this.windowArray[highestIndex]);
        } else if (prelude.isNumber(x.key)) { /*x.key >= '0' && x.key <= '9'*/
            success = true;

            //number = x.key - '0'; //ridiculously stupid
            number = (Number.toInt(x.key) || 10) - 1;

            if (number >= this.windowArray.length)
                return;

            this.selectWindow(this.windowArray[number]);
        } else if (x.key == "left") {
            this.prevWindow();
            success = true;
        } else if (x.key == "right") {
            this.nextWindow();
            success = true;
        }
        if (success)
            x.stop();
    },
    getInputFocused: function(x) {
        //wtf? (x.target.TYPE =="INPUT") or something work?
        var focused = !($$("input").contains(x.target) && $$("textarea").contains(x.target));
        return focused;
    },
    newCustomWindow: function(name, select, type) {
        if (!type)
            type = ui.WINDOW_CUSTOM;

        var win = this.newWindow(ui.CUSTOM_CLIENT, type, name);
        (win.on || win.addEvent).call(win, "close", function(win) {
            delete this.windows[ui.CUSTOM_CLIENT][win.identifier];
        }.bind(this));

        if (select)
            this.selectWindow(win);

        return win;
    },
    addCustomWindow: function(windowName, class_, cssClass, options) {
        if (!$defined(options))
            options = {};

        if (this.customWindows[windowName]) {
            this.selectWindow(this.customWindows[windowName]);
            return;
        }

        var win = this.newCustomWindow(windowName, true);
        this.customWindows[windowName] = win;

        win.addEvent("close", function() {
            this.customWindows[windowName] = null;
        }.bind(this));

        if (cssClass)
            win.lines.addClass("qwebirc-" + cssClass);

        var ew = new class_(win.lines, options);
        (ew.on || ew.addEvent).call(ew, "close", win.close);

        win.setSubWindow(ew);
    },
    embeddedWindow: function() {
        this.addCustomWindow("Add webchat to your site", ui.EmbedWizard, "embeddedwizard", {
            baseURL: this.options.baseURL,
            uiOptions: this.uiOptions2,
            optionsCallback: this.optionsWindow
        });
    },
    optionsWindow: function() {
        var constructor = function(element, data) {
            return new ui.OptionView({
                element: element,
                model: data
            });
        }
        this.addCustomWindow("Options", constructor, "optionspane", this.uiOptions2);
    },
    aboutWindow: function() {
        this.addCustomWindow("About", ui.AboutPane, "aboutpane", this.uiOptions2);
    },
    privacyWindow: function() {
        this.addCustomWindow("Privacy policy", ui.PrivacyPolicyPane, "privacypolicypane", this.uiOptions2);
    },
    feedbackWindow: function() {
        this.addCustomWindow("Feedback", ui.FeedbackPane, "feedbackpane", this.uiOptions2);
    },
    faqWindow: function() {
        this.addCustomWindow("FAQ", ui.FAQPane, "faqpane", this.uiOptions2);
    },
    urlDispatcher: function(name, window) {
        if (name == "embedded") {
            return ["a", this.embeddedWindow];
        }
        else if (name == "options"){
            return ["a", this.optionsWindow];
        }
        /* doesn't really belong here */
        else if (name === "whois") {
            var uiOptions2 = this.uiOptions2;
            ///this method is dumb
            return ["span", function(nick) {
                if (uiOptions2.QUERY_ON_NICK_CLICK) {
                    window.client.exec("/QUERY " + nick);
                } else {
                    if (isChannel(nick)) {
                        nick = util.unformatChannel(nick);
                    } else {
                        if (nick.search(window.client.nickname + '>') >= 0) {
                            nick = nick.substr(nick.search('>') + 1, nick.length);
                        } else {
                            nick = nick.substr(0, nick.search('>'));
                        }
                    }
                    // window.properties.text(nick);
                    window.client.exec("/WHOIS " + nick);
                }
            }];
        }
        else
            return null;
    },

    whoisURL: function(e, target) {
        var client = target.getParent('.lines').retrieve('client'),
            nick = target.get('data-user');
        if (this.uiOptions2.QUERY_ON_NICK_CLICK) {
            client.exec("/QUERY " + nick);
        } else {
            if (isChannel(nick)) {
                nick = util.unformatChannel(nick);
            } else if (nick.search(client.nickname + '>') >= 0) {
                nick = nick.substr(nick.search('>') + 1, nick.length);
            } 
            client.exec("/WHOIS " + nick);
        }
    },

    chanURL: function(e, target) {
        var client = target.getParent('.lines').retrieve('client'),
            chan = target.get('data-chan');
        if(util.isChannel(chan))
            client.exec("/JOIN " + chan);
    },

    tabComplete: function(element) {
        this.tabCompleter.tabComplete(element);
    },
    resetTabComplete: function() {
        this.tabCompleter.reset();
    },
    setModifiableStylesheet: function(name) {
        this.__styleSheet = new ui.style.ModifiableStylesheet(this.options.modifiableStylesheet);
        this.setModifiableStylesheetValues({});
    },
    setModifiableStylesheetValues: function(values) {
        // for (var k in values)
        //     this.__styleValues[k] = values[k];
        $extend(this.__styleValues, values);

        if (!$defined(this.__styleSheet))
            return;

        var hue = this.__styleValues.hue,
            lightness = this.__styleValues.lightness,
            saturation = this.__styleValues.saturation,
            uiOptions = this.uiOptions2;

        this.__styleSheet.set(function(mode, col) {
            if (mode == "c") {
                var x = new Color(col);
                var c = x.setHue(hue).setSaturation(x.hsb[1] + saturation).setBrightness(x.hsb[2] + lightness);
                if (c == "255,255,255") // IE confuses white with transparent... 
                c = "255,255,254";

                return "rgb(" + c + ")";
            } else if (mode == "o") {
                return uiOptions.get([arguments[1]] ? arguments[2] : arguments[3]);
            }
        });
    }
});
