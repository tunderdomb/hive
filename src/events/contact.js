var event = require("../core/event")
var getPositions = require("../dom/position").viewport
event.define("contact", function ( element, listener, capture ){
  function contactListener(){
    listener(getPositions(element))
  }

  window.addEventListener("scroll", contactListener, capture)
  return function ( element, listener, capture ){
    window.removeEventListener("scroll", contactListener, capture)
  }
})