/**
 * Some mootools customizations - may break spec
 * @provides [hacks, patches]
 */
(function(window) {
    var stringProto = String.prototype,
        forEach = Array.prototype.forEach;
    //okay this is mainly just for preference - didnt like merges behaviour with classes particularly with Options.setOptions and this was the easiest way to reimplemnt it
    //https://github.com/mootools/mootools-core/issues/2526
    var mergeOne = function(source, key, current){
        switch (typeOf(current)){
            case "object":
                if(current.$constructor && "$caller" in current) source[key] = current;//class instance check (only change)
                else if (typeOf(source[key]) == "object") Object.merge(source[key], current);
                else source[key] = Object.clone(current);
                break;
            case "array":
                source[key] = current.clone();
                break;
            default:
                source[key] = current;
        }
        return source;
    };

    Object.extend({
        merge: function(source, k, v){
            if (typeOf(k) == "string") return mergeOne(source, k, v);
            for (var i = 1, l = arguments.length; i < l; i++){
                var object = arguments[i];
                for (var key in object) mergeOne(source, key, object[key]);
            }
            return source;
        }
    });

    Class.refactor(Request, {
        initialize: function(options) {
            var self = this;
            self.previous(options);
            self.promise = new Promise(function (fulfill, reject) {
                self.addEvents({
                    success: fulfill,
                    failure: reject
                });
            });
        }
    })
    .implement({
        "then": function(success, error) {
            return this.promise.then(success, error);
        },
        "catch": function(error) {
            return this.promise["catch"](error);
        }
    });

    ["startsWith", "endsWith", "trimLeft", "trimRight"].each(function(method) {
        try{
            if(stringProto[method]) stringProto[method].protect();
        }catch(o_O){}
    });

    String.implement({
        //see es6 spec
        startsWith: function(what, pos) {
            what = String(what);
            return this.slice((pos || 0), what.length) == what;
        },
        endsWith: function(what, pos) {
            what = String(what);
            var end = Math.max(pos, 0);
            if (isNaN(end) || end > this.length) end = this.length;
            return this.slice(end - what.length, end) == what;
        },

        trimRight: function (){
            return this.replace(/\s+$/, "");
        },

        trimLeft: function() {
            return this.replace(/^\s+/, "");
        }
    });

    Array.implement("each", function(fn, context) {//optimization avoids some fn calls
        forEach.call(this, fn, context);
        return this;
    });

    Element.Properties.val = Element.Properties.value = {
        get: function() {
            return this[(this.get("type") == "checkbox") ? "checked" : "value"];
        },
        set: function(val) {
            this[(this.get("type") == "checkbox") ? "checked" : "value"] = val;
        }
    };

    ["html", "text", "val"].each(function(fn) {
        Element.implement(fn, function(data) {
            if (typeof data !== "undefined") return this.set(fn, data);
            return this.get(fn);
        });
    });

    _.extend(Element.NativeEvents, {
        adopt: 2,
        disown: 2
    });

    function adoptEvent(ele, args) {
        try { //good old ie throws for some elements
            ele.fireEvent("adopt", args);
        } catch (fuckie) {}
        return ele;
    }

    Class.refactor(Element, {
        adopt: function() {
            //just mootools adopt method which fires an event when called
            return adoptEvent(this.previous.apply(this, arguments), arguments);
        },
        inject: function(el) {
            this.previous.apply(this, arguments);
            adoptEvent(el, [this]);
            return this;
        }/*,
        dispose: function() {
            return disposeEvent(this.previous.apply(this, arguments));
        }*/
    })
    .implement({
        //removes all elements in arguments from array if found - opposite of adopt
        disown: function() {
            forEach.call(arguments, function(element) {
                element = document.id(element, true);
                if (element) element.dispose();
            });
            return this.fireEvent("disown", arguments);
        },

        maxChildren: function(n) {
            for (var ele, c = this.children; c.length > n && (ele = this.firstChild);) {
                ele.dispose();
            }
            return this;
        },

        insertAt: function(element, position) {
            //http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-952280727
            this.insertBefore(element, this.childNodes[position] || null); //returns element
            return this;
        },

        isDisplayed: function() {
            return !this.hasClass("hidden");
        },

        // normal mootool version uses display property - this way helps with selectors
        show: function() {
            return this.removeClass("hidden");
        },

        hide: function() {
            return this.addClass("hidden");
        },

        toggle: function(state) {
            if (state == null) state = !this.isDisplayed();
            return this[state ? "show" : "hide"]();
        },

        addClasses: function(classes) {
            classes.each(this.addClass, this);
            return this;
        },

        removeClasses: function(classes) {
            classes.each(this.removeClass, this);
            return this;
        }
    });

    window.$clear = function(timer) {
        clearTimeout(timer);
        clearInterval(timer);
        return null;
    };
})(this);