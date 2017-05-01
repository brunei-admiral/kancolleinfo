// JUST - JavaScript UnitTest Suite (Temporary)
var JUST = {
  tests: 0,
  assertions: 0,
  passes: 0,
  failures: 0,
  errors: 0,

  testCase: function(obj){
    for (var prop in obj) {
      if (prop.indexOf("test") == 0) {
        try {
          if (obj.setup) {
            obj.setup();
          }
          obj[prop]();
        }
        catch (ex) {
          var stack = ex.stack;
          if (ex instanceof JUST.FailedAssertion) {
            JUST.failures++;
            console.log("[" + (JUST.failures + JUST.errors) + "] Failure: " + prop);
            console.log(ex.message);
            if (typeof(stack) != "undefined") {
              stack = stack.replace(/^.*?\n/, "");
              var re = /^\s+at (?:assert|refute).*?\n/;
              while (re.test(stack)) {
                stack = stack.replace(re, "");
              }
            }
          }
          else {
            JUST.errors++;
            console.log("[" + (JUST.failures + JUST.errors) + "] Error: " + prop);
          }
          if (typeof(stack) != "undefined") {
            console.log(stack);
          }
          console.log("");
        }
        finally {
          if (obj.teardown) {
            obj.teardown();
          }
        }
        JUST.tests++;
      }
    }
    console.log(String(JUST.tests) + " tests, " + JUST.assertions + " assertions, " + JUST.passes + " passes, " + JUST.failures + " failures, " + JUST.errors + " errors.");
    if (typeof(phantom) !== "undefined") {
      phantom.exit(JUST.failures + JUST.errors);
    }
    else {
      process.exit(JUST.failures + JUST.errors);
    }
  },

  FailedAssertion: function(message){
    this.message = message;
  }
};

function assert(result, message) {
  JUST.assertions++;
  if (result) {
    JUST.passes++;
  }
  else {
    throw new JUST.FailedAssertion(message || "no message given");
  }
}

function refute(result, message) {
  return assert(!result, message);
}

function assertEqual(expected, result, message) {
  var cond;
  if (expected instanceof Array && result instanceof Array) {
    if (expected.length != result.length) {
      cond = false;
    }
    else {
      cond = true;
      for (var i = 0; i < expected.length; i++) {
        if (expected[i] != result[i]) {
          cond = false;
          break;
        }
      }
    }
  }
  else {
    cond = expected == result;
  }
  assert(cond, message || String(expected) + " is expected, but was " + String(result));
}

function assertMatch(reg, str, message) {
  assert(reg.test(str), message || reg + "\ndid not match with\n" + str);
}
