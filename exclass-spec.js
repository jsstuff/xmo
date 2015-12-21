// exclass.js <https://github.com/exjs/exclass>
"use strict";

var assert = require("assert");
var exclass = require("./exclass");

// Properties extension, used by multiple tests.
var $def = null;
var $properties = function(v, k, def) {
  // Check if all the arguments provided are correct.
  assert(k   === "$properties");
  assert(def === $def);

  Object.keys(v).forEach(function(key) {
    var upperKey = key.charAt(0).toUpperCase() + key.substr(1);

    // Create getter and setter for a given `key`.
    this.prototype["get" + upperKey] = function() {
      return this[key];
    };

    this.prototype["set" + upperKey] = function(value) {
      this[key] = value;
    };
  }, this);
};

describe("exclass", function() {
  it("should create new Class without `$construct` specified.", function() {
    var Class = exclass($def = {});

    var obj = new Class();
    assert(obj instanceof Object);
    assert(obj instanceof Class);
  });

  it("should create new Class with `$construct` specified.", function() {
    var Class = exclass($def = {
      $construct: function(property) {
        this.property = property;
      }
    });

    var obj = new Class(1);

    assert(obj instanceof Object);
    assert(obj instanceof Class);
    assert(obj.property === 1);
  });

  it("should create new Class with members.", function() {
    var Class = exclass($def = {
      $construct: function(a, b) {
        this.a = a;
        this.b = b;
      },

      sum: function() {
        return this.a + this.b;
      }
    });

    var obj = new Class(1, 2);

    assert(obj.a === 1);
    assert(obj.b === 2);
    assert(obj.sum() === 3);
  });

  it("should create new Class with `$statics`.", function() {
    var Class = exclass($def = {
      $statics: {
        Answer: 42
      }
    });
    assert(Class.Answer === 42);

    // `Answer` is statics, shouldn't be part of prototype.
    var obj = new Class();
    assert(Class.prototype.Answer === undefined);
    assert(obj.Answer === undefined);
  });

  it("should inherit without `$construct` specified.", function() {
    var ClassA = exclass($def = {
      getType: function() {
        return "ClassA";
      }
    });

    var ClassB = exclass($def = {
      $extend: ClassA,

      getType: function() {
        return "ClassB";
      }
    });

    var a = new ClassA();
    var b = new ClassB();

    assert( (a instanceof ClassA));
    assert(!(a instanceof ClassB));

    assert( (b instanceof ClassA));
    assert( (b instanceof ClassB));

    assert(a.getType() === "ClassA");
    assert(b.getType() === "ClassB");
  });

  it("should inherit with `$construct` specified.", function() {
    var ClassA = exclass($def = {
      $construct: function(x) {
        this.x = x;
      },

      getType: function() {
        return "ClassA";
      }
    });

    var ClassB = exclass($def = {
      $extend: ClassA,

      $construct: function(x, y) {
        ClassA.call(this, x);
        this.y = y;
      },

      getType: function() {
        return "ClassB";
      }
    });

    var a = new ClassA(1);
    var b = new ClassB(1, 2);

    assert( (a instanceof ClassA));
    assert(!(a instanceof ClassB));

    assert( (b instanceof ClassA));
    assert( (b instanceof ClassB));

    assert(a.x === 1);

    assert(b.x === 1);
    assert(b.y === 2);

    assert(a.getType() === "ClassA");
    assert(b.getType() === "ClassB");
  });

  it("should provide `$extensions`.", function() {
    var Point = exclass($def = {
      $construct: function(x, y) {
        this.x = x;
        this.y = y;
      },

      $extensions: {
        $properties: $properties
      },

      $properties: {
        x: true,
        y: true
      }
    });

    var Circle = exclass($def = {
      $extend: Point,

      $construct: function(x, y, radius) {
        Point.call(this, x, y);
        this.radius = radius;
      },

      // Extensions inherit with class.
      $properties: {
        radius: true
      }
    });

    var point = new Point(1, 2);
    var circle = new Circle(1, 2, 3);

    assert(point.x === 1);
    assert(point.y === 2);

    point.setX(10);
    point.setY(20);

    assert(point.getX() === 10);
    assert(point.getY() === 20);

    assert(circle.x === 1);
    assert(circle.y === 2);
    assert(circle.radius === 3);

    circle.setX(10);
    circle.setY(20);
    circle.setRadius(30);

    assert(circle.getX() === 10);
    assert(circle.getY() === 20);
    assert(circle.getRadius() === 30);
  });

  it("should provide `$hooks`.", function() {
    var Point = exclass($def = {
      $construct: function(x, y) {
        this.x = x;
        this.y = y;
      },

      $hooks: function(def) {
        assert(def === $def);
        this.PointHook = true;
      }
    });

    var Circle = exclass($def = {
      $extend: Point,

      $construct: function(x, y, radius) {
        Point.call(this, x, y);
        this.radius = radius;
      },

      $hooks: function(def) {
        assert(def === $def);
        this.CircleHook = true;
      }
    });

    assert(Point.PointHook === true);
    assert(!Point.hasOwnProperty("CircleHook"));

    assert(Circle.PointHook === true);
    assert(Circle.CircleHook === true);
  });
});

describe("exclass.Mixin", function() {
  it("should create and use single mixin.", function() {
    var MTranslate = exclass.mixin({
      translate: function(x, y) {
        this.x += x;
        this.y += y;
        return this;
      }
    });

    var Point = exclass($def = {
      $mixins: MTranslate,

      $construct: function(x, y) {
        this.x = x;
        this.y = y;
      }
    });

    var point = new Point(1, 2);
    assert(typeof point.translate === "function");

    point.translate(1, 1);
    assert(point.x === 2);
    assert(point.y === 3);
  });

  it("should create and use multiple mixins.", function() {
    var MTranslate = exclass.mixin({
      translate: function(x, y) {
        this.x += x;
        this.y += y;
        return this;
      }
    });

    var MScale = exclass.mixin({
      scale: function(s) {
        this.x *= s;
        this.y *= s;
        return this;
      }
    });

    var Point = exclass($def = {
      $mixins: [MTranslate, MScale],

      $construct: function(x, y) {
        this.x = x;
        this.y = y;
      }
    });

    var point = new Point(1, 2);

    assert(typeof point.translate === "function");
    assert(typeof point.scale     === "function");

    point.translate(1, 1);
    assert(point.x === 2);
    assert(point.y === 3);

    point.scale(5, 5);
    assert(point.x === 10);
    assert(point.y === 15);
  });

  it("should include mixin in mixin.", function() {
    var MTranslate = exclass.mixin({
      translate: function(x, y) {
        this.x += x;
        this.y += y;
        return this;
      }
    });

    var MScale = exclass.mixin({
      scale: function(s) {
        this.x *= s;
        this.y *= s;
        return this;
      }
    });

    var MGeometry = exclass.mixin({
      $mixins: [MTranslate, MScale]
    });

    // exclass.mixin tries to use the objects from super class, check if it
    // didn't corrupt super mixins. If this fails there is something wrong
    // in `exclass.mixin()` implementation.
    assert(MGeometry.$exMembers !== MTranslate.$exMembers);
    assert(MGeometry.$exMembers !== MScale.$exMembers);

    var Point = exclass($def = {
      $mixins: [MGeometry],

      $construct: function(x, y) {
        this.x = x;
        this.y = y;
      }
    });

    var point = new Point(1, 2);
    assert(typeof point.translate === "function");
    assert(typeof point.scale     === "function");

    point.translate(1, 1);
    assert(point.x === 2);
    assert(point.y === 3);

    point.scale(5, 5);
    assert(point.x === 10);
    assert(point.y === 15);
  });

  it("should handle `$extensions`.", function() {
    var MProperties = exclass.mixin({
      $extensions: {
        $properties: $properties
      }
    });

    var MInherited = exclass.mixin({
      $mixins: [MProperties]
    });

    var Point = exclass($def = {
      $mixins: [MInherited],

      $construct: function(x, y) {
        this.x = x;
        this.y = y;
      },

      $properties: {
        x: true,
        y: true
      }
    });

    var point = new Point(1, 2);

    assert(typeof point.getX === "function");
    assert(typeof point.setX === "function");
    assert(typeof point.getY === "function");
    assert(typeof point.setY === "function");

    point.setX(42);
    point.setY(55);

    assert(point.getX() === 42);
    assert(point.getY() === 55);
  });
});