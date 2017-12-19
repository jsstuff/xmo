// xmo.js <https://github.com/exjs/xmo>
(function($export, $as) {
"use strict";

const VERSION = "1.0.0";

const hasOwn = Object.prototype.hasOwnProperty;
const freeze = Object.freeze;

const isArray = Array.isArray;
const isFrozen = Object.isFrozen;

const NoArray = freeze([]);
const NoObject = freeze(Object.create(null));

function isFunction(x) { return typeof x === "function"; }
function isFunctionArray(x) { return isArray(x) && x.every(isFunction); }

function asArray(x) { return isArray(x) ? x : [x]; }

function TYPE_ERROR(msg) { throw TypeError(msg); }

function isEmpty(obj) {
  for (var k in obj)
    if (hasOwn.call(obj, k))
      return false;
  return true;
}

function dict(src) {
  const out = Object.create(null);
  if (src) {
    if (isArray(src)) {
      const arr = src;
      for (var i = 0; i < arr.length; i++)
        out[arr[i]] = true;
    }
    else {
      Object.assign(out, src);
    }
  }
  return out;
}

function clone(obj) {
  if (!obj || typeof obj !== "object")
    return obj;
  return isArray(obj) ? obj.slice(0) : dict(obj);
}

function newConstructor(Super) {
  return function(...params) {
    Super.call(this, ...params);
  };
}

function MetaInfo$getMutable(name) {
  var member = this[name];
  if (!member)
    TYPE_ERROR(`No such member '${dstName} in Class.$metaInfo`);

  if (isFrozen(member))
    member = this[name] = clone(member);
  return member;
}

function MetaInfo$freeze(metaInfo) {
  for (var k in metaInfo) {
    const obj = metaInfo[k];
    if (obj != null && typeof obj === "object")
      freeze(obj);
  }
  return freeze(metaInfo);
}

function MetaInfo$addInitHandlers(metaInfo, handlers, handlerType) {
  if (!isFunction(handlers) && !isFunctionArray(handlers))
    TYPE_ERROR(`$${handlerType} must be Function or Function[], not '${typeof handlers}'`);

  const arr = asArray(handlers);
  for (var i = 0; i < arr.length; i++) {
    const handler = arr[i];
    if (metaInfo[handlerType].indexOf(handler) !== -1)
      continue;
    metaInfo.getMutable(handlerType).push(handler);
  }
}

function MetaInfo$addExtensions(metaInfo, extensions) {
  if (typeof extensions !== "object")
    TYPE_ERROR(`$extensions must be Object, not '${typeof extensions}'`);

  const ignoredMap = metaInfo.getMutable("ignored");
  const extensionsMap = metaInfo.getMutable("extensions");

  for (var k in extensions) {
    const ext = extensions[k];
    ignoredMap[k] = true;

    if (typeof ext === "function")
      extensionsMap[k] = ext;
  }
}

function Class$mergeMembers(Class, proto, src) {
  const metaInfo = Class.$metaInfo;

  const ignored = metaInfo.ignored;
  const extensions = metaInfo.extensions;

  for (var k in src) {
    const v = src[k];
    const ext = extensions[k];

    if (ext)
      ext.call(Class, k, v);
    else if (!ignored[k])
      proto[k] = src[k];
  }
}

function Class$mergeMixinStatics(Class, Mixin) {
  const mixinMetaInfo = Mixin.$metaInfo;
  const mixinStatics = mixinMetaInfo.statics;

  if (isEmpty(mixinStatics))
    return;

  const classMetaInfo = Class.$metaInfo;
  const classStatics = classMetaInfo.getMutable("statics");

  for (var k in mixinStatics) {
    Class[k] = Mixin[k];
    classStatics[k] = true;
  }
}

function Class$mergeStatics(Class, src) {
  if (!src || isEmpty(src))
    return;

  const metaInfo = Class.$metaInfo;
  const staticsMap = metaInfo.getMutable("statics");

  for (var k in src) {
    Class[k] = src[k];
    staticsMap[k] = true;
  }
}

const IgnoredDefinitions = freeze(dict({
  $extend     : true,                // Built-in keyword '$extend'.
  $mixins     : true,                // Built-in keyword '$mixins'.
  $preInit    : true,                // Built-in keyword '$preInit'.
  $postInit   : true,                // Built-in keyword '$postInit'.
  $extensions : true,                // Built-in keyword '$extensions'.
  $statics    : true,                // Built-in keyword '$statics'.
  $metaInfo   : true,                // Ingore 'Mixin.$metaInfo' when including mixins.

  constructor : true,                // Built-in keyword 'constructor'.
  prototype   : true                 // Ignore 'Mixin.prototype' when including mixins.
}));

const ClassMetaInfo = freeze(dict({
  isMixin      : false,              // Boolean indicating whether this is a mixin.
  ignored      : IgnoredDefinitions, // Which properties must be ignored (cannot be merged).
  preInit      : NoArray,            // Pre-initialization handlers (array of functions).
  postInit     : NoArray,            // Post-initialization handlers (array of functions).
  statics      : NoObject,           // Which properties of `Class` were defined as statics.
  extensions   : NoObject,           // Map of extensions (string -> handler).
  getMutable   : MetaInfo$getMutable // Get a mutable member (cloned if frozen).
}));

const MixinMetaInfo = freeze(dict({
  isMixin      : true,               // Boolean indicating whether this is a mixin.
  ignored      : IgnoredDefinitions, // Which properties must be ignored (cannot be merged).
  preInit      : NoArray,            // Pre-initialization handlers (array of functions).
  postInit     : NoArray,            // Post-initialization handlers (array of functions).
  statics      : NoObject,           // Which properties of `Class` were defined as statics.
  extensions   : NoObject,           // Map of extensions (string -> handler).
  getMutable   : MetaInfo$getMutable // Get a mutable member (cloned if frozen).
}));

function xmo_(def, isMixin) {
  var k, i;

  // Setup class and its superclass.
  var Super = hasOwn.call(def, "$extend") ? def.$extend : Object;
  var Class = hasOwn.call(def, "constructor") ? def.constructor : newConstructor(Super);

  if (!isMixin) {
    // HACK: If the class `constructor` was defind as member function we
    // have to wrap it as it's non-constructible by default. I don't know
    // about any other way how to make it constructible.
    if (!Class.prototype)
      Class = newConstructor(Class);

    if (Super !== Object)
      Class.prototype = Object.create(Super.prototype);
  }
  else {
    Class.prototype = Object.create(null);
  }

  const proto = Class.prototype;
  const metaInfo = dict(Super !== Object ? Super.$metaInfo : (isMixin ? MixinMetaInfo : ClassMetaInfo));

  if (metaInfo.isMixin !== isMixin)
    TYPE_ERROR(`Class/Mixin mismatch: Class.$metaInfo.isMixin(${metaInfo.isMixin}) != ${isMixin}`);

  metaInfo.super = (Super !== Object) ? Super : null;
  Class.$metaInfo = metaInfo;

  const mixins = def.$mixins ? asArray(def.$mixins) : null;
  const mixinsLen = mixins ? mixins.length : 0;

  // Setup pre-init handlers, post-init handlers, and extensions.
  for (i = 0; i < mixinsLen; i++) {
    const mixin = mixins[i];
    const meta = mixin.$metaInfo;

    if (meta.preInit) MetaInfo$addInitHandlers(metaInfo, meta.preInit, "preInit");
    if (meta.postInit) MetaInfo$addInitHandlers(metaInfo, meta.postInit, "postInit");
    if (meta.extensions) MetaInfo$addExtensions(metaInfo, meta.extensions);
  }

  if (def.$preInit) MetaInfo$addInitHandlers(metaInfo, def.$preInit, "preInit");
  if (def.$postInit) MetaInfo$addInitHandlers(metaInfo, def.$postInit, "postInit");
  if (def.$extensions) MetaInfo$addExtensions(metaInfo, def.$extensions);

  // Call preInit handlers (contains also new preInit handlers defined by mixins and class itself).
  const preInit = metaInfo.preInit;
  for (i = 0; i < preInit.length; i++) {
    preInit[i].call(Class, def, mixins);
  }

  // Merge members and statics included by `$mixins` and `def` object.
  for (i = 0; i < mixinsLen; i++) {
    const mixin = mixins[i];

    Class$mergeMembers(Class, proto, mixin.prototype);
    Class$mergeMixinStatics(Class, mixin);
  }

  Class$mergeMembers(Class, proto, def);
  Class$mergeStatics(Class, def.$statics);

  // Call postInit handlers (contains also new postInit handlers defined by mixins and class itself).
  const postInit = metaInfo.postInit;
  for (i = 0; i < postInit.length; i++) {
    postInit[i].call(Class, def, mixins);
  }

  // Freeze MetaInfo so it cannot be altered later by accident.
  MetaInfo$freeze(metaInfo);

  // Everything should be done at this moment.
  return Class;
}

// `xmo(def)`
//
// Create a new `Class` based on the given definition `def`.
function xmo(def) { return xmo_(def, false); }

// `xmo.VERSION`
//
// Version information in a "major.minor.patch" form.
xmo.VERSION = VERSION;

// `xmo.mixin(def)`
//
// Create a new `Mixin` based on the given definition `def`.
function mixin(def) { return xmo_(def, true); }
xmo.mixin = mixin;

$export[$as] = xmo;

}).apply(this, typeof module === "object" ? [module, "exports"] : [this, "xmo"]);
