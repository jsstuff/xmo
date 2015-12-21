// exclass.js <https://github.com/exjs/exclass>
(function($export, $as) {
"use strict";

// \internal
// \{
var hasOwn = Object.prototype.hasOwnProperty;
// \}

// A helper that is used to create a new `qPrototype` without actually creating
// an instance of class that is being extended.
function exPrototype() {}

// Returns a default constructor, used if no constructor has been provided to
// the `Class`.
function exConstruct(Super) {
  return function() {
    Super.apply(this, arguments);
  };
}

// Returns `true` if a given object has no own properties.
function exIsEmpty(obj) {
  for (var k in obj)
    if (hasOwn.call(obj, k))
      return false;
  return true;
}

// Copy properties from `src` to `dst` in a safe way, using Object's native
// `hasOwnProperty()` method to check for a property presence.
function exMerge(dst /*, ... */) {
  for (var i = 1, len = arguments.length; i < len; i++) {
    var src = arguments[i];
    for (var k in src) {
      if (hasOwn.call(src, k))
        dst[k] = src[k];
    }
  }

  return dst;
}

function exConcat(dst) {
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
var exNoExtensions = {
  // These properties are used internally by `exclass` definition and shouldn't
  // be overridden.
  $construct   : null, // Constructor.
  $extend      : null, // Base class.
  $mixins      : null, // Mixins.
  $hooks       : null, // Hooks (called each time a new class is defined).
  $extensions  : null, // Extensions.

  // Statics are merged directly to the class object.
  $statics: function(obj) {
    exMerge(this, obj);
  }
};

// Default (built-in) hooks (none).
var exNoHooks = [];

// Properties that will be skipped when including mixins.
var exIgnoreMixinProperties = {
  $exExtensions: true,
  $exHooks     : true,
  $exMembers   : true,
  $exMixin     : true
};

// `exclass.mixin(def)`
//
// Create a new `Mixin` based on `def`.
function mixin(def) {
  // Create a new `Mixin` object.
  var Mixin = function() {
    throw new TypeError("Mixins can't be instantiated.");
  };

  if (def.$construct)
    throw new TypeError("exclass.mixin() - `$construct` is forbidden.");

  if (def.$extend)
    throw new TypeError("exclass.mixin() - `$extend` is forbidden.");

  var i, len, obj;
  var $exMembers = {};
  var $exHooks = [];
  var $exExtensions = {};

  Mixin.$exMixin = true;
  Mixin.$exMembers = $exMembers;
  Mixin.$exHooks = $exHooks;
  Mixin.$exExtensions = $exExtensions;

  // Include mixins.
  var mixins = def.$mixins;
  if (mixins) {
    i   = 0;
    len = 1;
    obj = mixins;

    // Mixins should be an array, but it's allowed to omit it in case of using
    // a single mixin. The `$exMixin` check should be sufficient.
    if (mixins.$exMixin !== true) {
      len = obj.length;
      obj = mixins[0];
    }

    for (;;) {
      if (obj.$exMixin !== true)
        throw new TypeError("exclass.mixin() - `$mixins` can only specify mixin(s).");

      // Copy `$mixin` members.
      exMerge($exMembers, obj.$exMembers);

      // Copy `$mixin` hooks.
      exConcat($exHooks, obj.$exHooks);

      // Copy `$mixin` extensions.
      exMerge($exExtensions, obj.$exExtensions);

      // Copy `$mixin` statics.
      for (k in obj) {
        if (hasOwn.call(exIgnoreMixinProperties, k))
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
    if (hasOwn.call(exNoExtensions, k))
      continue;
    $exMembers[k] = def[k];
  }

  // Initialize hooks.
  obj = def.$hooks;
  if (obj)
    exConcat($exHooks, obj.$exMixin ? [obj] : obj);

  // Initialize extensions.
  obj = def.$extensions;
  if (obj)
    exMerge($exExtensions, obj);

  // Initialize statics.
  obj = def.$statics;
  if (obj)
    exMerge(Mixin, obj);

  return Mixin;
}

// `exclass(def)`
//
// Create a new `Class` based on `def`.
function exclass(def) {
  // Create a new `Class` object.
  var Super = def.$extend || Object;
  var Class = def.$construct || exConstruct(Super);

  var $initHooks = Super.$exHooks || exNoHooks;
  var $initExtensions = Super.$exExtensions || exNoExtensions;

  var $exHooks = $initHooks;
  var $exExtensions = $initExtensions;

  var obj;
  var k = "";
  var i, len;

  // Initialize class and prototype.
  exPrototype.prototype = Super.prototype;
  var p = Class.prototype = new exPrototype();

  // This removes reference of Base.prototype from `exPrototype`. This is not
  // so important, however, in case both `Base` and `Class` die, it will not
  // block VM from garbage collecting `Base.prototype`.
  exPrototype.prototype = Object.prototype;

  // Initialize base class.
  if (Super !== Object)
    Class.$exBase = Super;

  // Initialize hooks.
  obj = def.$hooks;
  if (obj) {
    // Single hook or array of hooks expected.
    if (typeof obj === "function") {
      $exHooks = $exHooks.slice(0);
      $exHooks.push(obj);
    }
    else {
      if (typeof obj !== "object")
        throw new TypeError("exclass() - `$hooks` has to be an array or function.");
      $exHooks = $exHooks.concat(obj);
    }
  }

  // Initialize extensions.
  obj = def.$extensions;
  if (obj) {
    if (typeof obj !== "object")
      throw new TypeError("exclass() - `$extensions` has to be an object.");
    $exExtensions = exMerge({}, $exExtensions, obj);
  }

  // Include mixins.
  var $mixins = def.$mixins;
  if ($mixins) {
    i = 0;
    len = 1;
    obj = $mixins;

    if (!$mixins.$exMixin) {
      len = $mixins.length;
      obj = $mixins[i];
    }

    for (;;) {
      // Include `$mixin` members.
      exMerge(p, obj.$exMembers);

      // Include `$mixin` statics.
      for (k in obj) {
        if (hasOwn.call(exIgnoreMixinProperties, k))
          continue;
        Class[k] = obj[k];
      }

      // Include `$mixin` hooks.
      if (!exIsEmpty, obj.$exHooks) {
        if ($exHooks !== $initHooks)
          $exHooks = $exHooks.slice(0);
        exConcat($exHooks, obj.$exHooks);
      }

      // Include `$mixin` extensions.
      if (!exIsEmpty, obj.$exExtensions) {
        if ($exExtensions !== $initExtensions)
          $exExtensions = exMerge({}, $exExtensions);
        exMerge($exExtensions, obj.$exExtensions);
      }

      if (++i >= len)
        break;
      obj = $mixins[i];
    }
  }

  // Initialize members and statics - always after mixins so the definition can
  // override anything defined by them.
  if ($exHooks !== exNoHooks)
    Class.$exHooks = $exHooks;

  if ($exExtensions !== exNoExtensions)
    Class.$exExtensions = $exExtensions;

  for (k in def) {
    var e = $exExtensions[k];
    var v = def[k];

    // The value is merged to the prototype directly if the extension doesn't
    // override the key `k`.
    if (e === undefined || !hasOwn.call($exExtensions, k)) {
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
  for (i = 0, len = $exHooks.length; i < len; i++)
    $exHooks[i].call(Class, def);

  return Class;
}

// `exclass.VERSION`
//
// Version information in a "major.minor.patch" form.
exclass.VERSION = "1.1.0";

exclass.mixin = mixin;
$export[$as] = exclass;

}).apply(this, typeof module === "object" ? [module, "exports"] : [this, "exclass"]);