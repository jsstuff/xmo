QClass
======

Quick and simple JavaScript class library.

Official Repository
-------------------

https://github.com/kobalicekp/qclass

Introduction
------------

QClass is a library designed to solve common problems that happen in JS inheritance model. The library does exactly one thing - it can create and inherit a JavaScript `Class` and does some dirty job internally to make it possible. The library has been inspired in `Qooxdoo`s object oriented model, but simplified to a less than 100 lines of commented code.

So how to create a JS Class? Just use `qclass` as a function and pass a single JavaScript object providing the class definition. It will return a new `Class` object that can be instantiated. A simple example is shown below:

```JS
// Create a new `Class` object that doesn't inherit from any object. It
// inherits internally from a pure JavaScript `Object`, but in the end all
// objects do. A `construct` property defines `Class` constructor and other
// properties define `Class` members (that will be put to `Class.prototype`).
var Class = qclass({
  construct: function() {
    this.text = "Hi!"
  },

  toString: function() {
    return this.text;
  }
});
```

The `construct` property defines class constructor and other properties define class members. The `Class` can be instantiated simply by using `new` operator as demonstrated on the following example:

```
// Create an instance of `Class` defined in previous example.
var instance = new Class();

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

Inheritance is defined by using `extend` property:

```
// `Point` is a base class.
var Point = qclass({
  construct: function(x, y) {
    this.x = x;
    this.y = y;
  },

  translate: function(x, y) {
    this.x += x;
    this.y += y;
  },
  
  toString: function() {
    return "Point(" +
      "{ x: " + this.x +
      ", y: " + this.y + " })";
  }
});

// `Circle` extends `Point`.
var Circle = qclass({
  extend: Point,

  construct: function(x, y, radius) {
    // Has to call superclass constructor.
    Point.call(this, x, y);
    this.radius = radius;
  },

  // Overrides `toString` of `Point`.
  toString: function() {
    return "Circle(" +
      "{ x: " + this.x +
      ", y: " + this.y +
      ", radius: " + this.radius + " })";
  }
});

// Create instances of `Point` and `Circle` classes.
var point = new Point(1, 1);
var circle = new Circle(10, 10, 5);

console.log(point.toString());        // Outputs `Point({ x: 1, y: 1 })`.
console.log(circle.toString());       // Outputs `Circle({ x: 10, y: 10, radius: 5 })`.

// `point` is an instance of `Point`, but not `Circle`.
console.log(point instanceof Point);  // Outputs `true`.
console.log(point instanceof Circle); // Outputs `false`.

// `circle` is an instance of both `Point` and `Circle`.
console.log(circle instanceof Point);  // Outputs `true`.
console.log(circle instanceof Circle); // Outputs `true`.
```

Statics
-------

QClass allows to define static members by using `statics` property. 

```
var Class = qclass({
  construct: function() {
    this.status = Class.Ready;
  },

  statics: {
    Ready: 0,
    Running: 1
  }
});

console.log(Class.Ready);     // Outputs `0`.
console.log(Class.Running);   // Outputs `1`.

var instance = new Class();

console.log(instance.status); // Outputs `0`.
console.log(instance.Ready);  // Outputs `undefined`.
```

Extensions
----------

Many JS frameworks, especially client-side, provide a fixed set of extensions to the object model they use. For example Qooxdoo supports mixins, interfaces and allows to define properties and events. QClass doesn't have any of these to keep the design simple, but to make the library more usable a concept called `Extensions` has been implemented. 

Extension is a function of name that is called if a property matching the name has been used in class definition. Extensions are inherited with classes, thus a new class can provide also new extensions that will be applied to all descendants.

Extensions can be used to provide additional features in your object oriented model. The example below illustrates how to use extensions to automatically generate getProperty() and setProperty() functions:

```
var Point = qclass({
  construct: function(x, y) {
    this.x = x;
    this.y = y;
  },

  // Defines extensions.
  extensions: {
    // Defines extension `properties`.
    //
    // This function will be called every time when `properties` is used in
    // class definition that directly or indirectly inherits `Point`. It is
    // also called if `Point` itself uses `properties` extension.
    //
    // `this` - Class object     (`Point` in our case).
    // `v`    - Property Value   ("x" or "y" in our case).
    // `k`    - Property Key     (`properties` in our case).
    // `def`  - The whole `def` object passed to `qclass(def)`.
    properties: function(v, k, def) {
      // Iterate over all keys in `properties`
      Object.keys(v).forEach(function(key) {
        var upperKey = key.charAt(0).toUpperCase() + key.substr(1);

        // Create getter and setter for a given `key`.
        this.prototype["get" + upperKey] = function() {
          return this[key];
        };

        this.prototype["set" + upperKey] = function(value) {
          this[key] = value;
        };
      }, this /* binds `this` to the callback. */);
    }
  },

  // In our case this will use the defined `properties` extension.
  properties: {
    "x": true,
    "y": true
  }
});

// Create an instance of `Point` and try.
var point = new Point(1, 2);

console.log(point.getX()); // Outputs `1`.
console.log(point.getY()); // Outputs `2`.

point.setX(10);
point.setY(20);

console.log(point.getX()); // Outputs `10`.
console.log(point.getY()); // Outputs `20`.
```

License
-------

QClass follows `Unlicense`.
