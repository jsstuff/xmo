// xmo.js <https://github.com/exjs/xmo>
"use strict";

var assert = require("assert");
var xmo = require("./xmo");

// Properties extension, used by multiple tests.
var $properties = function(k, properties) {
  // Check if all the arguments provided are correct.
  assert(k === "$properties");

  Object.keys(properties).forEach(function(key) {
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

describe("xmo", function() {
  it("should create new Class without `constructor` specified.", function() {
    var Class = xmo({});

    var obj = new Class();
    assert(obj instanceof Object);
    assert(obj instanceof Class);
  });

  it("should create new Class with `constructor` specified.", function() {
    var Class = xmo({
      constructor: function(property) {
        this.property = property;
      }
    });

    var obj = new Class(1);

    assert(obj instanceof Object);
    assert(obj instanceof Class);
    assert(obj.property === 1);
  });

  it("should create new Class with members.", function() {
    var Class = xmo({
      constructor: function(a, b) {
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
    var Class = xmo({
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

  it("should inherit without `constructor` specified.", function() {
    var ClassA = xmo({
      getType: function() {
        return "ClassA";
      }
    });

    var ClassB = xmo({
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

  it("should inherit with `constructor` specified.", function() {
    var ClassA = xmo({
      constructor: function(x) {
        this.x = x;
      },

      getType: function() {
        return "ClassA";
      }
    });

    var ClassB = xmo({
      $extend: ClassA,

      constructor: function(x, y) {
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
    var Point = xmo({
      constructor: function(x, y) {
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

    var Circle = xmo({
      $extend: Point,

      constructor: function(x, y, radius) {
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

  it("should provide `$preInit` and `$postInit`.", function() {
    var Point = xmo({
      constructor: function(x, y) {
        this.x = x;
        this.y = y;
      },

      $preInit: function(def) {
        this.PointPreInit = true;
        assert(this.PointPostInit === undefined);
      },

      $postInit: function(def) {
        this.PointPostInit = true;
      }
    });

    var Circle = xmo({
      $extend: Point,

      constructor: function(x, y, radius) {
        Point.call(this, x, y);
        this.radius = radius;
      },

      $preInit: function(def) {
        this.CirclePreInit = true;
        assert(this.CirclePostInit === undefined);
      },

      $postInit: function(def) {
        this.CirclePostInit = true;
      }
    });

    assert(Point.PointPreInit === true);
    assert(Point.PointPostInit === true);
    assert(Point.CirclePreInit === undefined);
    assert(Point.CirclePostInit === undefined);

    assert(Circle.PointPreInit === true);
    assert(Circle.PointPostInit === true);
    assert(Circle.CirclePreInit === true);
    assert(Circle.CirclePostInit === true);
  });
});

describe("xmo.Mixin", function() {
  it("should create and use single mixin.", function() {
    var MTranslate = xmo.mixin({
      translate: function(x, y) {
        this.x += x;
        this.y += y;
        return this;
      }
    });

    var Point = xmo({
      $mixins: MTranslate,

      constructor: function(x, y) {
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
    var MTranslate = xmo.mixin({
      translate: function(x, y) {
        this.x += x;
        this.y += y;
        return this;
      }
    });

    var MScale = xmo.mixin({
      scale: function(s) {
        this.x *= s;
        this.y *= s;
        return this;
      }
    });

    var Point = xmo({
      $mixins: [MTranslate, MScale],

      constructor: function(x, y) {
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
    var MTranslate = xmo.mixin({
      translate: function(x, y) {
        this.x += x;
        this.y += y;
        return this;
      }
    });

    var MScale = xmo.mixin({
      scale: function(s) {
        this.x *= s;
        this.y *= s;
        return this;
      }
    });

    var MGeometry = xmo.mixin({
      $mixins: [MTranslate, MScale]
    });

    var Point = xmo({
      $mixins: [MGeometry],

      constructor: function(x, y) {
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
    var MProperties = xmo.mixin({
      $extensions: {
        $properties: $properties
      }
    });

    var MInherited = xmo.mixin({
      $mixins: [MProperties]
    });

    var Point = xmo({
      $mixins: [MInherited],

      constructor: function(x, y) {
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
