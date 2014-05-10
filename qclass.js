// QClass <https://github.com/kobalicek/qclass>
// Quick and simple JavaScript class library (Unlicense).
(function($export, $as) {
"use strict";

// A helper that is used to create a new `qPrototype` without actually creating
// an instance of class that is being extended.
var qPrototype = function() {};

// Returns a default constructor, used if no constructor has been provided to
// the `Class`.
var qConstruct = function(Super) {
  return function() {
    Super.apply(this, arguments);
  };
};

// This are the default (built-in) extensions for creating a new `Class`.
// Basically only default properties are set-up leaving space for third
// party extensions as designed.
var qExtensions = {
  // These properties are used internally by `qclass` definition and
  // shouldn't be overridden. 
  extend: null,
  construct: null,
  extensions: null,

  // Override the default Object.toString() function.
  toString: function(fn) {
    this.prototype.toString = fn;
  },

  // Statics are merged directly to the class object.
  statics: function(obj) {
    for (var k in obj)
      this[k] = obj[k];
  }
};

// `qclass(def)`
//
// Creates a new class object based on `def` definition.
var qclass = function(def) {
  var $Super = def.extend || Object;
  var $Class = def.construct || qConstruct($Super);

  var $OtherExt = $Super.$Extensions || qExtensions;
  var $ClassExt = {};

  var k;

  for (k in $OtherExt) {
    $ClassExt[k] = $OtherExt[k];
  }

  $OtherExt = def.extensions;
  if (typeof $OtherExt === "object") {
    for (k in $OtherExt)
      $ClassExt[k] = $OtherExt[k];
  }

  $Class.$Super = $Super;
  $Class.$Extensions = $ClassExt;

  qPrototype.prototype = $Super.prototype;
  var p = $Class.prototype = new qPrototype();

  for (k in def) {
    var e = $ClassExt[k];
    var v = def[k];
    
    // The value is merged to the prototype directly if the extension doesn't
    // override the key `k`.
    if (e === undefined || !$ClassExt.hasOwnProperty(k)) {
      p[k] = v;
      continue;
    }

    // Extension is only called if it's truthy, which means that it should be
    // a callable object. By default `extend` and `construct` are null to
    // prevent putting them to `$Class.prototype`, which is unwanted.
    if (!e)
      continue;

    e.call($Class, v, k, def);
  }

  return $Class;
};
$export[$as] = qclass;

}).apply(this, typeof module === "object" ? [module, "exports"] : [this, "qclass"]);