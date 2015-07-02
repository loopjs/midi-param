var MidiParam = require('./')

// fake audio context
var startTime = Date.now()
var context = {
  audio: {
    get currentTime() {
      return (Date.now()-startTime) / 1000
    }
  }
}

var chunk = MidiParam(context)

chunk.set({
  port: 'APC Key 25',
  learnNow: true,
  minValue: -100,
  maxValue: 100
})

console.log('Twiddle Knob to learn')
chunk.message(function(value) {
  console.log('Learnt ' + value + '. Now keep twiddling!')
})

chunk.portChoices(function(data) {
  console.log(data)
})

chunk.onSchedule(function(value) {
  console.log(value)
})