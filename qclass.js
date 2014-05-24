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
  // These properties are used internally by `qclass` definition and shouldn't
  // be overridden.
  extend    : null,
  construct : null,

  extensions: null,
  middleware: null,

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
  var $Extensions = {};
  var $Middleware = [];

  var obj;
  var k = "";
  var i, len;

  // Inherit `extensions`.
  obj = $Super.$Extensions || qExtensions;
  for (k in obj)
    $Extensions[k] = obj[k];

  if (def.hasOwnProperty("extensions")) {
    obj = def.extensions;
    if (obj == null || typeof obj !== "object")
      throw new Error("qclass() - `extensions` has to be an object.")

    for (k in obj)
      $Extensions[k] = obj[k];
  }

  // Inherit `middleware`.
  if ($Super.$Middleware) {
    var obj = $Super.$Middleware;

    for (i = 0, len = obj.length; i < len; i++)
      $Middleware.push(obj[i]);
  }

  if (def.hasOwnProperty("middleware")) {
    obj = def.middleware;
    if (typeof obj !== "function")
      throw new Error("qclass() - `middleware` has to be a function.");

    $Middleware.push(obj);
  }

  // Initialize the new `Class`, copy members and statics.
  $Class.$Super = $Super;
  $Class.$Extensions = $Extensions;
  $Class.$Middleware = $Middleware;

  qPrototype.prototype = $Super.prototype;
  var p = $Class.prototype = new qPrototype();

  for (k in def) {
    var e = $Extensions[k];
    var v = def[k];

    // The value is merged to the prototype directly if the extension doesn't
    // override the key `k`.
    if (e === undefined || !$Extensions.hasOwnProperty(k)) {
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

  // Initialize the new `Class` by using its middleware.
  for (i = 0, len = $Middleware.length; i < len; i++)
    $Middleware[i].call($Class, def);

  return $Class;
};
$export[$as] = qclass;

}).apply(this, typeof module === "object" ? [module, "exports"] : [this, "qclass"]);