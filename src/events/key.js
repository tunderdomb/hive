var event = require("../core/event")

var specials = {
  esc: 27,
  enter: 13,
  tab: 9,
  backspace: 8,
  space: 32,
  shift: 16,
  control: 17,
  alt: 18,
  capsLock: 20,
  numLock: 144,

  up: 38,
  down: 40,
  left: 37,
  right: 39,

  insert: 45,
  "delete": 46,
  home: 36,
  end: 35,
  pageUp: 33,
  pageDown: 34,

  f1: 112,
  f2: 113,
  f3: 114,
  f4: 115,
  f5: 116,
  f6: 117,
  f7: 118,
  f8: 119,
  f9: 120,
  f10: 121,
  f11: 122,
  f12: 123
}

function createKeyEvent( e ){
  e.is = function is( code ){
    switch ( typeof code ) {
      case "number":
        return e.keyCode == code
      case "string":
        return code in e
          ? !!e[code]
          : code in specials && specials[code] == e.keyCode
      default:
        if ( arguments.length > 1 ) {
          code = [].slice.call(arguments)
        }
        return code.every(is)
    }
  }
  return e
}

event.define("key", function ( element, listener, capture ){
  function keyup( e ){
    return listener(e, createKeyEvent(e))
  }

  element.addEventListener("keyup", keyup, false)
  return function ( element, listener, capture ){
    element.removeEventListener("keyup", keyup, false)
  }
})
