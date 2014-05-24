var assert = require("assert");
var qclass = require("./qclass");

describe("QClass", function() {
  it("should create new Class without `construct` specified.", function() {
    var Class = qclass({});

    var obj = new Class();
    assert(obj instanceof Object);
    assert(obj instanceof Class);
  });

  it("should create new Class with `construct` specified.", function() {
    var Class = qclass({
      construct: function(property) {
        this.property = property;
      }
    });

    var obj = new Class(1);

    assert(obj instanceof Object);
    assert(obj instanceof Class);
    assert(obj.property === 1);
  });

  it("should create new Class with members.", function() {
    var Class = qclass({
      construct: function(a, b) {
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

  it("should create new Class with statics.", function() {
    var Class = qclass({
      statics: {
        Answer: 42
      }
    });
    assert(Class.Answer === 42);

    // `Answer` is statics, shouldn't be part of prototype.
    var obj = new Class();
    assert(Class.prototype.Answer === undefined);
    assert(obj.Answer === undefined);
  });

  it("should inherit without `construct` specified.", function() {
    var ClassA = qclass({
      getType: function() {
        return "ClassA";
      }
    });

    var ClassB = qclass({
      extend: ClassA,

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

  it("should inherit with `construct` specified.", function() {
    var ClassA = qclass({
      construct: function(x) {
        this.x = x;
      },

      getType: function() {
        return "ClassA";
      }
    });

    var ClassB = qclass({
      extend: ClassA,

      construct: function(x, y) {
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

  it("should provide `extensions`.", function() {
    var $properties;
    var $definition;

    $properties = function(v, k, def) {
      // Check if all the arguments provided are correct.
      assert(k   === "properties");
      assert(def === $definition);

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

    var Point = qclass($definition = {
      construct: function(x, y) {
        this.x = x;
        this.y = y;
      },

      extensions: {
        properties: $properties
      },

      properties: {
        x: true,
        y: true
      }
    });

    var Circle = qclass($definition = {
      extend: Point,

      construct: function(x, y, radius) {
        Point.call(this, x, y);
        this.radius = radius;
      },

      properties: {
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

  it("should provide `middleware`.", function() {
    var $definition;

    var Point = qclass($definition = {
      construct: function(x, y) {
        this.x = x;
        this.y = y;
      },

      middleware: function(def) {
        assert(def === $definition);
        this.PointMiddleware = true;
      }
    });

    var Circle = qclass($definition = {
      extend: Point,

      construct: function(x, y, radius) {
        Point.call(this, x, y);
        this.radius = radius;
      },

      middleware: function(def) {
        assert(def === $definition);
        this.CircleMiddleware = true;
      }
    });

    assert(Point.PointMiddleware === true);
    assert(!Point.hasOwnProperty("CircleMiddleware"));

    assert(Circle.PointMiddleware === true);
    assert(Circle.CircleMiddleware === true);
  });
});