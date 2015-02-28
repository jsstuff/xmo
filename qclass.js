// QClass <https://github.com/jshq/qclass>
(function($export, $as) {
"use strict";

// \internal
// \{
var hasOwn = Object.prototype.hasOwnProperty;
// \}

// A helper that is used to create a new `qPrototype` without actually creating
// an instance of class that is being extended.
function qcPrototype() {}

// Returns a default constructor, used if no constructor has been provided to
// the `Class`.
function qcConstruct(Super) {
  return function() {
    Super.apply(this, arguments);
  };
}

// Returns `true` if a given object has no own properties.
function qcIsEmpty(obj) {
  for (var k in obj)
    if (hasOwn.call(obj, k))
      return false;
  return true;
}

// Copy properties from `src` to `dst` in a safe way, using Object's native
// `hasOwnProperty()` method to check for a property presence.
function qcMerge(dst /*, ... */) {
  for (var i = 1, len = arguments.length; i < len; i++) {
    var src = arguments[i];
    for (var k in src) {
      if (hasOwn.call(src, k))
        dst[k] = src[k];
    }
  }

  return dst;
}

function qcConcat(dst) {
  for (var i = 1, iLen = arguments.length; i < iLen; i++) {
    var src = arguments[i];
    for (var j = 0, jLen = src.length; j < jLen; j++) {
      dst.push(src[j]);
    }
  }

  return dst;
}

// Default (built-in) extensions for creating a new `Class`. Basically only
// default properties are set-up leaving space for third-party extensions.
var qcNoExtensions = {
  // These properties are used internally by `qclass` definition and shouldn't
  // be overridden.
  $construct   : null, // Constructor.
  $extend      : null, // Base class.
  $mixins      : null, // Mixins.
  $hooks       : null, // Hooks (called each time a new class is defined).
  $extensions  : null, // Extensions.

  // Statics are merged directly to the class object.
  $statics: function(obj) {
    qcMerge(this, obj);
  }
};

// Default (built-in) hooks (none).
var qcNoHooks = [];

// Properties that will be skipped when including mixins.
var qcIgnoreMixinProperties = {
  $qcExtensions: true,
  $qcHooks     : true,
  $qcMembers   : true,
  $qcMixin     : true
};

// `qclass.mixin(def)`
//
// Create a new `Mixin` based on `def`.
function mixin(def) {
  // Create a new `Mixin` object.
  var Mixin = function() {
    throw new TypeError("Mixins can't be instantiated.");
  };

  if (def.$construct)
    throw new TypeError("qclass.mixin() - `$construct` is forbidden.");

  if (def.$extend)
    throw new TypeError("qclass.mixin() - `$extend` is forbidden.");

  var i, len, obj;
  var $qcMembers = {};
  var $qcHooks = [];
  var $qcExtensions = {};

  Mixin.$qcMixin = true;
  Mixin.$qcMembers = $qcMembers;
  Mixin.$qcHooks = $qcHooks;
  Mixin.$qcExtensions = $qcExtensions;

  // Include mixins.
  var mixins = def.$mixins;
  if (mixins) {
    i   = 0;
    len = 1;
    obj = mixins;

    // Mixins should be an array, but it's allowed to omit it in case of using
    // a single mixin. The `$qcMixin` check should be sufficient.
    if (mixins.$qcMixin !== true) {
      len = obj.length;
      obj = mixins[0];
    }

    for (;;) {
      if (obj.$qcMixin !== true)
        throw new TypeError("qclass.mixin() - `$mixins` can only specify mixin(s).");

      // Copy `$mixin` members.
      qcMerge($qcMembers, obj.$qcMembers);

      // Copy `$mixin` hooks.
      qcConcat($qcHooks, obj.$qcHooks);

      // Copy `$mixin` extensions.
      qcMerge($qcExtensions, obj.$qcExtensions);

      // Copy `$mixin` statics.
      for (k in obj) {
        if (hasOwn.call(qcIgnoreMixinProperties, k))
          continue;
        Mixin[k] = obj[k];
      }

      if (++i >= len)
        break;
      obj = mixins[i];
    }
  }

  // Initialize members.
  for (var k in def) {
    if (hasOwn.call(qcNoExtensions, k))
      continue;
    $qcMembers[k] = def[k];
  }

  // Initialize hooks.
  obj = def.$hooks;
  if (obj)
    qcConcat($qcHooks, obj.$qcMixin ? [obj] : obj);

  // Initialize extensions.
  obj = def.$extensions;
  if (obj)
    qcMerge($qcExtensions, obj);

  // Initialize statics.
  obj = def.$statics;
  if (obj)
    qcMerge(Mixin, obj);

  return Mixin;
}

// `qclass(def)`
//
// Create a new `Class` based on `def`.
function qclass(def) {
  // Create a new `Class` object.
  var Super = def.$extend || Object;
  var Class = def.$construct || qcConstruct(Super);

  var $initHooks = Super.$qcHooks || qcNoHooks;
  var $initExtensions = Super.$qcExtensions || qcNoExtensions;

  var $qcHooks = $initHooks;
  var $qcExtensions = $initExtensions;

  var obj;
  var k = "";
  var i, len;

  // Initialize class and prototype.
  qcPrototype.prototype = Super.prototype;
  var p = Class.prototype = new qcPrototype();

  // This removes reference of Base.prototype from `qcPrototype`. This is not
  // so important, however, in case both `Base` and `Class` die, it will not
  // block VM from garbage collecting `Base.prototype`.
  qcPrototype.prototype = Object.prototype;

  // Initialize base class.
  if (Super !== Object)
    Class.$qcBase = Super;

  // Initialize hooks.
  obj = def.$hooks;
  if (obj) {
    // Single hook or array of hooks expected.
    if (typeof obj === "function") {
      $qcHooks = $qcHooks.slice(0);
      $qcHooks.push(obj);
    }
    else {
      if (typeof obj !== "object")
        throw new TypeError("qclass() - `$hooks` has to be an array or function.");
      $qcHooks = $qcHooks.concat(obj);
    }
  }

  // Initialize extensions.
  obj = def.$extensions;
  if (obj) {
    if (typeof obj !== "object")
      throw new TypeError("qclass() - `$extensions` has to be an object.");
    $qcExtensions = qcMerge({}, $qcExtensions, obj);
  }

  // Include mixins.
  var $mixins = def.$mixins;
  if ($mixins) {
    i = 0;
    len = 1;
    obj = $mixins;

    if (!$mixins.$qcMixin) {
      len = $mixins.length;
      obj = $mixins[i];
    }

    for (;;) {
      // Include `$mixin` members.
      qcMerge(p, obj.$qcMembers);

      // Include `$mixin` statics.
      for (k in obj) {
        if (hasOwn.call(qcIgnoreMixinProperties, k))
          continue;
        Class[k] = obj[k];
      }

      // Include `$mixin` hooks.
      if (!qcIsEmpty, obj.$qcHooks) {
        if ($qcHooks !== $initHooks)
          $qcHooks = $qcHooks.slice(0);
        qcConcat($qcHooks, obj.$qcHooks);
      }

      // Include `$mixin` extensions.
      if (!qcIsEmpty, obj.$qcExtensions) {
        if ($qcExtensions !== $initExtensions)
          $qcExtensions = qcMerge({}, $qcExtensions);
        qcMerge($qcExtensions, obj.$qcExtensions);
      }

      if (++i >= len)
        break;
      obj = $mixins[i];
    }
  }

  // Initialize members and statics - always after mixins so the definition can
  // override anything defined by them.
  if ($qcHooks !== qcNoHooks)
    Class.$qcHooks = $qcHooks;

  if ($qcExtensions !== qcNoExtensions)
    Class.$qcExtensions = $qcExtensions;

  for (k in def) {
    var e = $qcExtensions[k];
    var v = def[k];

    // The value is merged to the prototype directly if the extension doesn't
    // override the key `k`.
    if (e === undefined || !hasOwn.call($qcExtensions, k)) {
      p[k] = v;
      continue;
    }

    // Extension is only called if it's truthy, which means that it should be
    // a callable object. By default `$extend` and `$construct` are set to null
    // to prevent merging them with `$Class.prototype`, which is unwanted.
    if (typeof e !== "function")
      continue;

    e.call(Class, v, k, def);
  }

  // Call hooks (last step, after the whole class is created).
  for (i = 0, len = $qcHooks.length; i < len; i++)
    $qcHooks[i].call(Class, def);

  return Class;
}

qclass.mixin = mixin;
$export[$as] = qclass;

}).apply(this, typeof module === "object" ? [module, "exports"] : [this, "qclass"]);