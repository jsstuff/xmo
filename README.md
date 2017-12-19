xmo.js
======

Extensible Meta Objects (xmo.js) is a lightweight class library for creating JS classes and mixins.

  * [Official Repository (exjs/xmo)](https://github.com/exjs/xmo)
  * [Official Chat (gitter)](https://gitter.im/exjs/exjs)
  * [Public Domain (https://unlicense.org)](https://unlicense.org)

Introduction
------------

`xmo.js` is a lightweight javascript library for creating JS classes and mixins. Unlike many other libraries that try to solve the same problem `xmo.js` was designed to be extensible and only provides the mechanism to create a new class or mixin with a possibility to register user-defined extensions and init handlers.

There are many UI toolkits and JS frameworks that provide some kind of class subsystem that adds properties, events, and other features to the traditional javascript class. This approach makes the class-subsystem dependent on the framework and makes it unusable outside of it.

The approach used by `xmo.js` is different. It allows to register init handlers and extensions to the class itself so any class that inherits it would provide the same features as the base class. This means that many existing class frameworks could be theoretically implemented on top of `xmo.js` itself.

So how to create a JavaScript Class? Just import `xmo` library (or include it if you work on client-side) and use `xmo` as a function to create your own class. The function accepts only one argument `def`, which is used to define members, static properties, init handlers, and extensions; it will return a new `Class` object that can be instantiated by a `new` keyword. A simple example is shown below:

```js
// Create a new class `Class` that doesn't inherit from any object. It
// inherits internally from a pure JavaScript `Object`, which most JS objects
// do. A `constructor` property defines the constructor and other properties
// define class members (that will be added to the prototype object).
const Class = xmo({
  constructor() {
    this.text = "Hi!"
  },

  toString() {
    return this.text;
  }
});
```

The `constructor` property defines class constructor and other properties define class members. The `Class` can be instantiated simply by using `new` operator as demonstrated in the following example:

```js
// Create an instance of `Class` defined in previous example.
const instance = new Class();

// `instance` is now an instance of `Class`, we can check if the inheritance
// is working as expected by calling `toString` method, which should return
// "Hi!". Another expected behavior is using `instanceof` keyword which should
// return `true` if tested against `Class`.
console.log(instance.toString());        // Outputs `Hi!`.
console.log(instance instanceof Class);  // Outputs `true`.
console.log(instance instanceof Object); // Outputs `true`.
```

Inheritance
-----------

Base class can be specified by `$extend` property:

```js
// `Point` is a base class.
const Point = xmo({
  constructor(x, y) {
    this.x = x;
    this.y = y;
  },

  translate(x, y) {
    this.x += x;
    this.y += y;
  },

  toString() {
    return `Point { x: ${this.x}, y: ${this.y}}`;
  }
});

// `Circle` extends `Point`.
const Circle = xmo({
  $extend: Point,

  constructor(x, y, radius) {
    // Has to call superclass constructor.
    Point.call(this, x, y);
    this.radius = radius;
  },

  // Overrides `toString` of `Point`.
  toString() {
    return `Circle { x: ${this.x}, y: ${this.y}, radius: ${this.radius} }`
  }
});

// Create instances of `Point` and `Circle` classes.
const point = new Point(1, 1);
const circle = new Circle(10, 10, 5);

console.log(point.toString());         // Outputs `Point { x: 1, y: 1 }`.
console.log(circle.toString());        // Outputs `Circle { x: 10, y: 10, radius: 5 }`.

// `point` is an instance of `Point`, but not `Circle`.
console.log(point instanceof Point);   // Outputs `true`.
console.log(point instanceof Circle);  // Outputs `false`.

// `circle` is an instance of both `Point` and `Circle`.
console.log(circle instanceof Point);  // Outputs `true`.
console.log(circle instanceof Circle); // Outputs `true`.
```

Static Properties
-----------------

Static (Class) members can be defined by `$statics` property.

```js
const Class = xmo({
  constructor() {
    this.status = Class.Ready;
  },

  $statics: {
    Ready: 0,
    Running: 1
  }
});

console.log(Class.Ready);     // Outputs `0`.
console.log(Class.Running);   // Outputs `1`.

const instance = new Class();

console.log(instance.status); // Outputs `0`.
console.log(instance.Ready);  // Outputs `undefined` (not a member of `instance`).
```

Extensions
----------

Many JS frameworks, especially those designed for UI tookits, provide a fixed set of extensions to the object model they use. For example Qooxdoo supports mixins, interfaces, and allows to define properties and events. The purpose of `xmo.js` is not to provide all imaginable features, but to provide a foundation to add extensions to a particular class that will be then included by all classes that inherit it. This allows to extend the class-system at runtime and to support virtually anything user needs.

There are at the moment 2 concepts supported by `xmo.js`:

  1. Init handlers defined by `$preInit` and `$postInit` properties.
  2. Extensions defined by `$extensions` property.

A new class is always created by the following steps:

  1. Inherit init handlers and extensions.
  2. Call `$preInit` handlers.
  3. Add new members to the class (handles all defined `$extensions` as well)
  4. Call `$postInit` handlers.

The following example uses `$extensions` property to define a `$property` extension:

```js
const Point = xmo({
  constructor(x, y) {
    this.x = x;
    this.y = y;
  },

  $extensions: {
    // Define extension `$properties`.
    //
    // This function will be called every time when `$properties` is used in
    // class definition that directly or indirectly inherits `Point`. It is
    // also called if `Point` itself uses `$properties` extension.
    //
    // `this` - Class object     (`Point` in our case).
    // `k`    - Property key     ("$properties" string).
    // `v`    - Property value   (`$properties` content).
    $properties(k, v) {
      // Iterate over all keys in `$properties`.
      Object.keys(v).forEach(function(name) {
        const upper = name.charAt(0).toUpperCase() + name.substr(1);

        // Create getter and setter for a given `name`.
        this.prototype[`get${upper}`] = function() { return this[name]; };
        this.prototype[`set${upper}`] = function(value) { this[name] = value; };
      }, this /* binds `this` to the callback. */);
    }
  },

  // In our case this will use the defined `$properties` extension.
  $properties: {
    x: true,
    y: true
  }
});

// Create an instance of `Point` and call the generated functions.
const point = new Point(1, 2);

console.log(point.getX()); // Outputs `1`.
console.log(point.getY()); // Outputs `2`.

point.setX(10);
point.setY(20);

console.log(point.getX()); // Outputs `10`.
console.log(point.getY()); // Outputs `20`.
```

PreInit & PostInit Handlers
---------------------------

Extensions define a function that is called if a given `key` is present in class definition. Since this concept is fine and generally useful, sometimes it's handy to be able to call a handler before and/or after the class setup regardless of which properties are present in class definitions `def` object. Both `$preInit` and `$postInit` handlers are supported and can be used to add a single or multiple handlers at once.

The following example does the same thing as `$properties` extension, but uses using `$postInit` handler instead:

```js
const Point = xmo({
  constructor(x, y) {
    this.x = x;
    this.y = y;
  },

  // Add a preInit handler.
  $preInit(def) {
    // Does nothing here, just to document the syntax.
  },

  // Add a postInit handler, called once on Point and all classes that inherit it.
  //
  // `this` - Class object (`Point` in our case).
  // `def`  - The whole `def` object passed to `xmo(...)`.
  $postInit(def) {
    if (!def.$properties)
      return;

    // Iterate over all keys in `$properties`.
    Object.keys(def.$properties).forEach(function(name) {
      const upper = name.charAt(0).toUpperCase() + name.substr(1);

      // Create getter and setter for a given `key`.
      this.prototype[`get${upper}`] = function() { return this[name]; };
      this.prototype[`set${upper}`] = function(value) { this[name] = value; };
    }, this /* binds `this` to the callback. */);
  },

  // This is not necessary. Null extensions are only used to make
  // a certain property ignored (won't be copied to the prototype).
  $extensions: {
    $properties: null
  },

  // Will be used by the hook defined above.
  $properties: {
    x: true,
    y: true
  }
});

// Create an instance of `Point` and use functions created by the
// `property` extension.
const point = new Point(1, 2);

console.log(point.getX()); // Outputs `1`.
console.log(point.getY()); // Outputs `2`.

point.setX(10);
point.setY(20);

console.log(point.getX()); // Outputs `10`.
console.log(point.getY()); // Outputs `20`.
```

Init handlers are very similar to extensions, however, they don't need any properties to be defined and are always called once per class. Init handlers are in general more powerful, because they can use any property or multiple properties to do add stuff to the class itself.

Mixins
------

A mixin is set of functions that can be included in another class or mixin. Mixins are defined by using `xmo.mixin(def)`, where `def` is similar definition compatible to `xmo.js` itself, but without `constructor` support (mixins can't be instantiated). Mixins also understand `$extensions` and `$preinit/$postInit` handlers, so it's possible to define these in mixin that is then included in other classes.

```js
// Create a mixin that provides `translate(x, y)` function.
const MTranslate = xmo.mixin({
  translate(x, y) {
    this.x += x;
    this.y += y;
    return this;
  }
});

// Create a Point class that includes MTranslate mixin.
const Point = xmo({
  $mixins: [MTranslate],

  constructor(x, y) {
    this.x = x;
    this.y = y;
  },

  toString() {
    return `[${this.x}, ${this.y}]`;
  }
});

// Create a Rect class that includes MTranslate mixin.
const Rect = xmo({
  $mixins: [MTranslate],

  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  },

  toString() {
    return `[${this.x}, ${this.y}, ${this.w}, ${this.h}]`;
  }
});

// The translate() functions are provided to both classes.
const p = new Point(0, 0);
const r = new Rect(0, 0, 33, 67);

p.translate(1, 2);
r.translate(1, 2);

console.log(p.toString()); // Outputs `[1, 2]`.
console.log(r.toString()); // Outputs `[1, 2, 33, 67]`.
```

Combining more mixins to a single mixin:

```js
// Create two mixins MTranslate and MScale.
const MTranslate = xmo.mixin({
  translate(x, y) {
    this.x += x;
    this.y += y;
    return this;
  }
});

const MScale = xmo.mixin({
  scale(x, y) {
    if (y == null)
      y = x;

    this.x *= x;
    this.y *= y;
    return this;
  }
});

// If a combined mixin is needed, it can be created simply by
// including MTranslate and MScale into another mixin.
const MCombined = xmo.mixin({
  $mixins: [MTranslate, MScale]
});
```

Meta Information
----------------

Each class created by `xmo.js` contains a non-enumerable property called MetaInfo. It contains essential information about the class itself (and inheritance) and can be used to store additional information required by extensions.

Let's demonstrate the basics of MetaInfo:

```js
const Class = xmo({
  $preInit() {
    console.log("PreInit()");
  },

  $postInit() {
    console.log("PostInit()");
  },

  $extensions: {
    $ignoredField: null,

    $customField(k, v) {
      console.log(`CustomField(): '${k}' with data ${JSON.stringify(v)}`);
    }
  },

  $customField: {
    test: []
  },

  $statics: {
    SomeConst: 0
  }
});

// Firstly, try to instantiate the class:
//   PreInit()
//   CustomField(): '$customField' with data { test: [] }
//   PostInit()
const instance = new Class();

// Access MetaInfo of the class.
//   (Alternatively `instance.constructor.$metaInfo`)
const MetaInfo = Class.$metaInfo;

// Boolean value indicating a mixin:
//   false
console.log(MetaInfo.isMixin);

// Super class:
//   null (would link to super class if the class was inherited)
console.log(MetaInfo.super);

// Map of ignored properties:
//   { $ignoredField: true, $customField: true }
console.log(MetaInfo.ignored);

// Map of all static properties:
//   { SomeConst: true }
console.log(MetaInfo.statics);

// PreInit handlers:
//   [function(...)]
console.log(MetaInfo.preInit);

// PostInit handlers:
//   [function(...)]
console.log(MetaInfo.postInit);

// Extensions:
//   { $customField: function(...) }
console.log(MetaInfo.extensions);

//
```

It's important to mention that all members of MetaClass are frozen (immutable) and cannot be modified after the class was created (after all postInit handlers were called). MetaInfo can only be changed during class creation by init handlers and class extensions. Use `getMutable()` member function to make a property of MetaInfo temporarily mutable.

The following example shows how to add a custom reflection information to the MetaInfo:

```js
// Creates some base class that defines a property system.
const Base = xmo({
  $preInit() {
    const meta = this.$metaInfo;

    // Add `properties` property to MetaInfo object.
    if (!meta.properties)
      meta.properties = Object.create(null);
  },

  $extensions: {
    $properties(k, v) {
      const defProperties = v;
      const metaProperties = this.$metaInfo.getMutable("properties");

      // Simplest way, production code should deal with redefinitions, etc...
      Object.assign(metaProperties, defProperties);
    }
  }
});

// Create two classes that add uses the extension we just created.
const Point2D = xmo({
  $extend: Base,
  $properties: {
    x: { type: "number" },
    y: { type: "number" }
  }
});

const Point3D = xmo({
  $extend: Point2D,
  $properties: {
    z: { type: "number" }
  }
});

// Access the MetaInfo of Point2D:
//   { x: { type: "number" }
//     y: { type: "number" } }
console.log(JSON.stringify(Point2D.$metaInfo.properties));

// Access the MetaInfo of Point3D:
//   { x: { type: "number" },
//     y: { type: "number" },
//     z: { type: "number" } }
console.log(JSON.stringify(Point3D.$metaInfo.properties));
```

NOTE: Alternatively a Mixin can be used instead of Base class.
