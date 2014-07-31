var event = require("../core/event")
event.define("missclick", function ( element, listener, capture ){
  function missClick( e ){
    if ( element.contains(e.target) || e.target == element ) {
      return
    }
    listener(e)
  }

  window.addEventListener("click", missClick, true)
  return function ( element, listener, capture ){
    window.removeEventListener("click", missClick, true)
  }
})